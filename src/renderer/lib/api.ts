import type { Persona, AppSettings, Stage, TopicProgress, ChatSession } from '../../shared/types';

declare global {
  interface Window {
    electronAPI: {
      sendMessage: (payload: { sessionId: string; content: string }) => Promise<void>;
      onStreamChunk: (callback: (chunk: string) => void) => void;
      removeStreamListener: () => void;
      createSession: (stageId: string) => Promise<ChatSession>;
      listSessions: () => Promise<ChatSession[]>;
      getProgress: () => Promise<TopicProgress[]>;
      updateProgress: (payload: { topicId: string; status: string; score?: number }) => Promise<void>;
      loadCurriculum: () => Promise<Stage[]>;
      readVault: (relativePath: string) => Promise<string>;
      writeVault: (relativePath: string, content: string) => Promise<void>;
      scanVault: () => Promise<string[]>;
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
  updateProgress: (topicId: string, status: string, score?: number) =>
    window.electronAPI.updateProgress({ topicId, status, score }),
  loadCurriculum: () =>
    window.electronAPI.loadCurriculum(),
  readVault: (path: string) =>
    window.electronAPI.readVault(path),
  writeVault: (path: string, content: string) =>
    window.electronAPI.writeVault(path, content),
  scanVault: () =>
    window.electronAPI.scanVault(),
  getPersona: () =>
    window.electronAPI.getPersona(),
  setPersona: (persona: Persona) =>
    window.electronAPI.setPersona(persona),
  getSettings: () =>
    window.electronAPI.getSettings(),
  setSettings: (settings: Partial<AppSettings>) =>
    window.electronAPI.setSettings(settings),
};
