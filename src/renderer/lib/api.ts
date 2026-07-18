import type { Persona, AppSettings, Stage, TopicProgress, TopicStatus, ChatSession, ChatMessage } from '../../shared/types';

declare global {
  interface Window {
    electronAPI: {
      sendMessage: (payload: { sessionId: string; content: string }) => Promise<void>;
      streamChat: (payload: { sessionId: string; messages: any[] }) => Promise<void>;
      onStreamChunk: (callback: (chunk: string) => void) => void;
      removeStreamListener: () => void;
      onStreamDone: (callback: () => void) => void;
      onStreamError: (callback: (error: string) => void) => void;
      createSession: (stageId: string) => Promise<ChatSession>;
      listSessions: () => Promise<ChatSession[]>;
      getProgress: () => Promise<TopicProgress[]>;
      updateProgress: (payload: { topicId: string; status: string; score?: number }) => Promise<void>;
      loadCurriculum: () => Promise<Stage[]>;
      readVault: (relativePath: string) => Promise<string>;
      writeVault: (relativePath: string, content: string) => Promise<void>;
      scanVault: () => Promise<string[]>;
      getMessagesBySession: (sessionId: string) => Promise<ChatMessage[]>;
      summarizeSession: (sessionId: string) => Promise<{ notePath?: string; error?: string }>;
      captureSave: (rawText: string) => Promise<{ notePath?: string; title?: string; error?: string; debug?: string }>;
      readClipboard: () => string;
      getPersona: () => Promise<Persona>;
      setPersona: (persona: Persona) => Promise<void>;
      getSettings: () => Promise<AppSettings>;
      setSettings: (settings: Partial<AppSettings>) => Promise<void>;
    };
  }
}

export const api = {
  sendMessage: (sessionId: string, content: string) =>
    window.electronAPI.sendMessage({ sessionId, content }),
  onStreamChunk: (cb: (chunk: string) => void) =>
    window.electronAPI.onStreamChunk(cb),
  removeStreamListener: () =>
    window.electronAPI.removeStreamListener(),
  createSession: (stageId: string) =>
    window.electronAPI.createSession(stageId),
  listSessions: () =>
    window.electronAPI.listSessions(),
  getProgress: () =>
    window.electronAPI.getProgress(),
  streamChat: (sessionId: string, messages: any[]) =>
    window.electronAPI.streamChat({ sessionId, messages }),
  updateProgress: (topicId: string, status: TopicStatus, score?: number) =>
    window.electronAPI.updateProgress({ topicId, status, score }),
  loadCurriculum: () =>
    window.electronAPI.loadCurriculum(),
  readVault: (path: string) =>
    window.electronAPI.readVault(path),
  writeVault: (path: string, content: string) =>
    window.electronAPI.writeVault(path, content),
  scanVault: () =>
    window.electronAPI.scanVault(),
  getMessagesBySession: (sessionId: string) =>
    window.electronAPI.getMessagesBySession(sessionId),
  summarizeSession: (sessionId: string) =>
    window.electronAPI.summarizeSession(sessionId),
  captureSave: (rawText: string) =>
    window.electronAPI.captureSave(rawText),
  readClipboard: () =>
    window.electronAPI.readClipboard(),
  getPersona: () =>
    window.electronAPI.getPersona(),
  setPersona: (persona: Persona) =>
    window.electronAPI.setPersona(persona),
  getSettings: () =>
    window.electronAPI.getSettings(),
  setSettings: (settings: Partial<AppSettings>) =>
    window.electronAPI.setSettings(settings),
};
