import React from 'react';
import { AlertTriangle, RefreshCw, LifeBuoy } from 'lucide-react';
import { SupportTicketModal } from './SupportTicketModal';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  supportOpen: boolean;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      supportOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught error in AppErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4"
          data-testid="app-error-boundary"
        >
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">
                Something went wrong on the touchline
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your squad and match data are safe. You can reload the app or
                send an instant report to our support desk.
              </p>
            </div>
            {this.state.errorMessage && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 truncate">
                {this.state.errorMessage}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload SubShuffle</span>
              </button>
              <button
                type="button"
                onClick={() => this.setState({ supportOpen: true })}
                data-testid="error-boundary-support-button"
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LifeBuoy className="w-4 h-4 text-sky-400" />
                <span>Help &amp; Feedback</span>
              </button>
            </div>

            <SupportTicketModal
              isOpen={this.state.supportOpen}
              onClose={() => this.setState({ supportOpen: false })}
              initialCategory="bug"
              initialSummary="Unexpected screen error"
              initialDescription={`Error encountered: ${this.state.errorMessage}`}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

