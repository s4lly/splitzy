import { useReceiptNotFoundRetry } from '@/hooks/useReceiptNotFoundRetry';
import { useQuery } from '@rocicorp/zero/react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Infer QueryDetails type from useQuery return type
type QueryDetails = ReturnType<typeof useQuery>[1];

describe('useReceiptNotFoundRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createQueryDetails = (
    type: 'unknown' | 'complete' | 'error',
    error?: Error
  ): QueryDetails => {
    if (type === 'error') {
      return {
        type: 'error',
        error: error || new Error('Test error'),
      } as unknown as QueryDetails;
    }
    return {
      type,
    } as unknown as QueryDetails;
  };

  describe('Initial state', () => {
    it('returns false for shouldNavigateTo404 when receipt is found', () => {
      const receipt = { id: 1 };
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({ receipt, details })
      );

      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });

    it('returns false for shouldNavigateTo404 when query is unknown', () => {
      const details = createQueryDetails('unknown');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({ receipt: null, details })
      );

      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });

    it('returns false for shouldNavigateTo404 when query has error', () => {
      const details = createQueryDetails('error');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({ receipt: null, details })
      );

      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });
  });

  describe('Receipt not found retry logic', () => {
    it('starts tracking when receipt is not found and query is complete', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({ receipt: null, details })
      );

      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });

    it('does not navigate to 404 immediately when receipt is not found', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 3,
          retryDelayMs: 1000,
        })
      );

      expect(result.current.shouldNavigateTo404).toBe(false);
    });

    it('navigates to 404 after max retries are exhausted', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 3,
          retryDelayMs: 1000,
        })
      );

      // Fast-forward time to exceed max retries
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.shouldNavigateTo404).toBe(true);
    });

    it('updates retry count during retry period', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 3,
          retryDelayMs: 1000,
        })
      );

      // Advance time by 1 second (first retry)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.retryMessage).toContain('retry 1/3');

      // Advance time by another second (second retry)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.retryMessage).toContain('retry 2/3');

      // Advance time by another second (third retry)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.retryMessage).toContain('retry 3/3');
      expect(result.current.shouldNavigateTo404).toBe(true);
    });

    it('stops retry count at max retries', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 2,
          retryDelayMs: 1000,
        })
      );

      // Advance time beyond max retries
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.retryMessage).toContain('retry 2/2');
      expect(result.current.shouldNavigateTo404).toBe(true);
    });
  });

  describe('Receipt found scenarios', () => {
    it('resets tracking when receipt is found after not found', () => {
      const details = createQueryDetails('complete');

      const { result, rerender } = renderHook(
        ({ receipt }: { receipt: unknown }) =>
          useReceiptNotFoundRetry({
            receipt,
            details,
            maxRetries: 3,
            retryDelayMs: 1000,
          }),
        {
          initialProps: { receipt: null as unknown },
        }
      );

      // Advance time to start retries
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.retryMessage).toContain('retry 1/3');

      // Receipt is found
      act(() => {
        rerender({ receipt: { id: 1 } as unknown });
      });

      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });

    it('does not start tracking when receipt is found immediately', () => {
      const receipt = { id: 1 };
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt,
          details,
          maxRetries: 3,
          retryDelayMs: 1000,
        })
      );

      // Advance time - should not affect anything
      vi.advanceTimersByTime(5000);

      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });
  });

  describe('Custom retry configuration', () => {
    it('uses custom maxRetries value', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 5,
          retryDelayMs: 1000,
        })
      );

      // Advance time to exceed 5 retries
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.shouldNavigateTo404).toBe(true);
      expect(result.current.retryMessage).toContain('retry 5/5');
    });

    it('uses custom retryDelayMs value', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 2,
          retryDelayMs: 500,
        })
      );

      // Advance time by 500ms (first retry)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current.retryMessage).toContain('retry 1/2');

      // Advance time by another 500ms (second retry)
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current.retryMessage).toContain('retry 2/2');
      expect(result.current.shouldNavigateTo404).toBe(true);
    });

    it('uses default values when not provided', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
        })
      );

      // Default maxRetries is 3, retryDelayMs is 1000
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.shouldNavigateTo404).toBe(true);
      expect(result.current.retryMessage).toContain('retry 3/3');
    });
  });

  describe('Query state transitions', () => {
    it('does not start tracking when query transitions from unknown to complete with receipt', () => {
      const receipt = { id: 1 };

      const { result, rerender } = renderHook(
        ({ details }) =>
          useReceiptNotFoundRetry({
            receipt,
            details,
          }),
        {
          initialProps: { details: createQueryDetails('unknown') },
        }
      );

      // Initial state should not navigate
      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');

      // Transition to complete with receipt present
      act(() => {
        rerender({ details: createQueryDetails('complete') });
      });

      // Should not navigate to 404 since receipt exists
      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');

      // Advance time to ensure no retry tracking started
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Still should not navigate after time passes
      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');
    });

    it('starts tracking when query transitions from unknown to complete without receipt', () => {
      const { result, rerender } = renderHook(
        ({ details }) =>
          useReceiptNotFoundRetry({
            receipt: null,
            details,
            maxRetries: 2,
            retryDelayMs: 1000,
          }),
        {
          initialProps: { details: createQueryDetails('unknown') },
        }
      );

      // Query is unknown, should not navigate
      expect(result.current.shouldNavigateTo404).toBe(false);

      // Transition to complete
      act(() => {
        rerender({ details: createQueryDetails('complete') });
      });

      // Advance time to exceed retries
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.shouldNavigateTo404).toBe(true);
    });

    it('does not navigate when query has error state', () => {
      const details = createQueryDetails('error');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 3,
          retryDelayMs: 1000,
        })
      );

      // Advance time - should not affect error state
      vi.advanceTimersByTime(5000);

      expect(result.current.shouldNavigateTo404).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles receipt becoming null after being found', () => {
      const details = createQueryDetails('complete');

      const { result, rerender } = renderHook(
        ({ receipt }: { receipt: unknown }) =>
          useReceiptNotFoundRetry({
            receipt,
            details,
            maxRetries: 2,
            retryDelayMs: 1000,
          }),
        {
          initialProps: { receipt: { id: 1 } as unknown },
        }
      );

      // Receipt exists, should not navigate
      expect(result.current.shouldNavigateTo404).toBe(false);

      // Receipt becomes null
      act(() => {
        rerender({ receipt: null as unknown });
      });

      // Advance time to exceed retries
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.shouldNavigateTo404).toBe(true);
    });

    it('handles multiple receipt found/not found cycles', () => {
      const details = createQueryDetails('complete');

      const { result, rerender } = renderHook(
        ({ receipt }: { receipt: unknown }) =>
          useReceiptNotFoundRetry({
            receipt,
            details,
            maxRetries: 2,
            retryDelayMs: 1000,
          }),
        {
          initialProps: { receipt: null as unknown },
        }
      );

      // Start retries
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.retryMessage).toContain('retry 1/2');

      // Receipt found
      act(() => {
        rerender({ receipt: { id: 1 } as unknown });
      });
      expect(result.current.shouldNavigateTo404).toBe(false);
      expect(result.current.retryMessage).toBe('Loading receipt details...');

      // Receipt lost again - need to let the effect run first
      act(() => {
        rerender({ receipt: null as unknown });
      });

      // Then advance timers
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.shouldNavigateTo404).toBe(true);
    });

    it('handles very short retry delay', () => {
      const details = createQueryDetails('complete');

      const { result } = renderHook(() =>
        useReceiptNotFoundRetry({
          receipt: null,
          details,
          maxRetries: 2,
          retryDelayMs: 100,
        })
      );

      // Advance time by 200ms (2 retries)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.shouldNavigateTo404).toBe(true);
      expect(result.current.retryMessage).toContain('retry 2/2');
    });
  });
});
