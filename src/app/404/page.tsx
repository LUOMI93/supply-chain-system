import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf5] px-4">
      <div className="text-center smooth-appear">
        <div className="w-16 h-16 bg-gray-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A4.002 4.002 0 013.124 7.5h13.752c1.287 0 2.25 1.566 1.732 2.839l-6.424 10.02a1.5 1.5 0 01-2.58.12l-6.773-10.02A4.002 4.002 0 013.98 8.223zM12 8.25v4.5m0 3h.008" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-base text-gray-500 mb-6">页面不存在</p>
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
