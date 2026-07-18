import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ChatMessage as ChatMessageType } from '../../shared/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { api } from '../lib/api';

interface Props {
  messages: ChatMessageType[];
  onSend: (content: string) => void;
  isLoading: boolean;
  sessionId: string | null;
}

export default function ChatView({ messages, onSend, isLoading, sessionId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastMsgCount = useRef(0);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView(smooth ? { behavior: 'smooth' } : undefined);
  }, []);

  // 新消息来了自动滚到底部
  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      scrollToBottom(true);
    }
    lastMsgCount.current = messages.length;
  }, [messages, scrollToBottom]);

  // 监听滚动位置，显示/隐藏「回到底部」按钮
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distToBottom > 200);
  }, []);

  const handleSaveToObsidian = async () => {
    if (!sessionId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await api.summarizeSession(sessionId);
      setSaving(false);
      if ('notePath' in result && result.notePath) {
        setSavedNote(result.notePath);
        setTimeout(() => setSavedNote(null), 4000);
      } else if ('error' in result) {
        setSaveError(result.error);
        setTimeout(() => setSaveError(null), 6000);
      }
    } catch (err: any) {
      setSaving(false);
      setSaveError(err.message || '存档失败');
      setTimeout(() => setSaveError(null), 6000);
    }
  };

  const hasMessages = messages.length > 0;
  const activeSession = !!sessionId;

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04] bg-surface-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-500 font-medium">
            {activeSession ? `会话 ${sessionId.slice(-8)}` : '未开始'}
          </span>
          {hasMessages && (
            <span className="text-[10px] text-gray-600 ml-1">{messages.length} 条消息</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedNote && (
            <span className="text-xs text-green-400/80 animate-fade-in">已存档 ✓</span>
          )}
          {saveError && (
            <span className="text-xs text-red-400/80 animate-fade-in max-w-[300px] truncate" title={saveError}>❌ {saveError}</span>
          )}
          <button
            type="button"
            onClick={handleSaveToObsidian}
            disabled={!activeSession || !hasMessages || saving}
            title="保存到 Obsidian"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-300 bg-accent-500/10 border border-accent-500/20 rounded-lg hover:bg-accent-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {saving ? '...' : '存档到 Obsidian'}
          </button>
        </div>
      </header>

      {/* 消息区 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-6 py-6">
          {!hasMessages && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="text-5xl mb-5">⭐</div>
                <h2 className="text-xl font-semibold text-white mb-2">Hoshino 已就绪</h2>
                <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                  我是你的 AI Agent 学习导师<br />开始提问吧
                </p>
                <div className="mt-6 text-[10px] text-gray-600 space-y-1">
                  <p>提问建议：</p>
                  <p>• AI Agent 和传统程序有什么区别？</p>
                  <p>• 解释一下 RAG 的工作原理</p>
                </div>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && hasMessages && messages[messages.length - 1].role === 'user' && (
            <div className="flex items-start gap-3 mb-5 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-sm flex-shrink-0 ring-2 ring-accent-500/10">⭐</div>
              <div className="bg-surface-750 rounded-2xl rounded-bl-md px-4 py-3 border border-white/[0.04]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-pulse-soft" />
                  <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 回到底部按钮 */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          title="滚动到底部"
          className="absolute bottom-20 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-accent-500/90 text-white shadow-lg hover:bg-accent-400 transition-all animate-fade-in"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
