import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf5] px-4">
      <div className="text-center smooth-appear">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 0l5.657 5.657m-5.657 0l5.657-5.657M12 12l5.657 5.657" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-2">403</h1>
        <p className="text-base text-gray-500 mb-6">权限不足，无法访问此页面</p>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          返回首页
        </Link>
      </div>
    </div>
  );
}
