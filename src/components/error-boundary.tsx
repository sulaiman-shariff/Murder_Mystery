"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertIcon } from "@/components/ui/icons";

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

  componentDidCatch(error: Error) {
    console.error("Unhandled UI error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback || (
        <div className="flex min-h-dvh items-center justify-center px-4">
          <Card tone="error" className="w-full max-w-sm text-center">
            <AlertIcon className="mx-auto h-7 w-7 text-error" />
            <h2 className="mt-3 font-display text-sm uppercase tracking-[0.15em] text-error">
              Something broke
            </h2>
            <p className="mb-4 mt-2 text-sm text-text-secondary">
              {this.state.error?.message ||
                "The page hit an unexpected error."}
            </p>
            <Button
              fullWidth
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Reload the page
            </Button>
          </Card>
        </div>
      )
    );
  }
}
