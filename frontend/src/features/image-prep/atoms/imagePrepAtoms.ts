import { atom } from 'jotai';

export const pendingImageAtom = atom<File | null>(null);

// Stores the processed (cropped + erased) image ready to send to the analyzer.
export const processedImageAtom = atom<File | null>(null);
