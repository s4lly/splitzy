import { useLingui } from '@lingui/react/macro';
import { X } from 'lucide-react';
import { useCallback, useRef } from 'react';

import type { EraseRect } from '@/features/image-prep/utils/canvasOperations';

interface Props {
  rect: EraseRect;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onChange: (updated: EraseRect) => void;
  onRemove: () => void;
}

const HANDLE_SIZE = 12; // px, for the resize corners

export function EraseRectangle({
  rect,
  containerRef,
  onChange,
  onRemove,
}: Props) {
  const { t } = useLingui();
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    rectX: number;
    rectY: number;
  } | null>(null);

  const resizeStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    rectX: number;
    rectY: number;
    rectW: number;
    rectH: number;
    corner: 'tl' | 'tr' | 'bl' | 'br';
  } | null>(null);

  const getContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { w: 1, h: 1 };
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, [containerRef]);

  // ── Drag to move ──────────────────────────────────────────────────────────
  const onDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        rectX: rect.x,
        rectY: rect.y,
      };
    },
    [rect.x, rect.y]
  );

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current) return;
      const { w, h } = getContainerSize();
      const dx = ((e.clientX - dragStartRef.current.pointerX) / w) * 100;
      const dy = ((e.clientY - dragStartRef.current.pointerY) / h) * 100;
      const newX = Math.max(
        0,
        Math.min(100 - rect.width, dragStartRef.current.rectX + dx)
      );
      const newY = Math.max(
        0,
        Math.min(100 - rect.height, dragStartRef.current.rectY + dy)
      );
      onChange({ ...rect, x: newX, y: newY });
    },
    [getContainerSize, onChange, rect]
  );

  const onDragPointerUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  // ── Corner resize ─────────────────────────────────────────────────────────
  const onResizePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      corner: 'tl' | 'tr' | 'bl' | 'br'
    ) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        rectX: rect.x,
        rectY: rect.y,
        rectW: rect.width,
        rectH: rect.height,
        corner,
      };
    },
    [rect]
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeStartRef.current) return;
      const { w, h } = getContainerSize();
      const dx = ((e.clientX - resizeStartRef.current.pointerX) / w) * 100;
      const dy = ((e.clientY - resizeStartRef.current.pointerY) / h) * 100;
      const { corner, rectX, rectY, rectW, rectH } = resizeStartRef.current;
      const MIN = 5; // minimum size in percent

      let newX = rectX;
      let newY = rectY;
      let newW = rectW;
      let newH = rectH;

      if (corner === 'tl') {
        newX = Math.max(0, Math.min(rectX + dx, rectX + rectW - MIN));
        newY = Math.max(0, Math.min(rectY + dy, rectY + rectH - MIN));
        newW = rectW - (newX - rectX);
        newH = rectH - (newY - rectY);
      } else if (corner === 'tr') {
        newY = Math.max(0, Math.min(rectY + dy, rectY + rectH - MIN));
        newW = Math.max(MIN, rectW + dx);
        newH = rectH - (newY - rectY);
      } else if (corner === 'bl') {
        newX = Math.max(0, Math.min(rectX + dx, rectX + rectW - MIN));
        newW = rectW - (newX - rectX);
        newH = Math.max(MIN, rectH + dy);
      } else {
        newW = Math.max(MIN, rectW + dx);
        newH = Math.max(MIN, rectH + dy);
      }

      // Clamp within container
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newW = Math.min(newW, 100 - newX);
      newH = Math.min(newH, 100 - newY);

      onChange({ ...rect, x: newX, y: newY, width: newW, height: newH });
    },
    [getContainerSize, onChange, rect]
  );

  const onResizePointerUp = useCallback(() => {
    resizeStartRef.current = null;
  }, []);

  // ── Keyboard move ─────────────────────────────────────────────────────────
  const onMoveKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      let newX = rect.x;
      let newY = rect.y;
      switch (e.key) {
        case 'ArrowLeft':
          newX = Math.max(0, rect.x - step);
          break;
        case 'ArrowRight':
          newX = Math.min(100 - rect.width, rect.x + step);
          break;
        case 'ArrowUp':
          newY = Math.max(0, rect.y - step);
          break;
        case 'ArrowDown':
          newY = Math.min(100 - rect.height, rect.y + step);
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange({ ...rect, x: newX, y: newY });
    },
    [onChange, rect]
  );

  // ── Keyboard resize ───────────────────────────────────────────────────────
  const onResizeKeyDown = useCallback(
    (e: React.KeyboardEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
      const step = e.shiftKey ? 5 : 1;
      const MIN = 5;
      let { x: newX, y: newY, width: newW, height: newH } = rect;

      const grow = (axis: 'x' | 'y', dir: 1 | -1) => {
        if (axis === 'x') {
          if (corner.endsWith('l')) {
            // left edge: move x, adjust width
            const moved = Math.max(
              0,
              Math.min(newX + dir * step, newX + newW - MIN)
            );
            newW += newX - moved;
            newX = moved;
          } else {
            newW = Math.max(MIN, Math.min(newW + dir * step, 100 - newX));
          }
        } else {
          if (corner.startsWith('t')) {
            const moved = Math.max(
              0,
              Math.min(newY + dir * step, newY + newH - MIN)
            );
            newH += newY - moved;
            newY = moved;
          } else {
            newH = Math.max(MIN, Math.min(newH + dir * step, 100 - newY));
          }
        }
      };

      switch (e.key) {
        case 'ArrowLeft':
          grow('x', -1);
          break;
        case 'ArrowRight':
          grow('x', 1);
          break;
        case 'ArrowUp':
          grow('y', -1);
          break;
        case 'ArrowDown':
          grow('y', 1);
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange({ ...rect, x: newX, y: newY, width: newW, height: newH });
    },
    [onChange, rect]
  );

  const cornerLabel: Record<string, string> = {
    tl: t`top-left`,
    tr: t`top-right`,
    bl: t`bottom-left`,
    br: t`bottom-right`,
  };

  const handleStyle = `absolute z-10 bg-white border border-gray-400 rounded-sm touch-none cursor-nwse-resize focus:outline-none focus:ring-2 focus:ring-blue-500`;

  return (
    <div
      className="absolute touch-none"
      style={{
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      }}
    >
      {/* Main body — drag to move */}
      <div
        className="absolute inset-0 cursor-move touch-none bg-red-400/40 ring-2 ring-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        tabIndex={0}
        role="button"
        aria-label={t`Erased area at ${Math.round(rect.x)}% left, ${Math.round(rect.y)}% top, ${Math.round(rect.width)}% wide, ${Math.round(rect.height)}% tall. Use arrow keys to move, Shift+arrow for larger steps.`}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onKeyDown={onMoveKeyDown}
      />

      {/* Remove button */}
      <button
        type="button"
        className="absolute -right-2 -top-2 z-20 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={t`Remove erased area`}
      >
        <X className="size-3" />
      </button>

      {/* Corner handles */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
        <div
          key={corner}
          className={handleStyle}
          tabIndex={0}
          role="button"
          aria-label={t`Resize from ${cornerLabel[corner]} corner. Use arrow keys to resize, Shift+arrow for larger steps.`}
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            top: corner.startsWith('t') ? -HANDLE_SIZE / 2 : undefined,
            bottom: corner.startsWith('b') ? -HANDLE_SIZE / 2 : undefined,
            left: corner.endsWith('l') ? -HANDLE_SIZE / 2 : undefined,
            right: corner.endsWith('r') ? -HANDLE_SIZE / 2 : undefined,
          }}
          onPointerDown={(e) => onResizePointerDown(e, corner)}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onKeyDown={(e) => onResizeKeyDown(e, corner)}
        />
      ))}
    </div>
  );
}
