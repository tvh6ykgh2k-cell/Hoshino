import React, { useEffect } from 'react';
import ChatView from './components/ChatView';
import { useChat } from './hooks/useChat';

export default function App() {
  const { messages, sendMessage, isLoading, sessionId, createNewSession } = useChat();

  useEffect(() => {
    if (!sessionId) {
      createNewSession('stage-0');
    }
  }, [sessionId, createNewSession]);

  return (
    <div className="h-screen flex">
      <aside className="w-60 bg-gray-800 border-r border-gray-700 p-4 flex flex-col">
        <h1 className="text-lg font-bold text-white mb-4">⭐ Hoshino</h1>
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">学习进度</p>
          <div className="space-y-1">
            {['Stage 0', 'Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'].map((s, i) => (
              <div key={s} className={`text-sm px-2 py-1 rounded ${i === 0 ? 'bg-blue-900/50 text-blue-300' : 'text-gray-400'}`}>
                {s}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {sessionId ? `会话: ${sessionId.slice(0, 8)}...` : '未连接'}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <ChatView messages={messages} onSend={sendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}
