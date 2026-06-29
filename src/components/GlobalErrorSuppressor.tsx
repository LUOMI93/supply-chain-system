"use client";

import { useEffect } from "react";

/**
 * 全局错误抑制组件
 * 用于捕获并忽略 @base-ui/react Positioner 组件中
 * getBoundingClientRect 相关的非关键错误
 */
export function GlobalErrorSuppressor() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      // 抑制 @base-ui/react 中 getBoundingClientRect 相关的 null 错误
      if (
        event.error instanceof TypeError &&
        event.message?.includes("getBoundingClientRect")
      ) {
        // 阻止错误冒泡到控制台（仅抑制，不影响其他错误）
        event.preventDefault();
        console.warn(
          "[Suppressed] getBoundingClientRect error (from @base-ui/react):",
          event.message
        );
      }
    }

    // 同时处理 Promise 中的错误
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (
        event.reason instanceof TypeError &&
        event.reason?.message?.includes("getBoundingClientRect")
      ) {
        event.preventDefault();
        console.warn(
          "[Suppressed] getBoundingClientRect rejection:",
          event.reason.message
        );
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return null;
}
