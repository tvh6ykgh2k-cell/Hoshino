import React, { useEffect, useRef } from 'react';
import ChatView from './components/ChatView';
import Sidebar from './components/Sidebar';
import { useChat } from './hooks/useChat';

export default function App() {
  const {
    messages, sendMessage, isLoading, sessionId, sessions,
    createNewSession, resumeSession,
  } = useChat();
  const initialized = useRef(false);

  useEffect(() => {
    // sessions === null means still loading; wait for it
    if (sessions === null || initialized.current) return;
    initialized.current = true;
    if (sessions.length > 0) {
      // Resume the most recent session (sorted by started_at DESC)
      resumeSession(sessions[0].id);
    } else {
      createNewSession('stage-0');
    }
  }, [sessions, createNewSession, resumeSession]);

  return (
    <div className="h-screen flex bg-surface-950">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatView
          messages={messages}
          onSend={sendMessage}
          isLoading={isLoading}
          sessionId={sessionId}
        />
      </main>
    </div>
  );
}
