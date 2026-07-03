import React, { useRef, useEffect } from 'react';
import type { ChatMessage as ChatMessageType } from '../../shared/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface Props {
  messages: ChatMessageType[];
  onSend: (content: string) => void;
  isLoading: boolean;
}

export default function ChatView({ messages, onSend, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-2xl mb-2">⭐</p>
              <p className="text-lg">Hoshino 已就绪</p>
              <p className="text-sm mt-1">开始你的 Agent 学习之旅吧</p>
            </div>
          </div>
        )}
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={onSend} disabled={isLoading} />
    </div>
  );
}
