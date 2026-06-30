"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleLogin(form: HTMLFormElement) {
    setLoading(true);

    const formData = new FormData(form);
    const result = await signIn("credentials", {
      username: String(formData.get("username") || ""),
      password: String(formData.get("password") || ""),
      redirect: false,
      redirectTo: `${window.location.origin}/`,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("用户名或密码错误");
      return;
    }

    window.location.assign("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-blur-bg px-4 py-8">
      <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 smooth-appear">
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

        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-200/40 via-emerald-200/40 to-green-200/40 rounded-[1.5rem] blur-xl opacity-60 pointer-events-none" />

          <div className="relative bg-white/85 backdrop-blur-xl rounded-[1.25rem] border border-white/60 shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">欢迎回来</h2>
              <p className="text-sm text-gray-500 mt-1">请登录账号继续</p>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
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
                    autoComplete="username"
                    required
                    className="h-11 pl-10 pr-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-[14px] text-gray-700 placeholder:text-gray-400 transition-all focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                  />
                </div>
              </div>

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
                    autoComplete="current-password"
                    required
                    className="h-11 pl-10 pr-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-[14px] text-gray-700 placeholder:text-gray-400 transition-all focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 shadow-sm"
                  />
                </div>
              </div>

              <Button
                type="button"
                disabled={loading}
                onClick={(e) => handleLogin(e.currentTarget.form!)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white text-[14px] font-medium shadow-lg shadow-teal-600/25 hover:shadow-xl hover:shadow-teal-600/30 transition-all duration-300 group disabled:opacity-70"
              >
                {loading ? (
                  "登录中..."
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    登录
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              <span className="text-[11px] text-gray-400 uppercase tracking-wider">安全登录</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              登录信息仅用于本地测试环境的身份验证。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
