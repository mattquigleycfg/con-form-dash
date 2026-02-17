import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface SafeSectionProps {
  children: ReactNode;
  /** Label shown in the error fallback */
  name?: string;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Render nothing instead of an error card on failure */
  silent?: boolean;
}

interface SafeSectionState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for individual page sections.
 * Wrapping a card / chart / table in <SafeSection> means a crash
 * inside it only collapses that one widget instead of the whole page.
 *
 * Usage:
 *   <SafeSection name="Revenue Chart">
 *     <RevenueChart data={data} />
 *   </SafeSection>
 */
export class SafeSection extends Component<SafeSectionProps, SafeSectionState> {
  public state: SafeSectionState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): SafeSectionState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      `[SafeSection${this.props.name ? ` "${this.props.name}"` : ""}] caught:`,
      error,
      info.componentStack
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.silent) return null;
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-destructive mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">
              {this.props.name ? `${this.props.name} failed to load` : "Section failed to load"}
            </span>
          </div>
          <button
            onClick={this.handleRetry}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
