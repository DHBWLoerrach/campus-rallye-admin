'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export default class QRCodeErrorBoundary extends Component<
  { children: ReactNode; onError: () => void; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QR code rendering failed:', error, errorInfo);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
