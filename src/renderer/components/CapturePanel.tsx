import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function CapturePanel() {
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // 从剪贴板粘贴
  const handlePasteFromClipboard = () => {
    const text = api.readClipboard();
    if (text) {
      setRawText(prev => prev ? prev + '\n\n' + text : text);
    }
  };

  const handleCapture = async () => {
    if (!rawText.trim() || saving) return;
    setSaving(true);
    setResult(null);
    try {
      console.log('[capture-ui] sending to main...');
      const res = await api.captureSave(rawText.trim());
      console.log('[capture-ui] response:', JSON.stringify(res));
      setSaving(false);
      if ('notePath' in res && res.notePath) {
        const debugInfo = (res as any).debug ? `\n[AI输出: ${(res as any).debug}]` : '';
        setResult({ ok: true, msg: `已存档 · ${res.title || res.notePath}${debugInfo}` });
        setRawText('');
      } else if ('error' in res && res.error) {
        const debugInfo = (res as any).debug ? `\n[调试: ${(res as any).debug}]` : '';
        setResult({ ok: false, msg: res.error + debugInfo });
      }
    } catch (err: any) {
      console.error('[capture-ui] error:', err);
      setSaving(false);
      setResult({ ok: false, msg: '调用失败: ' + (err.message || String(err)) });
    }
    setTimeout(() => setResult(null), 8000);
  };

  const isUrl = /^https?:\/\/\S+/.test(rawText.trim());
  const charCount = rawText.trim().length;

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📥</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">快速捕获</span>
      </div>

      {/* 模式提示 */}
      <div className="flex gap-2 mb-4">
        <div className={`flex-1 rounded-xl px-3 py-2.5 border transition-all duration-200 ${
          !isUrl && charCount > 0
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-surface-800 border-white/[0.04]'
        }`}>
          <p className="text-[10px] text-gray-500 mb-0.5">📄 贴全文</p>
          <p className="text-[11px] text-gray-400">直接复制文章内容粘贴</p>
        </div>
        <div className={`flex-1 rounded-xl px-3 py-2.5 border transition-all duration-200 ${
          isUrl
            ? 'bg-accent-500/5 border-accent-500/20'
            : 'bg-surface-800 border-white/[0.04]'
        }`}>
          <p className="text-[10px] text-gray-500 mb-0.5">🔗 贴链接</p>
          <p className="text-[11px] text-gray-400">自动抓取网页内容</p>
        </div>
      </div>

      {/* 输入区 */}
      <div className="relative mb-3">
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="在微信/浏览器里复制文章全文，Ctrl+V 贴到这里..."
          rows={9}
          className="w-full bg-surface-800 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-accent-500/40 focus:bg-surface-800/80 transition-all duration-200 leading-relaxed"
        />
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          {charCount > 0 && (
            <span className={`text-[10px] ${isUrl ? 'text-accent-400' : 'text-emerald-400'}`}>
              {isUrl ? '🔗 链接' : `📄 ${charCount} 字`}
            </span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="flex-1 py-2 text-xs text-gray-400 bg-surface-800 border border-white/[0.06] rounded-xl hover:text-white hover:border-white/[0.12] transition-all duration-200"
        >
          📋 从剪贴板粘贴
        </button>
        <button
          type="button"
          onClick={() => setRawText('')}
          disabled={!rawText}
          className="px-3 py-2 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
        >
          清空
        </button>
      </div>

      {/* 捕获按钮 */}
      <button
        type="button"
        onClick={handleCapture}
        disabled={!rawText.trim() || saving}
        className="w-full py-2.5 bg-accent-600 text-white text-sm font-medium rounded-xl hover:bg-accent-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/20 active:scale-[0.98]"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse-soft" />
            AI 提炼中...
          </span>
        ) : (
          '✨ 捕获并保存'
        )}
      </button>

      {/* 结果反馈 */}
      {result && (
        <div className={`mt-3 px-4 py-3 rounded-xl text-xs flex items-start gap-2 animate-slide-up ${
          result.ok
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
        }`}>
          <span className="mt-px">{result.ok ? '✅' : '💡'}</span>
          <div>
            <span>{result.msg}</span>
            {!result.ok && (
              <p className="mt-1 text-gray-500">
                试试：在微信里长按文章 → 复制全文 → 回到这里粘贴
              </p>
            )}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-6 pt-4 border-t border-white/[0.04]">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">怎么用</p>
        <div className="text-[11px] text-gray-500 space-y-2 leading-relaxed">
          <p>1️⃣ 在微信文章里 <span className="text-white">长按 → 复制全文</span>（或 Ctrl+A 全选复制）</p>
          <p>2️⃣ 回到 Hoshino，点 <span className="text-white">从剪贴板粘贴</span></p>
          <p>3️⃣ 点 <span className="text-accent-300">捕获并保存</span></p>
          <p className="text-gray-600 mt-2">📂 笔记存入 Obsidian vault 的对应分类</p>
        </div>
      </div>
    </div>
  );
}
