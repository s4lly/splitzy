import { useCallback, useRef } from 'react';

import type { EraseRect } from '@/features/image-prep/utils/canvasOperations';

type Corner = 'tl' | 'tr' | 'bl' | 'br';

/**
 * Encapsulates the pointer (drag/resize) and keyboard (move/resize) gesture
 * logic for an {@link EraseRect} overlay. All coordinates are percentages
 * (0–100) of the parent container so the rectangle scales with the image.
 *
 * @param rect - Current position and dimensions of the erase rectangle (in %).
 * @param containerRef - Ref to the parent container, used to convert pixel
 *   deltas into percentage-based coordinates.
 * @param onChange - Called with the updated rect whenever position or size changes.
 */
export function useEraseRectangleGestures(
  rect: EraseRect,
  containerRef: React.RefObject<HTMLDivElement | null>,
  onChange: (updated: EraseRect) => void
) {
  // Snapshot of pointer + rect state at the moment a drag starts.
  // Stored in a ref so pointer-move handlers can compute deltas without
  // triggering re-renders on every frame.
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    rectX: number;
    rectY: number;
  } | null>(null);

  // Same idea as dragStartRef but for corner-resize gestures, which also
  // need to remember the starting size and which corner was grabbed.
  const resizeStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    rectX: number;
    rectY: number;
    rectW: number;
    rectH: number;
    corner: Corner;
  } | null>(null);

  /**
   * Returns the current pixel dimensions of the parent container.
   * Used to convert pointer pixel deltas into percentage offsets.
   * Falls back to 1×1 to avoid division by zero if the ref is unset.
   */
  const getContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { w: 1, h: 1 };
    return { w: Math.max(1, el.offsetWidth), h: Math.max(1, el.offsetHeight) };
  }, [containerRef]);

  // ── Drag to move ──────────────────────────────────────────────────────────

  /**
   * Initiates a drag-to-move gesture by capturing the pointer and
   * snapshotting the current pointer position and rect origin.
   */
  const onDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
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

  /**
   * Handles pointer movement during a drag-to-move gesture.
   * Converts the pixel delta since drag start into a percentage offset,
   * then clamps the new position so the rectangle stays within bounds.
   */
  const onDragPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragStartRef.current) return;

      // Convert pixel delta to percentage of container size
      const { w, h } = getContainerSize();
      const dx = ((e.clientX - dragStartRef.current.pointerX) / w) * 100;
      const dy = ((e.clientY - dragStartRef.current.pointerY) / h) * 100;

      // Clamp so the rectangle cannot be dragged outside the container
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

  /** Ends the drag-to-move gesture by clearing the snapshot. */
  const onDragPointerUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  // ── Corner resize ─────────────────────────────────────────────────────────

  /**
   * Initiates a corner-resize gesture by capturing the pointer and
   * snapshotting the current pointer position, rect geometry, and
   * which corner handle was grabbed.
   */
  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, corner: Corner) => {
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

  /**
   * Handles pointer movement during a corner-resize gesture.
   * Each corner affects different edges: top-left moves origin and shrinks,
   * bottom-right only expands, etc. The rect is always clamped to a minimum
   * size (5%) and kept within the container bounds.
   */
  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!resizeStartRef.current) return;

      // Convert pixel delta to percentage of container size
      const { w, h } = getContainerSize();
      const dx = ((e.clientX - resizeStartRef.current.pointerX) / w) * 100;
      const dy = ((e.clientY - resizeStartRef.current.pointerY) / h) * 100;
      const { corner, rectX, rectY, rectW, rectH } = resizeStartRef.current;
      const MIN = 5; // minimum size in percent

      let newX = rectX;
      let newY = rectY;
      let newW = rectW;
      let newH = rectH;

      // Apply delta to the edges affected by this corner.
      // For "anchor" edges (opposite the grabbed corner), only size changes.
      // For "moving" edges (adjacent to the grabbed corner), origin shifts too.
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
        // bottom-right: simplest case — just expand/shrink width and height
        newW = Math.max(MIN, rectW + dx);
        newH = Math.max(MIN, rectH + dy);
      }

      // Final clamp: ensure the rectangle stays within the 0–100% container
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newW = Math.min(newW, 100 - newX);
      newH = Math.min(newH, 100 - newY);

      onChange({ ...rect, x: newX, y: newY, width: newW, height: newH });
    },
    [getContainerSize, onChange, rect]
  );

  /** Ends the corner-resize gesture by clearing the snapshot. */
  const onResizePointerUp = useCallback(() => {
    resizeStartRef.current = null;
  }, []);

  // ── Keyboard move ─────────────────────────────────────────────────────────

  /**
   * Moves the rectangle in response to arrow key presses.
   * Holding Shift increases the step from 1% to 5% for faster repositioning.
   * The new position is clamped so the rectangle stays within the container.
   */
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

  /**
   * Resizes the rectangle from a specific corner in response to arrow key
   * presses. The behavior mirrors the pointer resize: left-edge corners shift
   * the origin and adjust width, while right-edge corners only change width.
   * Holding Shift increases the step from 1% to 5%.
   *
   * @param e - The keyboard event from the focused corner handle.
   * @param corner - Which corner handle is focused ('tl', 'tr', 'bl', 'br').
   */
  const onResizeKeyDown = useCallback(
    (e: React.KeyboardEvent, corner: Corner) => {
      const step = e.shiftKey ? 5 : 1;
      const MIN = 5;
      let { x: newX, y: newY, width: newW, height: newH } = rect;

      /**
       * Expands or contracts a single axis from the corner's edge.
       * For left/top edges this shifts the origin; for right/bottom edges
       * it only changes the dimension. Values are clamped to stay within
       * the container and respect the minimum size.
       */
      const grow = (axis: 'x' | 'y', dir: 1 | -1) => {
        if (axis === 'x') {
          if (corner.endsWith('l')) {
            // Left edge: shift origin and compensate width
            const moved = Math.max(
              0,
              Math.min(newX + dir * step, newX + newW - MIN)
            );
            newW += newX - moved;
            newX = moved;
          } else {
            // Right edge: just grow/shrink width
            newW = Math.max(MIN, Math.min(newW + dir * step, 100 - newX));
          }
        } else {
          if (corner.startsWith('t')) {
            // Top edge: shift origin and compensate height
            const moved = Math.max(
              0,
              Math.min(newY + dir * step, newY + newH - MIN)
            );
            newH += newY - moved;
            newY = moved;
          } else {
            // Bottom edge: just grow/shrink height
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

  return {
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
    onMoveKeyDown,
    onResizeKeyDown,
  };
}
