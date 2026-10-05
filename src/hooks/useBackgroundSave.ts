import { useState, useCallback } from 'react';

export function useBackgroundSave() {
  const [pendingSavesCount, setPendingSavesCount] = useState(0);

  const runBackgroundSave = useCallback(async (saveTask: () => Promise<any>) => {
    setPendingSavesCount(c => c + 1);
    try {
      await saveTask();
    } catch (err) {
      console.error('Background save error:', err);
    } finally {
      setPendingSavesCount(c => Math.max(0, c - 1));
    }
  }, []);

  return {
    pendingSavesCount,
    runBackgroundSave
  };
}
