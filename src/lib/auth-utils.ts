import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/types";

export type Role = UserRole;

interface SessionUser {
  id: number;
  role: UserRole;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: Number(session.user.id),
    role: (session.user.role as UserRole) || "viewer",
  };
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "请先登录" }, { status: 401 }), user: null };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ error: "权限不足" }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

// For page-level protection
export async function requirePageAuth(allowedRoles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) return { redirect: "/login" } as const;
  if (allowedRoles && !allowedRoles.includes(user.role)) return { redirect: "/403" } as const;
  return { user } as const;
}
