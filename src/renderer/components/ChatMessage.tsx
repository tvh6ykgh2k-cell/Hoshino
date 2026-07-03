import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../shared/types';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        {!isUser && (
          <div className="text-xs text-blue-300 mb-1 font-semibold">⭐ 星野</div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content || (isUser ? '' : '思考中...')}
        </div>
      </div>
    </div>
  );
}
