import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PlacementOS ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4 bg-[#0D0F12] text-[#F1F5F9] font-sans"
          role="alert"
        >
          <div className="max-w-md w-full bg-[#14171D] border border-[#262D38] rounded-xl p-6 space-y-4 text-center">
            <div className="size-12 rounded-full bg-rose-950/40 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-[#F1F5F9]">Unexpected Error</h2>
              <p className="text-xs text-[#8E98A8] leading-relaxed">
                The application encountered an unexpected error and cannot continue.
              </p>
              <p className="text-[11px] text-rose-400 font-mono">
                {this.state.error?.message ?? 'Unknown error'}
              </p>
            </div>
            <div className="p-3 bg-[#1B2028] border border-[#262D38] rounded text-xs text-[#8E98A8]">
              Your local data (progress, evidence, settings) is stored separately in the browser
              and was not affected by this error.
            </div>
            <Button
              onClick={this.handleReset}
              className="w-full h-9 px-4 font-bold text-xs bg-primary hover:bg-primary-hover text-primary-foreground rounded-md flex items-center justify-center gap-2"
            >
              <RotateCcw className="size-3.5" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}