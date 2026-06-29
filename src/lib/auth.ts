import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 扩展 next-auth 类型
declare module "next-auth" {
  interface User {
    role?: string;
    visibleSupplierIds?: number[];
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      role?: string;
      visibleSupplierIds?: number[];
    };
  }
  interface JWT {
    role?: string;
    id?: string;
    visibleSupplierIds?: number[];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: String(credentials.username) },
          include: {
            visibleSuppliers: {
              select: { supplierId: true },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );

        if (!valid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: String(user.id),
          name: user.displayName || user.username,
          role: user.role,
          visibleSupplierIds: user.visibleSuppliers.map((v) => v.supplierId),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.visibleSupplierIds = user.visibleSupplierIds;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
        session.user.id = (token.id as string) || "";
        session.user.visibleSupplierIds = token.visibleSupplierIds as number[] | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Cookie 配置：不设死 name，让 NextAuth v5 按环境自动处理
  // secure 根据请求协议自动判断（生产 HTTPS 会自动设 true）
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: true,
});
