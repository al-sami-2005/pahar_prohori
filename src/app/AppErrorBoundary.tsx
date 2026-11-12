import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { failed: boolean }

/** Last-resort production fallback. Keeps a rendering failure from becoming a blank judging screen. */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the console without exposing stack traces in the UI.
    console.error('Pahar Prohori render failure', error, info)
  }

  override render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5 text-fg">
        <section className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-overlay" role="alert">
          <span className="grid size-11 place-items-center rounded-xl bg-warning/10 text-warning">
            <AlertTriangle size={22} aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">The interface hit an unexpected error</h1>
          <p className="mt-2 text-base leading-relaxed text-muted">
            Your data is still local to this demo. Reload the interface to restore Mission Control.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <RotateCcw size={16} aria-hidden /> Reload interface
          </button>
        </section>
      </main>
    )
  }
}
