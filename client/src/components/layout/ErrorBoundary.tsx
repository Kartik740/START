import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in START:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen surface-0 text-stone-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full surface-1 border border-stone-800/50 rounded-2xl p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-['Outfit'] text-xl font-semibold text-stone-100">Something interrupted the loop</h2>
              <p className="text-sm text-stone-400 mt-2">
                An unexpected interface error occurred. Your work state remains saved.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3.5 surface-2 border border-stone-800/50 rounded-xl text-left overflow-x-auto text-xs font-mono text-red-300">
                {this.state.error.message}
              </div>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={this.handleReset}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="w-full"
            >
              Restart System
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
