import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorSuppressor } from "@/components/GlobalErrorSuppressor";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "供应链产品管理系统",
  description: "汽车配件供应链产品管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-[#fffefa] text-[#17211a]">
        <GlobalErrorSuppressor />
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <footer className="border-t border-black/5 bg-white/70 px-4 py-3 text-center text-xs text-gray-500">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700"
              >
                粤ICP备2026092334号-1
              </a>
            </footer>
          </div>
          <Toaster position="bottom-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
