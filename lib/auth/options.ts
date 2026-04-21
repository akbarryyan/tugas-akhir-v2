import { AuthMethod, Role } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";

const staffCredentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
});

const studentCredentialsSchema = z.object({
  nisn: z
    .string()
    .trim()
    .min(10, "NISN harus berisi minimal 10 digit.")
    .max(20, "NISN terlalu panjang."),
});

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      id: "staff-credentials",
      name: "Staff Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const parsedCredentials =
          staffCredentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const user = await prisma.user.findFirst({
          where: {
            email,
            authMethod: AuthMethod.EMAIL_PASSWORD,
            role: {
              in: [Role.ADMIN, Role.GURU],
            },
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isPasswordValid = verifyPassword(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          authMethod: user.authMethod,
        };
      },
    }),
    CredentialsProvider({
      id: "student-nisn",
      name: "Student NISN",
      credentials: {
        nisn: {
          label: "NISN",
          type: "text",
        },
      },
      async authorize(credentials) {
        const parsedCredentials =
          studentCredentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { nisn } = parsedCredentials.data;
        const user = await prisma.user.findFirst({
          where: {
            role: Role.SISWA,
            authMethod: AuthMethod.NISN,
            studentProfile: {
              is: {
                nisn,
              },
            },
          },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          authMethod: user.authMethod,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image ?? null;
        token.role = user.role;
        token.authMethod = user.authMethod;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = token.name ?? "";
        session.user.email = typeof token.email === "string" ? token.email : null;
        session.user.image = typeof token.picture === "string" ? token.picture : null;
        session.user.role = token.role as Role;
        session.user.authMethod = token.authMethod as AuthMethod;
      }

      return session;
    },
  },
};
