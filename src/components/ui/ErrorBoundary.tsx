import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <main role="alert" className="p-8"><h1>Não foi possível exibir esta página.</h1>
      <button onClick={() => window.location.reload()}>Recarregar aplicativo</button></main> : this.props.children;
  }
}
