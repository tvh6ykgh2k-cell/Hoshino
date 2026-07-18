import React, { useState } from 'react';
import ProgressPanel from './ProgressPanel';
import OutlinePanel from './OutlinePanel';
import PersonaSettings from './PersonaSettings';
import SettingsPanel from './SettingsPanel';
import CapturePanel from './CapturePanel';

type Tab = 'capture' | 'progress' | 'outline' | 'persona' | 'settings';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'capture', label: '捕获', icon: '📥' },
  { id: 'progress', label: '进度', icon: '📊' },
  { id: 'outline', label: '大纲', icon: '📋' },
  { id: 'persona', label: '人格', icon: '🎭' },
  { id: 'settings', label: '设置', icon: '⚙️' },
];

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('capture');

  return (
    <aside className="w-64 bg-surface-900 border-r border-white/[0.05] flex flex-col h-full">
      {/* 头部 */}
      <div className="px-5 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Hoshino</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">AI Agent 学习导师</p>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <nav className="flex border-b border-white/[0.04]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-center text-xs transition-all duration-200 relative ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <span className="relative z-10">{tab.icon}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-accent-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'capture' && <CapturePanel />}
        {activeTab === 'progress' && <ProgressPanel />}
        {activeTab === 'outline' && <OutlinePanel />}
        {activeTab === 'persona' && <PersonaSettings />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>

      {/* 底部版本 */}
      <div className="px-5 py-3 border-t border-white/[0.03]">
        <p className="text-[10px] text-gray-600 text-center">v0.1.0 · Electron + React</p>
      </div>
    </aside>
  );
}
