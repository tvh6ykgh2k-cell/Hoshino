import { useState, useEffect, useCallback } from 'react';
import type { TopicProgress } from '../../shared/types';
import { api } from '../lib/api';

export function useProgress() {
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProgress().then(p => {
      setProgress(p);
      setLoading(false);
    });
  }, []);

  const updateProgress = useCallback(async (topicId: string, status: string, score?: number) => {
    await api.updateProgress(topicId, status, score);
    setProgress(prev => {
      const existing = prev.find(p => p.topicId === topicId);
      if (existing) {
        return prev.map(p => p.topicId === topicId ? { ...p, status: status as any, score: score ?? p.score } : p);
      }
      return [...prev, {
        topicId,
        status: status as any,
        startedAt: new Date().toISOString(),
        completedAt: status === 'mastered' ? new Date().toISOString() : null,
        score: score ?? null,
        notes: null,
      }];
    });
  }, []);

  return { progress, loading, updateProgress };
}
