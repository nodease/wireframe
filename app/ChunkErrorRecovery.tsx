'use client';

import { useEffect } from 'react';

const RECOVERY_KEY = 'nodease-chunk-recovery-attempted';

const isRecoverableChunkError = (message: string) =>
  message.includes('ChunkLoadError') ||
  message.includes('Loading chunk') ||
  message.includes('removeChild');

export function ChunkErrorRecovery() {
  useEffect(() => {
    const recover = (message: string) => {
      if (!isRecoverableChunkError(message)) {
        return;
      }

      if (sessionStorage.getItem(RECOVERY_KEY) === '1') {
        return;
      }

      sessionStorage.setItem(RECOVERY_KEY, '1');
      window.location.reload();
    };

    const handleError = (event: ErrorEvent) => {
      recover(`${event.message} ${event.error?.message ?? ''}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? '');
      recover(reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
