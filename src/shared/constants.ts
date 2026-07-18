export const APP_NAME = 'Hoshino';
export const DB_PATH = 'hoshino.db';
export const DEFAULT_MODEL = 'deepseek-chat';
export const MAX_CONTEXT_TOKENS = 6000;
export const COMPRESSION_THRESHOLD = 4000;
export const RECENT_MESSAGES_KEEP = 6;
export const OBSIDIAN_NOTE_DIR = 'AgentGuide';

export const IPC_CHANNELS = {
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  MESSAGES_GET_BY_SESSION: 'messages:getBySession',
  SESSION_SUMMARIZE: 'session:summarize',
  CAPTURE_SAVE: 'capture:save',
  SESSION_CREATE: 'session:create',
  SESSION_LIST: 'session:list',
  PROGRESS_GET: 'progress:get',
  PROGRESS_UPDATE: 'progress:update',
  CURRICULUM_LOAD: 'curriculum:load',
  VAULT_READ: 'vault:read',
  VAULT_WRITE: 'vault:write',
  VAULT_SCAN: 'vault:scan',
  PERSONA_GET: 'persona:get',
  PERSONA_SET: 'persona:set',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const;
