import React from "react";

interface State {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  State
> {
  // Initialize state as a class field to satisfy strictPropertyInitialization
  public state: State = { hasError: false, error: null };
  // Declare props to make TS happy about this.props usage
  public props!: { children?: React.ReactNode };

  constructor(props: { children?: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console for server-side visibility
    console.error("Uncaught error in React tree:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
          <div className="bg-red-700 text-white p-6 rounded-lg max-w-lg">
            <h2 className="text-lg font-bold mb-2">خطای برنامه</h2>
            <p className="text-sm mb-4">
              متاسفانه مشکلی در نمایش صفحه رخ داده است.
            </p>
            <details className="text-xs bg-white/10 p-2 rounded">
              <summary className="cursor-pointer">نمایش خطا</summary>
              <pre className="whitespace-pre-wrap text-xs mt-2">
                {String(this.state.error)}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

export default ErrorBoundary;
