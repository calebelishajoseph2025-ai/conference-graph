import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-caption text-bad">Application error</p>
          <h1 className="mt-2 text-h2 text-ink">{this.state.error.message}</h1>
          <pre className="mt-4 overflow-auto rounded-md border border-line bg-surface-2 p-4 font-mono text-[11px] text-muted">
            {this.state.error.stack}
          </pre>
          <button
            type="button"
            onClick={() => { this.setState({ error: null }); window.location.assign('/'); }}
            className="mt-4 rounded-sm border border-line px-3 py-1.5 text-small text-ink"
          >
            Back to the home page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
