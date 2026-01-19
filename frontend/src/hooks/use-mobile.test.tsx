import { renderHook, act } from '@testing-library/react';
import { useMobile } from './use-mobile';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock matchMedia
const createMatchMedia = (matches: boolean) => vi.fn().mockImplementation(query => ({
  matches,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe('useMobile', () => {
  let matchMedia: any;

  beforeEach(() => {
    matchMedia = createMatchMedia(window.innerWidth < 768);
    vi.spyOn(window, 'matchMedia').mockImplementation(matchMedia);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if screen width is less than 768px', () => {
    matchMedia = createMatchMedia(true);
    vi.spyOn(window, 'matchMedia').mockImplementation(matchMedia);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(true);
  });

  it('should return false if screen width is greater than or equal to 768px', () => {
    matchMedia = createMatchMedia(false);
    vi.spyOn(window, 'matchMedia').mockImplementation(matchMedia);
    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);
  });

  it('should update when the screen size changes', () => {
    let matches = false;
    const mql = {
      get matches() {
        return matches;
      },
      addEventListener: vi.fn((event, listener) => {
        mql.listener = listener;
      }),
      removeEventListener: vi.fn(),
      listener: (e: { matches: boolean; }) => {}, // Initialize listener
    };
    vi.spyOn(window, 'matchMedia').mockImplementation(() => mql as any);

    const { result } = renderHook(() => useMobile());
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      mql.listener({ matches: true });
    });

    expect(result.current).toBe(true);
  });
});
