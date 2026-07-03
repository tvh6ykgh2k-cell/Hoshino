import React, { useEffect } from 'react';
import ChatView from './components/ChatView';
import Sidebar from './components/Sidebar';
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
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <ChatView messages={messages} onSend={sendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}
