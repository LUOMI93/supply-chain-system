"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-5xl mb-2">⚠️</div>
            <h2 className="text-lg font-semibold text-[#244b35]">页面出现错误</h2>
            <p className="text-sm text-[#637066]">
              {this.state.error?.message || "发生了未知错误"}
            </p>
            <Button
              className="bg-[#244b35] hover:bg-[#1d3c2a]"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
