import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
    console.error('Extraction Module Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold font-mono text-slate-100">
              Biometric Chamber Diagnostic Reset
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              The clinical extraction apparatus encountered a system pause. Your progress and cryo-vault inventory are preserved.
            </p>
            {this.state.error?.message && (
              <pre className="text-[11px] font-mono text-rose-300/80 bg-slate-950 p-2.5 rounded-lg border border-slate-800 w-full text-left overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Re-initialize Biometric Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
