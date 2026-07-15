import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash
        );

        if (!valid) {
          const failedLoginCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount,
              lockedUntil:
                failedLoginCount >= 5
                  ? new Date(Date.now() + 15 * 60 * 1000)
                  : null,
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            failedLoginCount: 0,
            lockedUntil: null,
          },
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
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      const target = new URL(url);
      const base = new URL(baseUrl);

      if (target.origin === base.origin || isLocalNetworkHost(target.hostname)) {
        return url;
      }

      return baseUrl;
    },
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
        session.user.visibleSupplierIds = token.visibleSupplierIds as
          | number[]
          | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: true,
});

function isLocalNetworkHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}
