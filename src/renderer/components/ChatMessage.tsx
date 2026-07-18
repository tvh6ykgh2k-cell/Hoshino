import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../shared/types';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  if (message.role === 'system') return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 animate-fade-in`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-sm mr-3 mt-1 flex-shrink-0 ring-2 ring-accent-500/10">
          ⭐
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        {!isUser && (
          <span className="text-[11px] text-accent-400 font-medium mb-1.5 block ml-0.5">星野</span>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-accent-600 text-white rounded-br-md shadow-lg shadow-accent-500/20'
              : 'bg-surface-750 text-gray-200 rounded-bl-md border border-white/[0.04]'
          }`}
        >
          <div className="whitespace-pre-wrap">
            {message.content || (!isUser ? (
              <span className="flex items-center gap-1 text-gray-500">
                <span className="inline-block w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse-soft" />
                <span className="inline-block w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                <span className="inline-block w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
              </span>
            ) : '')}
          </div>
        </div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-accent-600/30 flex items-center justify-center text-xs ml-3 mt-1 flex-shrink-0">
          U
        </div>
      )}
    </div>
  );
}
