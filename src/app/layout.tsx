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
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster position="bottom-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
