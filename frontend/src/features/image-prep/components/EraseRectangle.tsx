import { useLingui } from '@lingui/react/macro';
import { X } from 'lucide-react';

import { useEraseRectangleGestures } from '@/features/image-prep/hooks/useEraseRectangleGestures';
import type { EraseRect } from '@/features/image-prep/utils/canvasOperations';
import { cn } from '@/lib/utils';

interface Props {
  rect: EraseRect;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onChange: (updated: EraseRect) => void;
  onRemove: () => void;
}

/** Size of the corner resize handles in pixels. */
const HANDLE_SIZE = 12;

const handleStyle = cn(
  'absolute',
  'z-10',
  'bg-white',
  'border',
  'border-gray-400',
  'rounded-sm',
  'touch-none',
  'cursor-nwse-resize',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-blue-500'
);

/**
 * Renders an interactive erase rectangle overlay on top of an image.
 * Users can drag to reposition, resize via corner handles, and remove
 * the rectangle. All coordinates are stored as percentages (0–100) of
 * the parent container so the rectangle scales with the image.
 *
 * Supports both pointer (mouse/touch) and keyboard interactions for
 * accessibility. The gesture logic lives in {@link useEraseRectangleGestures}.
 *
 * @param rect - Current position and dimensions of the erase rectangle (in %).
 * @param containerRef - Ref to the parent container used to convert pixel
 *   deltas into percentage-based coordinates.
 * @param onChange - Called with the updated rect whenever position or size changes.
 * @param onRemove - Called when the user clicks the remove button.
 */
export function EraseRectangle({
  rect,
  containerRef,
  onChange,
  onRemove,
}: Props) {
  const { t } = useLingui();

  const {
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerUp,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
    onMoveKeyDown,
    onResizeKeyDown,
  } = useEraseRectangleGestures(rect, containerRef, onChange);

  const cornerLabel: Record<string, string> = {
    tl: t`top-left`,
    tr: t`top-right`,
    bl: t`bottom-left`,
    br: t`bottom-right`,
  };

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
      <button
        type="button"
        className="absolute inset-0 cursor-move touch-none bg-red-400/40 ring-2 ring-red-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <button
          key={corner}
          type="button"
          className={handleStyle}
          aria-label={t`Resize from ${cornerLabel[corner]} corner. Use arrow keys to resize, Shift+arrow for larger steps.`}
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            top: corner.startsWith('t') ? -HANDLE_SIZE / 2 : undefined,
            bottom: corner.startsWith('b') ? -HANDLE_SIZE / 2 : undefined,
            left: corner.endsWith('l') ? -HANDLE_SIZE / 2 : undefined,
            right: corner.endsWith('r') ? -HANDLE_SIZE / 2 : undefined,
            cursor:
              corner === 'tl' || corner === 'br'
                ? 'nwse-resize'
                : 'nesw-resize',
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
