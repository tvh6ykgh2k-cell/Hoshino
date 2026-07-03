import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Channel strings must match IPC_CHANNELS in src/shared/constants.ts
  sendMessage: (payload: { sessionId: string; content: string }) =>
    ipcRenderer.invoke('chat:send', payload),
  streamChat: (payload: { sessionId: string; messages: any[] }) =>
    ipcRenderer.invoke('chat:stream', payload),
  onStreamChunk: (callback: (chunk: string) => void) => {
    ipcRenderer.on('chat:stream:chunk', (_event, chunk: string) => callback(chunk));
  },
  removeStreamListener: () => {
    ipcRenderer.removeAllListeners('chat:stream:chunk');
  },
  onStreamDone: (callback: () => void) => {
    ipcRenderer.once('chat:stream:done', () => callback());
  },
  onStreamError: (callback: (error: string) => void) => {
    ipcRenderer.once('chat:stream:error', (_event, error: string) => callback(error));
  },
  createSession: (stageId: string) =>
    ipcRenderer.invoke('session:create', stageId),
  listSessions: () =>
    ipcRenderer.invoke('session:list'),
  getProgress: () =>
    ipcRenderer.invoke('progress:get'),
  updateProgress: (payload: { topicId: string; status: string; score?: number }) =>
    ipcRenderer.invoke('progress:update', payload),
  loadCurriculum: () =>
    ipcRenderer.invoke('curriculum:load'),
  readVault: (relativePath: string) =>
    ipcRenderer.invoke('vault:read', relativePath),
  writeVault: (relativePath: string, content: string) =>
    ipcRenderer.invoke('vault:write', relativePath, content),
  scanVault: () =>
    ipcRenderer.invoke('vault:scan'),
  getPersona: () =>
    ipcRenderer.invoke('persona:get'),
  setPersona: (persona: unknown) =>
    ipcRenderer.invoke('persona:set', persona),
  getSettings: () =>
    ipcRenderer.invoke('settings:get'),
  setSettings: (settings: unknown) =>
    ipcRenderer.invoke('settings:set', settings),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
