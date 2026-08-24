import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/generated/prisma/enums";

// The token stores the database enum; `lib/session.ts` converts it for the app.
//
// `workspaceId` and `role` are nullable: someone can be signed in while
// belonging to no workspace, which is the state onboarding exists to resolve.
// `lib/session.ts` narrows both back to non-null for every screen that needs a
// workspace, so pages keep receiving plain strings.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string | null;
      role: Role | null;
    } & DefaultSession["user"];
  }

  interface User {
    workspaceId?: string | null;
    role?: Role | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    workspaceId?: string;
    role?: Role;
  }
}
