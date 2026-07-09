import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { DB_PATH } from '../shared/constants';

let SQL: SqlJsStatic | null = null;

/** 必须在 app ready 后、任何数据库操作前调用一次 */
export async function initSqlJsRuntime(): Promise<void> {
  SQL = await initSqlJs();
}

// ── wrapper 层：把 sql.js 包裹成 better-sqlite3 风格的同步 API ──────

class Statement {
  constructor(
    private db: SqlJsDatabase,
    private sql: string,
  ) {}

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt = this.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params as any);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Record<string, unknown>);
    }
    stmt.free();
    return rows;
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    const stmt = this.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params as any);
    const row = stmt.step() ? (stmt.getAsObject() as Record<string, unknown>) : undefined;
    stmt.free();
    return row;
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const stmt = this.db.prepare(this.sql);
    if (params.length > 0) stmt.bind(params as any);
    stmt.step();
    const changes = this.db.getRowsModified();
    stmt.free();
    // sql.js doesn't expose lastInsertRowid natively — use SQL trick
    const row = this.db.exec('SELECT last_insert_rowid() AS id');
    const lastInsertRowid = Number(row[0]?.values?.[0]?.[0] ?? 0);
    return { changes, lastInsertRowid };
  }
}

export class Database {
  private db: SqlJsDatabase;
  private filePath: string;

  constructor(db: SqlJsDatabase, filePath: string) {
    this.db = db;
    this.filePath = filePath;
  }

  exec(sql: string): void {
    this.db.run(sql);
  }

  pragma(pragmaStr: string): void {
    this.db.run(`PRAGMA ${pragmaStr}`);
  }

  prepare(sql: string): Statement {
    return new Statement(this.db, sql);
  }

  close(): void {
    const data = this.db.export();
    // :memory: 等特殊路径不落盘
    if (!this.filePath.startsWith(':')) {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, Buffer.from(data));
    }
    this.db.close();
  }
}

// ── 单例 ─────────────────────────────────────────────────────────

let db: Database | null = null;

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

export function getDatabase(dbPath?: string): Database {
  if (db) return db;
  if (!SQL) throw new Error('sql.js 未初始化，请先调用 initSqlJsRuntime()');

  const resolvedPath = dbPath || path.join(app.getPath('userData'), DB_PATH);

  // 从磁盘加载已有数据库，否则创建新的
  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(resolvedPath)) {
    const buffer = fs.readFileSync(resolvedPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new Database(sqlDb, resolvedPath);
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
