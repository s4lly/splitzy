import { atom } from 'jotai';
import type { Crop, PixelCrop } from 'react-image-crop';

import type {
  EraseRect,
  ImageDimensions,
} from '@/features/image-prep/utils/canvasOperations';

export const cropAtom = atom<Crop | undefined>(undefined);
export const completedCropAtom = atom<PixelCrop | null>(null);
export const imageDimsAtom = atom<ImageDimensions | null>(null);
export const eraseRectsAtom = atom<EraseRect[]>([]);
