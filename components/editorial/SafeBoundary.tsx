"use client";

import React, { Component, type ReactNode } from "react";

interface SafeBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface SafeBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Defensive Error Boundary for decorative and experimental client components
 * (such as 3D ribbons, custom pointer rings, physics ropes, or scroll reveals).
 * If any decorative component throws, SafeBoundary catches the error and
 * gracefully renders the fallback (or null), preventing React from aborting
 * hydration or unmounting the critical user intake and action forms.
 */
export default class SafeBoundary extends Component<
  SafeBoundaryProps,
  SafeBoundaryState
> {
  constructor(props: SafeBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SafeBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[SafeBoundary] Caught error in decorative component "${
          this.props.name ?? "unnamed"
        }":`,
        error,
        errorInfo
      );
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
