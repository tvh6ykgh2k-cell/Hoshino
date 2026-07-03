import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  sendMessage: (payload: { sessionId: string; content: string }) =>
    ipcRenderer.invoke('chat:send', payload),
  onStreamChunk: (callback: (chunk: string) => void) => {
    ipcRenderer.on('chat:stream:chunk', (_event, chunk: string) => callback(chunk));
  },
  removeStreamListener: () => {
    ipcRenderer.removeAllListeners('chat:stream:chunk');
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
