import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      username?: string | null;
    };
  }

  interface User extends DefaultUser {
    username?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null;
  }
}
