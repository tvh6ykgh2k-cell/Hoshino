import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const PROVIDERS: { key: string; label: string; defaultModel: string }[] = [
  { key: 'agnes', label: 'Agnes AI', defaultModel: 'agnes-2.0-flash' },
  { key: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
  { key: 'claude', label: 'Claude', defaultModel: 'claude-sonnet-5' },
  { key: 'ollama', label: 'Ollama (本地)', defaultModel: 'llama3' },
];

const inputClass = "w-full bg-surface-800 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-500/40 transition-all";
const labelClass = "text-[11px] text-gray-500 font-medium mb-1.5 block";

export default function SettingsPanel() {
  const [vaultPath, setVaultPath] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('agnes');
  const [model, setModel] = useState('agnes');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(s => {
      setVaultPath(s.vaultPath || '');
      setApiKey(s.apiKey || '');
      setProvider(s.provider || 'agnes');
      setModel(s.model || 'agnes');
    });
  }, []);

  const handleProviderChange = (key: string) => {
    setProvider(key);
    const p = PROVIDERS.find(x => x.key === key);
    if (p) setModel(p.defaultModel);
  };

  const handleSave = async () => {
    await api.setSettings({ vaultPath, apiKey, provider, model } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">⚙️</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">设置</span>
      </div>

      {/* Provider */}
      <div className="mb-4">
        <label className={labelClass}>LLM Provider</label>
        <div className="grid grid-cols-2 gap-1.5">
          {PROVIDERS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => handleProviderChange(p.key)}
              className={`text-xs px-3 py-2 rounded-lg border transition-all duration-200 ${
                provider === p.key
                  ? 'bg-accent-500/10 border-accent-500/30 text-accent-300'
                  : 'bg-surface-800 border-white/[0.04] text-gray-500 hover:text-gray-300 hover:border-white/[0.1]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model */}
      <div className="mb-4">
        <label className={labelClass}>模型名</label>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className={labelClass}>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
          className={inputClass}
        />
      </div>

      {/* Vault */}
      <div className="mb-5">
        <label className={labelClass}>Obsidian Vault 路径</label>
        <input
          type="text"
          value={vaultPath}
          onChange={e => setVaultPath(e.target.value)}
          placeholder="C:\Users\...\Obsidian\MyVault"
          className={inputClass}
        />
        <p className="text-[10px] text-gray-600 mt-1.5">笔记存入 vault 的 AgentGuide/ 目录</p>
      </div>

      {/* 保存 */}
      <button
        type="button"
        onClick={handleSave}
        className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-accent-600 text-white hover:bg-accent-500 hover:shadow-lg hover:shadow-accent-500/20'
        }`}
      >
        {saved ? '✓ 已保存' : '保存设置'}
      </button>
    </div>
  );
}
