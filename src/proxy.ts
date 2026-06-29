import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const adminPaths = ["/suppliers", "/users", "/audit-logs"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/catalog")
  ) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl, 307);
  }

  const role = token.role as string | undefined;
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
