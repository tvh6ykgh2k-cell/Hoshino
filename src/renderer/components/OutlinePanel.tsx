import React, { useEffect, useState } from 'react';
import type { Stage } from '../../shared/types';
import { api } from '../lib/api';

export default function OutlinePanel() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  useEffect(() => {
    api.loadCurriculum().then(setStages);
  }, []);

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">课程大纲</p>
      {stages.map(stage => (
        <div key={stage.id} className="mb-2">
          <button
            onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
            className="w-full text-left text-sm text-gray-200 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors flex items-center justify-between"
          >
            <span>S{stage.order}: {stage.title}</span>
            <span className="text-xs text-gray-500">{expandedStage === stage.id ? '▾' : '▸'}</span>
          </button>
          {expandedStage === stage.id && (
            <div className="ml-3 mt-1 border-l border-gray-600 pl-2">
              {stage.modules.map(mod => (
                <div key={mod.id} className="mb-1">
                  <div className="text-xs text-gray-400 py-0.5">{mod.title}</div>
                  {mod.topics.map(topic => (
                    <div key={topic.id} className="text-xs text-gray-500 py-0.5 pl-2 hover:text-gray-300 cursor-pointer">
                      {topic.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
