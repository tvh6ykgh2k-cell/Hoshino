import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeNote, readNote, scanVault, generateNoteContent } from '../../src/main/obsidian-bridge';
import fs from 'fs';
import path from 'path';
import os from 'os';

const testVault = path.join(os.tmpdir(), 'hoshino-test-vault');

describe('obsidian-bridge', () => {
  beforeEach(() => {
    if (fs.existsSync(testVault)) {
      fs.rmSync(testVault, { recursive: true });
    }
    fs.mkdirSync(testVault, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testVault)) {
      fs.rmSync(testVault, { recursive: true });
    }
  });

  it('writes and reads a note', () => {
    writeNote(testVault, 'test-note.md', '# Hello\n\nWorld');
    const content = readNote(testVault, 'test-note.md');
    expect(content).toContain('# Hello');
    expect(content).toContain('World');
  });

  it('scans vault for notes', () => {
    writeNote(testVault, 'a.md', '# A');
    writeNote(testVault, 'b.md', '# B');
    const notes = scanVault(testVault);
    expect(notes).toContain('a.md');
    expect(notes).toContain('b.md');
  });

  it('generateNoteContent produces valid markdown with frontmatter', () => {
    const content = generateNoteContent(
      'Tool Use 基础',
      'stage-2',
      's2-t1',
      ['agent', 'tool-use'],
      '## 核心概念\nTool Use 是 Agent 与外部交互的机制',
      '用户理解了 tool description 比 name 重要',
      ['[[Agent Loop]]', '[[Schema Design]]']
    );
    expect(content).toContain('---');
    expect(content).toContain('date:');
    expect(content).toContain('agent');
    expect(content).toContain('tool-use');
    expect(content).toContain('# Tool Use 基础');
    expect(content).toContain('[[Agent Loop]]');
    expect(content).toContain('## 我的理解');
  });
});
