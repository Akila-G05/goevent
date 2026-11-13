import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMinimumLoading } from '@/hooks/use-minimum-loading';

interface Props {
  loading: boolean;
}

describe('useMinimumLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the animation for 500 ms when the request settles in 100 ms', () => {
    const { result, rerender } = renderHook(
      ({ loading }: Props) => useMinimumLoading(loading, 500),
      { initialProps: { loading: true } }
    );

    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ loading: false });

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('stays visible for the whole 2000 ms request', () => {
    const { result, rerender } = renderHook(
      ({ loading }: Props) => useMinimumLoading(loading, 500),
      { initialProps: { loading: true } }
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(true);

    rerender({ loading: false });

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(result.current).toBe(false);
  });

  it('never shows the animation when nothing is loading', () => {
    const { result } = renderHook(() => useMinimumLoading(false, 500));

    expect(result.current).toBe(false);
  });

  it('restarts the minimum window on a new request', () => {
    const { result, rerender } = renderHook(
      ({ loading }: Props) => useMinimumLoading(loading, 500),
      { initialProps: { loading: true } }
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ loading: false });

    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(result.current).toBe(false);

    rerender({ loading: true });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ loading: false });

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });
});
