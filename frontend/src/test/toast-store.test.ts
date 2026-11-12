import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_TOASTS, toast, useToastStore } from '@/lib/toast-store';

const activeToasts = () => useToastStore.getState().toasts.filter((item) => !item.closing);

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast and removes it after its duration', () => {
    toast.success('Saved successfully');
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(4000); // success duration
    expect(useToastStore.getState().toasts[0]?.closing).toBe(true);

    vi.advanceTimersByTime(200); // exit animation
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('keeps error toasts visible longer than success toasts', () => {
    toast.error('Something failed');
    toast.success('Something worked');

    vi.advanceTimersByTime(4100);

    const remaining = activeToasts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].severity).toBe('error');
  });

  it('never shows more than MAX_TOASTS at a time', () => {
    toast.error('One');
    toast.warning('Two');
    toast.info('Three');
    toast.success('Four');

    expect(activeToasts()).toHaveLength(MAX_TOASTS);

    vi.advanceTimersByTime(200); // let the oldest finish its exit animation
    expect(useToastStore.getState().toasts).toHaveLength(MAX_TOASTS);
    expect(useToastStore.getState().toasts.some((item) => item.message === 'One')).toBe(false);
  });

  it('ignores a duplicate message that is still visible', () => {
    toast.error('Invalid email or password');
    toast.error('Invalid email or password');

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('closes a toast when dismissed manually', () => {
    const id = toast.error('Dismiss me');
    expect(id).toBeTruthy();

    toast.dismiss(id as string);
    vi.advanceTimersByTime(200);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('pauses and resumes the auto-dismiss timer', () => {
    const id = toast.info('Hovering pauses me') as string;

    useToastStore.getState().pause(id);
    vi.advanceTimersByTime(10000);
    expect(activeToasts()).toHaveLength(1);

    useToastStore.getState().resume(id);
    vi.advanceTimersByTime(4000);
    vi.advanceTimersByTime(200);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('renders a backend result with the severity it provides', () => {
    toast.api({ message: 'First name is required', severity: 'info' });
    expect(useToastStore.getState().toasts[0]?.severity).toBe('info');

    toast.api({ message: 'Server exploded' }, { fallback: 'error' });
    expect(useToastStore.getState().toasts[0]?.severity).toBe('error');
  });
});
