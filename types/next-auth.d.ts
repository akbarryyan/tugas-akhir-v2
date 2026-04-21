import { AuthMethod, Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      authMethod: AuthMethod;
    };
  }

  interface User {
    image?: string | null;
    role: Role;
    authMethod: AuthMethod;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    authMethod?: AuthMethod;
  }
}
