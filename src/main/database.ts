import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { DB_PATH } from '../shared/constants';

let db: Database.Database | null = null;

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS persona (
    id TEXT PRIMARY KEY DEFAULT 'active',
    name TEXT NOT NULL DEFAULT '星野老师',
    teaching_style TEXT NOT NULL DEFAULT 'socratic',
    language TEXT NOT NULL DEFAULT '中文为主',
    tone TEXT NOT NULL DEFAULT '详细但不过度',
    role_description TEXT NOT NULL DEFAULT '你是星野(Hoshino)，一位经验丰富的 AI Agent 工程师导师。',
    template TEXT DEFAULT '学院派导师',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS progress (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'locked',
    started_at TEXT,
    completed_at TEXT,
    score INTEGER,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    stage_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    summary TEXT,
    topics_covered TEXT DEFAULT '[]',
    obsidian_note_path TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    token_count INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS obsidian_notes (
    path TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    links TEXT DEFAULT '[]',
    last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    source_session_id TEXT,
    FOREIGN KEY (source_session_id) REFERENCES sessions(id)
  )`,
];

export function getDatabase(dbPath?: string): Database.Database {
  if (db) return db;

  const resolvedPath = dbPath || path.join(app.getPath('userData'), DB_PATH);
  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  for (const migration of MIGRATIONS) {
    db.exec(migration);
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
