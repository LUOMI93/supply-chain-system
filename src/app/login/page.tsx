"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      username: form.get("username") as string,
      password: form.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      toast.error("用户名或密码错误");
    } else {
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-blur-bg px-4 py-8">
      {/* Decorative blurred circles */}
      <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-48 h-48 bg-green-100/40 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 smooth-appear">
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 leading-tight tracking-tight">
            供应链产品管理系统
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Supply Chain Product Management Platform
          </p>
        </div>

        {/* Login Card - Glassmorphism */}
        <div className="relative">
          {/* Soft glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-200/40 via-emerald-200/40 to-green-200/40 rounded-[1.5rem] blur-xl opacity-60 pointer-events-none" />

          <div className="relative bg-white/85 backdrop-blur-xl rounded-[1.25rem] border border-white/60 shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">欢迎回来</h2>
              <p className="text-sm text-gray-500 mt-1">请登录您的账号以继续</p>
            </div>

            <form onSubmit={handleSubmit} method="POST" className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[13px] font-medium text-gray-600 ml-1">
                  用户名
                </Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
                    <User className="w-[15px] h-[15px]" />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入用户名"
                    required
                    className="h-11 pl-10 pr-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-[14px] text-gray-700 placeholder:text-gray-400 transition-all focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-gray-600 ml-1">
                  密码
                </Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
                    <Lock className="w-[15px] h-[15px]" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    required
                    className="h-11 pl-10 pr-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-[14px] text-gray-700 placeholder:text-gray-400 transition-all focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white text-[14px] font-medium shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 transition-all duration-300 group disabled:opacity-70"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    登录中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    登录
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              <span className="text-[11px] text-gray-400 uppercase tracking-wider">安全登录</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 text-[11px] text-gray-400 text-center justify-center">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-left">您的登录信息已通过 256 位 SSL 加密保护，确保数据传输安全</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">
            © 2024 供应链产品管理系统 · All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
