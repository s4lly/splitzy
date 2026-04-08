import { Trans } from '@lingui/react/macro';
import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { EraseRectangle } from '@/features/image-prep/components/EraseRectangle';
import type { EraseRect } from '@/features/image-prep/utils/canvasOperations';

interface Props {
  preview: string;
  rects: EraseRect[];
  onChange: (rects: EraseRect[]) => void;
}

export function EraseTool({ preview, rects, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  const addRect = useCallback(() => {
    const newRect: EraseRect = {
      id: `${idPrefix}-${Date.now()}`,
      x: 25,
      y: 25,
      width: 50,
      height: 20,
    };
    onChange([...rects, newRect]);
  }, [idPrefix, onChange, rects]);

  const updateRect = useCallback(
    (id: string, updated: EraseRect) => {
      onChange(rects.map((r) => (r.id === id ? updated : r)));
    },
    [onChange, rects]
  );

  const removeRect = useCallback(
    (id: string) => {
      onChange(rects.filter((r) => r.id !== id));
    },
    [onChange, rects]
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        <Trans>
          Add rectangles over areas you want removed before analysis. Useful for
          hiding sensitive information.
        </Trans>
      </p>

      {/* Image + overlays */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-lg border border-border"
        style={{ touchAction: 'none' }}
      >
        <img
          src={preview}
          alt="Receipt"
          className="block w-full object-contain"
          draggable={false}
        />
        {rects.map((rect) => (
          <EraseRectangle
            key={rect.id}
            rect={rect}
            containerRef={containerRef}
            onChange={(updated) => updateRect(rect.id, updated)}
            onRemove={() => removeRect(rect.id)}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={addRect}
        >
          <Plus className="mr-1 size-4" />
          <Trans>Add area</Trans>
        </Button>
        {rects.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-1 size-4" />
            <Trans>Clear all</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}
