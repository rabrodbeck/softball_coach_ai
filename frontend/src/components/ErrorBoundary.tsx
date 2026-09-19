import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app, #0f172a)',
          color: 'var(--text-h, #f8fafc)',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg, #1e293b)',
            borderRadius: '16px',
            padding: '36px',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              marginBottom: '20px'
            }}>
              <AlertTriangle size={40} />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: '#f8fafc' }}>
              Dugout Timeout
            </h2>

            <p style={{ color: 'var(--text, #94a3b8)', lineHeight: 1.6, marginBottom: '24px', fontSize: '15px' }}>
              Coach Winnie ran into an unexpected playbook error. Don't worry, your player data and stats are safely saved in the cloud.
            </p>

            {this.state.error && (
              <pre style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fca5a5',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '24px',
                maxHeight: '120px'
              }}>
                {this.state.error.message}
              </pre>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255,255,255,0.15))',
                  background: 'transparent',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent, #f59e0b)',
                  color: '#0f172a',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                <RefreshCw size={16} />
                Reload Dugout
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
