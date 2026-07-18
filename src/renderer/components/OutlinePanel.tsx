import React, { useEffect, useState } from 'react';
import type { Stage } from '../../shared/types';
import { api } from '../lib/api';

export default function OutlinePanel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  useEffect(() => {
    api.loadCurriculum().then(setStages);
  }, []);

  if (stages.length === 0) {
    return (
      <div className="animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">📋</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">课程大纲</span>
        </div>
        <div className="shimmer h-16 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📋</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">课程大纲</span>
      </div>

      <div className="space-y-1">
        {stages.map((stage, i) => {
          const isExpanded = expandedStage === stage.id;
          return (
            <div key={stage.id}>
              <button
                type="button"
                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-surface-800/60 transition-all duration-200 group"
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-md bg-accent-500/10 text-accent-400 text-[10px] font-bold flex-shrink-0">
                  {stage.order}
                </span>
                <span className="text-sm text-gray-200 flex-1 truncate group-hover:text-white transition-colors">
                  {stage.title}
                </span>
                <span className="text-[10px] text-gray-600 flex-shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  ▸
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 mb-2 border-l border-white/[0.06] pl-4 animate-slide-up">
                  {stage.modules.map(mod => (
                    <div key={mod.id} className="mb-2">
                      <p className="text-[11px] text-accent-400/70 font-medium mb-1">{mod.title}</p>
                      {mod.topics.map(topic => (
                        <p key={topic.id} className="text-[11px] text-gray-500 py-0.5 pl-2 hover:text-gray-300 cursor-pointer transition-colors">
                          {topic.title}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
