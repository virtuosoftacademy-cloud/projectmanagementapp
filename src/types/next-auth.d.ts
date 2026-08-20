import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/generated/prisma/enums";

// The token stores the database enum; `lib/session.ts` converts it for the app.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    workspaceId?: string;
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    workspaceId?: string;
    role?: Role;
  }
}
