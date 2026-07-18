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

  if (loading) {
    return (
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">学习进度</p>
        <div className="shimmer h-20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📊</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">学习进度</span>
      </div>

      <div className="space-y-2">
        {stages.map(stage => {
          const stageTopics = stage.modules.flatMap(m => m.topics.map(t => t.id));
          const stageProgress = progress.filter(p => stageTopics.includes(p.topicId));
          const mastered = stageProgress.filter(p => p.status === 'mastered').length;
          const total = stageTopics.length || 1;
          const pct = Math.round((mastered / total) * 100);

          return (
            <div
              key={stage.id}
              className="bg-surface-800 border border-white/[0.04] rounded-xl p-3.5 hover:border-white/[0.08] transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-400' : pct > 0 ? 'bg-accent-400' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-200 font-medium">Stage {stage.order}</span>
                </div>
                <span className={`text-xs font-mono ${pct === 100 ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {pct}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2.5 truncate group-hover:text-gray-400 transition-colors">
                {stage.title}
              </p>
              <div className="w-full bg-white/[0.04] rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    pct === 100
                      ? 'bg-emerald-400'
                      : pct > 0
                      ? 'bg-gradient-to-r from-accent-500 to-accent-400'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
