'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DownloadProgressEvent } from '../api/types';
import { subscribeDownloadProgress } from '../api/download';

interface UseDownloadProgressOptions {
  onProgress?: (event: DownloadProgressEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useDownloadProgress(
  taskId: string | null,
  options: UseDownloadProgressOptions = {}
) {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('pending');
  const [speed, setSpeed] = useState<number>(0);
  const [eta, setEta] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Keep callback refs up to date without causing effect re-runs
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reset = useCallback(() => {
    setProgress(0);
    setStatus('pending');
    setSpeed(0);
    setEta(0);
    setError(null);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    if (!taskId) {
      reset();
      return;
    }

    reset();

    const unsubscribe = subscribeDownloadProgress(
      taskId,
      (event) => {
        setProgress(event.progress);
        setStatus(event.status);
        setSpeed(event.speed);
        setEta(event.eta);
        optionsRef.current.onProgress?.(event);

        if (event.status === 'completed') {
          setIsComplete(true);
          optionsRef.current.onComplete?.();
        }
      },
      (err) => {
        setError(err);
        optionsRef.current.onError?.(err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [taskId, reset]);

  return {
    progress,
    status,
    speed,
    eta,
    error,
    isComplete,
    reset,
  };
}
