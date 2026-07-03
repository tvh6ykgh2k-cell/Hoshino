import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, compressHistory } from '../../src/renderer/lib/context';
import type { Persona, Stage, TopicProgress, ChatMessage } from '../../src/shared/types';

const testPersona: Persona = {
  name: '星野',
  teachingStyle: 'socratic',
  language: '中文为主',
  tone: '反问式',
  roleDescription: '你是星野(Hoshino)，一位苏格拉底式的导师。',
  template: '苏格拉底'
};

const testStage: Stage = {
  id: 'stage-1',
  order: 1,
  title: '最小 Agent',
  description: '构建最小 Agent Loop',
  prerequisites: [],
  modules: [
    {
      id: 'mod-1',
      title: 'Agent Loop 基础',
      description: '理解 observe→think→act→observe',
      topics: [
        { id: 'topic-1', title: '什么是 Agent Loop', content: '', keyConcepts: [], exercises: [] }
      ]
    }
  ],
  projectName: '最小 Agent',
  projectDescription: '构建一个 50-150 行的最小 Agent'
};

describe('buildSystemPrompt', () => {
  it('returns a string containing persona name', () => {
    const prompt = buildSystemPrompt(testPersona, testStage, []);
    expect(prompt).toContain('星野');
  });

  it('returns a string containing stage title', () => {
    const prompt = buildSystemPrompt(testPersona, testStage, []);
    expect(prompt).toContain('最小 Agent');
  });

  it('includes teaching style instruction', () => {
    const prompt = buildSystemPrompt(testPersona, testStage, []);
    expect(prompt).toContain('苏格拉底');
  });

  it('includes progress when provided', () => {
    const progress: TopicProgress[] = [
      { topicId: 'topic-1', status: 'mastered', startedAt: null, completedAt: null, score: 90, notes: null },
    ];
    const prompt = buildSystemPrompt(testPersona, testStage, progress);
    expect(prompt).toContain('topic-1');
    expect(prompt).toContain('mastered');
  });
});

describe('compressHistory', () => {
  it('keeps recent messages intact', () => {
    const messages: ChatMessage[] = Array.from({ length: 8 }, (_, i) => ({
      id: `msg-${i}`,
      sessionId: 's1',
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `Message ${i} with some content that takes up tokens`,
      createdAt: new Date().toISOString(),
    }));

    const compressed = compressHistory(messages);
    expect(compressed.length).toBeGreaterThanOrEqual(6);
    expect(compressed[compressed.length - 1].content).toBe('Message 7 with some content that takes up tokens');
  });

  it('returns all messages when under threshold (few messages)', () => {
    const messages: ChatMessage[] = [
      { id: 'm1', sessionId: 's1', role: 'user', content: 'Hello', createdAt: new Date().toISOString() },
      { id: 'm2', sessionId: 's1', role: 'assistant', content: 'Hi!', createdAt: new Date().toISOString() },
    ];
    const compressed = compressHistory(messages);
    expect(compressed).toEqual(messages);
  });
});
