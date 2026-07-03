import { ipcMain, BrowserWindow, safeStorage, app } from 'electron';
import { getDatabase } from './database';
import { IPC_CHANNELS } from '../shared/constants';
import type { Persona, TopicProgress, ChatSession } from '../shared/types';
import fs from 'fs';
import path from 'path';
import { readNote, writeNote, scanVault } from './obsidian-bridge';
import { streamChatResponse, buildSystemPromptMain } from './llm-service';

export function registerIpcHandlers(): void {
  const db = getDatabase();

  // === Sessions ===
  ipcMain.handle(IPC_CHANNELS.SESSION_CREATE, (_event, stageId: string): ChatSession => {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: ChatSession = {
      id,
      stageId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      summary: null,
      topicsCovered: [],
      obsidianNotePath: null,
    };
    db.prepare(`INSERT INTO sessions (id, stage_id, started_at, topics_covered)
      VALUES (?, ?, ?, '[]')`).run(session.id, session.stageId, session.startedAt);
    return session;
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_LIST, (): ChatSession[] => {
    const rows = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      stageId: r.stage_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      summary: r.summary,
      topicsCovered: JSON.parse(r.topics_covered),
      obsidianNotePath: r.obsidian_note_path,
    }));
  });

  // === Chat ===
  ipcMain.handle(IPC_CHANNELS.CHAT_SEND, async (_event, payload: { sessionId: string; content: string }) => {
    const userMsgId = `msg-${Date.now()}-user`;
    db.prepare(`INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)`)
      .run(userMsgId, payload.sessionId, 'user', payload.content);
    return { messageId: userMsgId };
  });

  ipcMain.handle(IPC_CHANNELS.CHAT_STREAM, async (event, payload: { sessionId: string; messages: any[] }) => {
    const personaRow = db.prepare("SELECT * FROM persona WHERE id = 'active'").get() as any;
    const persona = personaRow ? {
      name: personaRow.name,
      teachingStyle: personaRow.teaching_style,
      language: personaRow.language,
      tone: personaRow.tone,
      roleDescription: personaRow.role_description,
      template: personaRow.template,
    } : null;

    const progressRows = db.prepare('SELECT * FROM progress').all() as any[];
    const progress = progressRows.map((r: any) => ({
      topicId: r.topic_id,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      score: r.score,
      notes: r.notes,
    }));

    // Get API key from settings
    const apiKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'apiKey'").get() as { value: string } | undefined;
    if (!apiKeyRow?.value) {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.webContents.send('chat:stream:error', '请先在设置中配置 API Key');
      return;
    }

    // Decrypt API key if encrypted with safeStorage
    let apiKey = apiKeyRow.value;
    if (safeStorage.isEncryptionAvailable()) {
      try {
        apiKey = safeStorage.decryptString(Buffer.from(apiKeyRow.value, 'base64'));
      } catch {
        // fallback for unencrypted values
      }
    }

    const systemPrompt = buildSystemPromptMain(persona, null, progress);

    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;

    await streamChatResponse(window, payload.sessionId, payload.messages, apiKey, systemPrompt);
  });

  // === Progress ===
  ipcMain.handle(IPC_CHANNELS.PROGRESS_GET, (): TopicProgress[] => {
    const rows = db.prepare('SELECT * FROM progress').all() as any[];
    return rows.map(r => ({
      topicId: r.topic_id,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      score: r.score,
      notes: r.notes,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.PROGRESS_UPDATE, (_event, payload: { topicId: string; status: string; score?: number }) => {
    const id = `prog-${payload.topicId}`;
    const existing = db.prepare('SELECT id FROM progress WHERE id = ?').get(id);
    if (existing) {
      db.prepare(`UPDATE progress SET status = ?, score = ?, completed_at = CASE WHEN ? = 'mastered' THEN datetime('now') ELSE completed_at END WHERE id = ?`)
        .run(payload.status, payload.score ?? null, payload.status, id);
    } else {
      db.prepare(`INSERT INTO progress (id, topic_id, status, score, started_at)
        VALUES (?, ?, ?, ?, datetime('now'))`)
        .run(id, payload.topicId, payload.status, payload.score ?? null);
    }
  });

  // === Curriculum ===
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_LOAD, () => {
    const dataPath = path.join(app.getAppPath(), 'data', 'curriculum.json');
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }
    // Fallback for dev mode
    const devPath = path.join(__dirname, '..', '..', '..', 'data', 'curriculum.json');
    if (fs.existsSync(devPath)) {
      return JSON.parse(fs.readFileSync(devPath, 'utf-8'));
    }
    return [];
  });

  // === Persona ===
  ipcMain.handle(IPC_CHANNELS.PERSONA_GET, (): Persona | null => {
    const row = db.prepare("SELECT * FROM persona WHERE id = 'active'").get() as any;
    if (!row) return null;
    return {
      name: row.name,
      teachingStyle: row.teaching_style,
      language: row.language,
      tone: row.tone,
      roleDescription: row.role_description,
      template: row.template,
    };
  });

  ipcMain.handle(IPC_CHANNELS.PERSONA_SET, (_event, persona: Persona) => {
    db.prepare(`INSERT OR REPLACE INTO persona (id, name, teaching_style, language, tone, role_description, template, updated_at)
      VALUES ('active', ?, ?, ?, ?, ?, ?, datetime('now'))`)
      .run(persona.name, persona.teachingStyle, persona.language, persona.tone, persona.roleDescription, persona.template);
  });

  // === Settings ===
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const r of rows) {
      if (r.key === 'apiKey' && safeStorage.isEncryptionAvailable()) {
        try {
          result[r.key] = safeStorage.decryptString(Buffer.from(r.value, 'base64'));
        } catch {
          result[r.key] = r.value; // fallback for unencrypted values
        }
      } else {
        result[r.key] = r.value;
      }
    }
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, settings: Record<string, string>) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'apiKey' && safeStorage.isEncryptionAvailable() && value) {
        const encrypted = safeStorage.encryptString(value).toString('base64');
        stmt.run(key, encrypted);
      } else {
        stmt.run(key, value);
      }
    }
  });

  // === Obsidian Vault ===
  ipcMain.handle(IPC_CHANNELS.VAULT_SCAN, () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'vaultPath'").get() as { value: string } | undefined;
    if (!row?.value) return [];
    return scanVault(row.value);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_READ, (_event, relativePath: string) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'vaultPath'").get() as { value: string } | undefined;
    if (!row?.value) return null;
    return readNote(row.value, relativePath);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_WRITE, (_event, relativePath: string, content: string) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'vaultPath'").get() as { value: string } | undefined;
    if (!row?.value) return;
    writeNote(row.value, relativePath, content);
  });
}
