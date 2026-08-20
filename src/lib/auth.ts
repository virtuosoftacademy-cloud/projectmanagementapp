import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/enums";

/**
 * Auth.js v5 configuration.
 *
 * Sessions are JWTs — the Credentials provider cannot use database sessions —
 * so the role is stamped into the token at sign-in and copied onto
 * `session.user` on every read. Authorization then never needs a second query.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  // Self-hosted (not Vercel), so there's no fixed AUTH_URL — trust the
  // incoming Host header instead of rejecting production requests outright.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Compare even when the user is missing so a bad email and a bad
        // password take the same amount of time.
        const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = await bcrypt.compare(password, hash);

        if (!user || !user.passwordHash || !ok || user.disabledAt) return null;

        // Resume into the workspace this user left off in, if they're still a
        // member of it; otherwise their earliest membership. No membership at
        // all means there's nothing for them to sign into.
        const membership =
          (user.lastWorkspaceId &&
            (await prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId: user.lastWorkspaceId, userId: user.id } },
            }))) ||
          (await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
            orderBy: { joinedAt: "asc" },
          }));

        if (!membership) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          workspaceId: membership.workspaceId,
          role: membership.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
        token.role = (user as { role?: Role }).role ?? "MEMBER";
      }

      if (trigger === "update" && token.id) {
        const userId = token.id as string;
        const requestedWorkspaceId = (session as { workspaceId?: string } | undefined)
          ?.workspaceId;

        if (requestedWorkspaceId) {
          // The workspace switcher asked to move to a different workspace —
          // re-verify membership server-side rather than trusting the client.
          const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: requestedWorkspaceId, userId } },
          });
          if (membership) {
            token.workspaceId = membership.workspaceId;
            token.role = membership.role;
            await prisma.user.update({
              where: { id: userId },
              data: { lastWorkspaceId: membership.workspaceId },
            });
          }
          // An invalid request (not a member) is silently ignored — the
          // token keeps whatever workspace it already had.
        } else if (token.workspaceId) {
          const workspaceId = token.workspaceId as string;
          // Plain refresh (e.g. after a role change): re-read this user's
          // role for the workspace they're currently in, not a global field.
          const [membership, fresh] = await Promise.all([
            prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId, userId } },
            }),
            prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
          ]);
          if (membership) token.role = membership.role;
          if (fresh) token.name = fresh.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.workspaceId = token.workspaceId as string;
        session.user.role = (token.role as Role) ?? "MEMBER";
      }
      return session;
    },
  },
});
