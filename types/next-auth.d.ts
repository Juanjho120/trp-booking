import type { DefaultSession } from "next-auth";

import type { AdminRole } from "@/lib/auth/admin-access";

declare module "next-auth" {
  interface Session {
    user: {
      role?: AdminRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AdminRole;
  }
}
