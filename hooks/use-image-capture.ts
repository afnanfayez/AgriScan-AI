'use client';

import { useCallback, useRef, useState } from 'react';
import { normalizeScanImage } from '@/lib/image-capture';

export interface CapturedImage {
  id: string;
  dataUrl: string;
}

/**
 * Multi-image camera/upload capture for batch scan flows (Commercial Farmer
 * field scans, Nursery batch health screening). Wraps the same
 * normalizeScanImage() logic used by the single-image Plant Doctor flow.
 */
export function useImageCapture() {
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    setError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to access camera, falling back to upload:', err);
      setIsCameraActive(false);
      setError('Camera access denied or unavailable. Please use photo upload instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const addFromVideo = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const dataUrl = await normalizeScanImage(videoRef.current);
      setImages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, dataUrl }]);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not capture the camera image.');
    }
  }, []);

  const addFromFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const next: CapturedImage[] = [];
    for (const file of files) {
      try {
        const dataUrl = await normalizeScanImage(file);
        next.push({ id: `${Date.now()}-${next.length}-${file.name}`, dataUrl });
      } catch (err: any) {
        setError(err.message || 'Could not read one of the selected image files.');
      }
    }
    if (next.length > 0) {
      setImages((prev) => [...prev, ...next]);
      setError('');
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((image) => image.id !== id));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    setError('');
  }, []);

  return {
    images,
    videoRef,
    isCameraActive,
    error,
    startCamera,
    stopCamera,
    addFromVideo,
    addFromFiles,
    removeImage,
    clearImages,
  };
}
