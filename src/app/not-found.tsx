import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffefa]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#244b35] mb-4">404</h1>
        <p className="text-lg text-[#637066] mb-6">页面未找到</p>
        <Link href="/" className="text-[#2f5d88] underline">
          返回首页
        </Link>
      </div>
    </div>
  );
}
