import { Component, ErrorInfo, ReactNode } from 'react';
import { CircleIcon } from 'lucide-react';
import { Button } from './Button';

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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[100dvh]">
          <div className="max-w-md space-y-8 p-4 text-center">
            <div className="flex justify-center">
              <CircleIcon className="size-12 text-red-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              Something went wrong
            </h1>
            <p className="text-base text-gray-500">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="max-w-48 mx-auto"
            >
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 