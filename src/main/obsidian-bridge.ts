import fs from 'fs';
import path from 'path';
import { OBSIDIAN_NOTE_DIR } from '../shared/constants';

export function readNote(vaultPath: string, relativePath: string): string | null {
  const fullPath = path.join(vaultPath, OBSIDIAN_NOTE_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

export function writeNote(vaultPath: string, relativePath: string, content: string): void {
  const fullPath = path.join(vaultPath, OBSIDIAN_NOTE_DIR, relativePath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

export function scanVault(vaultPath: string): string[] {
  const notesDir = path.join(vaultPath, OBSIDIAN_NOTE_DIR);
  if (!fs.existsSync(notesDir)) return [];
  const files: string[] = [];
  walkDir(notesDir, notesDir, files);
  return files;
}

function walkDir(baseDir: string, currentDir: string, files: string[]): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkDir(baseDir, fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(path.relative(baseDir, fullPath));
    }
  }
}

export function generateNoteContent(
  title: string,
  stageId: string,
  topicId: string,
  tags: string[],
  aiSummary: string,
  userUnderstanding: string,
  links: string[]
): string {
  const today = new Date().toISOString().split('T')[0];
  const tagLine = tags.map(t => `  - ${t}`).join('\n');

  return `---
date: ${today}
stage: ${stageId}
topic: ${topicId}
tags:
${tagLine}
---

# ${title}

## AI 总结
${aiSummary}

## 核心概念
(从本次学习提取的关键概念)

## 我的理解
${userUnderstanding}

## 关联知识
${links.map(l => `- ${l}`).join('\n')}
`;
}

export function findRelatedNotes(vaultPath: string, keywords: string[]): string[] {
  const allNotes = scanVault(vaultPath);
  const related: string[] = [];
  for (const notePath of allNotes) {
    const content = readNote(vaultPath, notePath);
    if (!content) continue;
    for (const kw of keywords) {
      if (content.includes(kw) && !related.includes(notePath)) {
        related.push(notePath);
      }
    }
  }
  return related;
}
