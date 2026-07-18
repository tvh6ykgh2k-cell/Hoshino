import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 py-4 border-t border-white/[0.04] bg-surface-900/80 backdrop-blur-xl">
      <div className="flex items-end gap-3 bg-surface-800/50 rounded-2xl border border-white/[0.06] px-4 py-2.5 focus-within:border-accent-500/30 focus-within:bg-surface-800 transition-all duration-200">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... Enter 发送，Shift+Enter 换行"
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none py-1 focus:outline-none disabled:opacity-40"
          style={{ minHeight: '24px', maxHeight: '120px' }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = '24px';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-accent-500 text-white hover:bg-accent-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
