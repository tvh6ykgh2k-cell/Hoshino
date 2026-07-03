import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, Persona, Stage, TopicProgress } from '../../shared/types';
import { api } from '../lib/api';
import { createProvider } from '../lib/llm';
import { buildSystemPrompt, compressHistory } from '../lib/context';

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

    const allMessages = [...messages, userMsg];
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
      // Get API key from settings
      const settings = await api.getSettings();
      if (!settings.apiKey) {
        currentAssistantRef.current = '请先在设置中配置 API Key';
        setMessages(prev =>
          prev.map(m => (m.id === assistantId ? { ...m, content: currentAssistantRef.current } : m))
        );
        setIsLoading(false);
        return;
      }

      // Build messages for LLM
      const currentStage = curriculum.find(s => s.id === 'stage-0') || null;
      const systemPrompt = buildSystemPrompt(persona || undefined, currentStage, progress);
      const compressed = compressHistory(allMessages);

      const llmMessages: ChatMessage[] = [
        { id: 'system', sessionId, role: 'system', content: systemPrompt, createdAt: '' },
        ...compressed,
      ];

      // Call LLM
      const provider = createProvider('deepseek', settings.apiKey);
      for await (const chunk of provider.chat(llmMessages)) {
        currentAssistantRef.current += chunk.content;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: currentAssistantRef.current }
              : m
          )
        );
      }
    } catch (err: any) {
      currentAssistantRef.current = `错误: ${err.message || '未知错误'}`;
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, content: currentAssistantRef.current } : m))
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, isLoading, persona, curriculum, progress]);

  return { messages, sendMessage, isLoading, sessionId, createNewSession };
}
