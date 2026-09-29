// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { PlacementProvider } from '../context/PlacementContext';
import { StorageAdapter } from '../storage/storageAdapter';

// React 19 requires this flag for act()-based updates outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Test components ---

const HealthyChild = () => <div data-testid="healthy">OK</div>;

const ThrowingChild = () => {
  throw new Error('Test error for ErrorBoundary');
};

const ThrowOnClick = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  if (shouldThrow) throw new Error('Click error');
  return <button onClick={() => setShouldThrow(true)} data-testid="throw-btn">Throw</button>;
};

const WrappedHealthy = () => (
  <PlacementProvider>
    <ErrorBoundary>
      <HealthyChild />
    </ErrorBoundary>
  </PlacementProvider>
);

const WrappedThrowing = () => (
  <PlacementProvider>
    <ErrorBoundary>
      <ThrowingChild />
    </ErrorBoundary>
  </PlacementProvider>
);

const WrappedThrowOnClick = () => (
  <PlacementProvider>
    <ErrorBoundary>
      <ThrowOnClick />
    </ErrorBoundary>
  </PlacementProvider>
);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('C9 — ErrorBoundary', () => {
  it('healthy child renders normally', () => {
    render(<WrappedHealthy />);
    expect(screen.getByTestId('healthy')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reload Application/i)).not.toBeInTheDocument();
  });

  it('throwing child renders fallback', () => {
    render(<WrappedThrowing />);
    // The fallback has a single h2 with "Unexpected Error"
    // Use getByRole for the heading to be more specific
    expect(screen.getByRole('heading', { name: /Unexpected Error/i })).toBeInTheDocument();
    expect(screen.getByText(/Test error for ErrorBoundary/i)).toBeInTheDocument();
  });

  it('fallback contains recovery action', () => {
    render(<WrappedThrowing />);
    const reloadBtn = screen.getByRole('button', { name: /Reload Application/i });
    expect(reloadBtn).toBeInTheDocument();
  });

  it('recovery action button exists and storage is not modified by error boundary', () => {
    // First establish a known storage state
    const baseline = StorageAdapter.loadState();
    baseline.userSettings.targetPlacementGoal = 'Test Goal Before Error';
    StorageAdapter.saveState(baseline);

    render(<WrappedThrowing />);
    const reloadBtn = screen.getByRole('button', { name: /Reload Application/i });
    expect(reloadBtn).toBeInTheDocument();

    // The button click would invoke window.location.reload in a real browser
    // (jsdom makes location.reload non-mockable, but the button is correctly wired)
    // Verify storage was not modified by the error boundary
    const after = StorageAdapter.loadState();
    expect(after.userSettings.targetPlacementGoal).toBe('Test Goal Before Error');
  });

  it('error boundary isolates errors to the subtree', () => {
    const { unmount } = render(<WrappedThrowOnClick />);
    expect(screen.getByTestId('throw-btn')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('throw-btn').click();
    });

    expect(screen.getByRole('heading', { name: /Unexpected Error/i })).toBeInTheDocument();
    expect(screen.getByText(/Click error/i)).toBeInTheDocument();

    // The ErrorBoundary caught it, app didn't unmount
    unmount(); // clean up
  });
});