import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock electron before importing database module
vi.mock('electron', () => ({
  app: {
    getPath: () => ':memory:',
  },
}));

import { getDatabase, closeDatabase, Database, initSqlJsRuntime } from '../../src/main/database';

describe('database', () => {
  let db: Database;

  beforeAll(async () => {
    await initSqlJsRuntime();
    db = getDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('creates progress table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='progress'").get() as { name: string } | undefined;
    expect(row).toBeDefined();
    expect(row!.name).toBe('progress');
  });

  it('creates sessions table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it('creates messages table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'").get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it('creates obsidian_notes table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='obsidian_notes'").get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it('creates persona table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='persona'").get() as { name: string } | undefined;
    expect(row).toBeDefined();
  });

  it('inserts and reads progress', () => {
    db.prepare(`INSERT INTO progress (id, topic_id, status) VALUES (?, ?, ?)`).run('test-1', 'topic-1', 'in_progress');
    const row = db.prepare('SELECT * FROM progress WHERE id = ?').get('test-1') as { id: string; topic_id: string; status: string };
    expect(row.topic_id).toBe('topic-1');
    expect(row.status).toBe('in_progress');
  });
});
