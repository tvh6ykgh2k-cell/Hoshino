import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function SettingsPanel() {
  const [vaultPath, setVaultPath] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(s => {
      setVaultPath(s.vaultPath || '');
      setApiKey(s.apiKey || '');
    });
  }, []);

  const handleSave = async () => {
    await api.setSettings({ vaultPath, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">设置</p>

      <label className="text-xs text-gray-400 mb-1 block">Obsidian Vault 路径</label>
      <input
        type="text"
        value={vaultPath}
        onChange={e => setVaultPath(e.target.value)}
        placeholder="C:\Users\...\Obsidian\MyVault"
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-3 focus:outline-none focus:border-blue-500"
      />

      <label className="text-xs text-gray-400 mb-1 block">DeepSeek API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        placeholder="sk-..."
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-3 focus:outline-none focus:border-blue-500"
      />

      <button
        onClick={handleSave}
        className="w-full py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
      >
        {saved ? '✅ 已保存' : '保存设置'}
      </button>
    </div>
  );
}
