import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Tài khoản hoặc email", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!identifier || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }],
          },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (!user?.passwordHash || !user.isActive) {
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id ?? token.sub;
        (session.user as any).role = (token as any).role ?? "USER";
        session.user.email = token.email ?? session.user.email ?? "";
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },
});