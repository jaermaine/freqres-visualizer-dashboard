"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
          <div className="text-4xl mb-4">💥</div>
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message || "An unexpected error occurred in this component."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-opacity-90 font-medium text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
