import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GooseLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-8 bg-background px-6 text-center">
      {/* Logo */}
      <div className="h-16 w-16 text-muted-foreground">
        <GooseLogo className="h-full w-full" />
      </div>

      {/* 404 数字 */}
      <h1 className="text-8xl font-bold tracking-tighter text-muted-foreground/20 md:text-9xl">
        404
      </h1>

      {/* 错误提示 */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">页面未找到</h2>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          您访问的页面不存在或已被移除
        </p>
      </div>

      {/* 返回按钮 */}
      <Button asChild variant="default" size="sm">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Link>
      </Button>
    </main>
  );
}
