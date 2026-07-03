import React, { useState } from 'react';
import ProgressPanel from './ProgressPanel';
import OutlinePanel from './OutlinePanel';
import PersonaSettings from './PersonaSettings';
import SettingsPanel from './SettingsPanel';

type Tab = 'progress' | 'outline' | 'persona' | 'settings';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('progress');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'progress', label: '进度', icon: '📊' },
    { id: 'outline', label: '大纲', icon: '📋' },
    { id: 'persona', label: '人格', icon: '🎭' },
    { id: 'settings', label: '设置', icon: '⚙️' },
  ];

  return (
    <aside className="w-60 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">⭐ Hoshino</h1>
        <p className="text-xs text-gray-500 mt-1">AI Agent 学习导师</p>
      </div>

      <div className="flex border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs text-center transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-750'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'progress' && <ProgressPanel />}
        {activeTab === 'outline' && <OutlinePanel />}
        {activeTab === 'persona' && <PersonaSettings />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  );
}
