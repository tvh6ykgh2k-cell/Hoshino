import React, { useEffect, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import type { Stage } from '../../shared/types';
import { api } from '../lib/api';

export default function ProgressPanel() {
  const { progress, loading } = useProgress();
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    api.loadCurriculum().then(setStages);
  }, []);

  if (loading) return <div className="text-sm text-gray-400">加载中...</div>;

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">学习进度</p>
      {stages.map(stage => {
        const stageTopics = stage.modules.flatMap(m => m.topics.map(t => t.id));
        const stageProgress = progress.filter(p => stageTopics.includes(p.topicId));
        const mastered = stageProgress.filter(p => p.status === 'mastered').length;
        const total = stageTopics.length || 1;
        const pct = Math.round((mastered / total) * 100);

        return (
          <div key={stage.id} className="mb-3 p-2 rounded bg-gray-750 hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-200">Stage {stage.order}</span>
              <span className="text-xs text-gray-400">{pct}%</span>
            </div>
            <div className="text-xs text-gray-400 mb-1 truncate">{stage.title}</div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
