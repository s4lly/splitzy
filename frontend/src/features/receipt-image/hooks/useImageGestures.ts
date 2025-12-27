import { useSpring, type SpringValue } from '@react-spring/web';
import { createUseGesture, dragAction, pinchAction } from '@use-gesture/react';
import { useEffect, useRef } from 'react';

const useGesture = createUseGesture([dragAction, pinchAction]);

interface UseImageGesturesReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  style: {
    x: SpringValue<number>;
    y: SpringValue<number>;
    scale: SpringValue<number>;
    rotateZ: SpringValue<number>;
  };
  resetImage: () => void;
}

export const useImageGestures = (): UseImageGesturesReturn => {
  const [style, api] = useSpring(() => ({
    x: 0,
    y: 0,
    scale: 1,
    rotateZ: 0,
  }));
  const ref = useRef<HTMLDivElement>(null);

  // Prevent browser gesture handling (pinch-to-zoom, etc.)
  useEffect(() => {
    const handler = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', handler);
    document.addEventListener('gesturechange', handler);
    document.addEventListener('gestureend', handler);
    return () => {
      document.removeEventListener('gesturestart', handler);
      document.removeEventListener('gesturechange', handler);
      document.removeEventListener('gestureend', handler);
    };
  }, []);

  useGesture(
    {
      onDrag: ({ pinching, cancel, offset: [x, y] }) => {
        if (pinching) return cancel();
        api.start({ x, y });
      },
      onPinch: ({
        origin: [ox, oy],
        first,
        movement: [ms],
        offset: [s, a],
        memo,
      }) => {
        if (first && ref.current) {
          const { width, height, x, y } = ref.current.getBoundingClientRect();
          const tx = ox - (x + width / 2);
          const ty = oy - (y + height / 2);
          memo = [style.x.get(), style.y.get(), tx, ty];
        }

        const x = memo[0] - (ms - 1) * memo[2];
        const y = memo[1] - (ms - 1) * memo[3];
        api.start({ scale: s, rotateZ: a, x, y });
        return memo;
      },
    },
    {
      target: ref,
      drag: { from: () => [style.x.get(), style.y.get()] },
      pinch: { scaleBounds: { min: 0.5, max: 2 }, rubberband: true },
    }
  );

  const resetImage = () => {
    api.start({
      x: 0,
      y: 0,
      scale: 1,
      rotateZ: 0,
      config: { tension: 300, friction: 20 },
    });
  };

  return { ref, style, resetImage };
};
