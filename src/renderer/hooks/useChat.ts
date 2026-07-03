import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, Persona, Stage, TopicProgress } from '../../shared/types';
import { api } from '../lib/api';

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
  sessionId: string | null;
  createNewSession: (stageId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [curriculum, setCurriculum] = useState<Stage[]>([]);
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const currentAssistantRef = useRef<string>('');
  const messagesRef = useRef<ChatMessage[]>(messages);
  const curriculumRef = useRef<Stage[]>(curriculum);
  const progressRef = useRef<TopicProgress[]>(progress);

  // Keep refs in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    curriculumRef.current = curriculum;
  }, [curriculum]);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Load initial data
  useEffect(() => {
    Promise.all([
      api.getPersona(),
      api.loadCurriculum(),
      api.getProgress(),
    ]).then(([p, c, pr]) => {
      setPersona(p);
      setCurriculum(c as Stage[]);
      setProgress(pr);
    });
  }, []);

  const createNewSession = useCallback(async (stageId: string) => {
    const session = await api.createSession(stageId);
    setSessionId(session.id);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    const allMessages = [...messagesRef.current, userMsg];
    setMessages(allMessages);
    setIsLoading(true);
    currentAssistantRef.current = '';

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      sessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      // Build the messages array to send (without system prompt -- main process builds it)
      const chatMessages = allMessages.map(m => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));

      // Set up IPC streaming listeners
      api.onStreamChunk((chunk: string) => {
        currentAssistantRef.current += chunk;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: currentAssistantRef.current }
              : m
          )
        );
      });

      // Register one-time listeners for done/error
      window.electronAPI.onStreamDone(() => {
        api.removeStreamListener();
        setIsLoading(false);
      });

      window.electronAPI.onStreamError((errorMsg: string) => {
        currentAssistantRef.current = `错误: ${errorMsg}`;
        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, content: currentAssistantRef.current } : m))
        );
        api.removeStreamListener();
        setIsLoading(false);
      });

      await api.streamChat(sessionId!, chatMessages);
    } catch (err: any) {
      currentAssistantRef.current = `错误: ${err.message || '未知错误'}`;
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, content: currentAssistantRef.current } : m))
      );
      api.removeStreamListener();
      setIsLoading(false);
    }
  }, [sessionId, isLoading]);

  return { messages, sendMessage, isLoading, sessionId, createNewSession };
}
