import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 管理员专属路由
const adminPaths = ["/suppliers", "/users", "/audit-logs"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公开路由 — 无需登录
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/catalog")
  ) {
    return NextResponse.next();
  }

  // 静态资源
  if (pathname.startsWith("/_next") || pathname.startsWith("/uploads") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  // 从 JWT token 中获取用户信息（验证有效性，而非仅检查 cookie 存在）
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const hasSession = !!token;

  // API 路由 — 未登录返回 401
  if (pathname.startsWith("/api/")) {
    if (!hasSession) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 页面路由 — 未登录重定向到 /login
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl, 307);
  }

  // 管理员路由权限检查：非 admin 用户重定向到首页
  const role = token?.role as string | undefined;
  if (role !== "admin") {
    for (const adminPath of adminPaths) {
      if (pathname.startsWith(adminPath)) {
        const homeUrl = new URL("/", req.url);
        return NextResponse.redirect(homeUrl, 307);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
