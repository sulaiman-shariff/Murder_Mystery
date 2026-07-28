"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-sm p-6 text-center">
            <div className="mb-2 text-2xl">⚠</div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-accent">
              Something went wrong
            </h2>
            <p className="mb-4 text-xs text-text-muted">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button
              fullWidth
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Reload Page
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
