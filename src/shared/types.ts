// === AI Persona ===
export interface Persona {
  name: string;
  teachingStyle: 'academic' | 'practical' | 'socratic' | 'peer';
  language: string;
  tone: string;
  roleDescription: string;
  template: string;
}

export const PERSONA_TEMPLATES: Record<string, Persona> = {
  academic: {
    name: '星野老师',
    teachingStyle: 'academic',
    language: '中文为主',
    tone: '详细但不过度',
    roleDescription: '你是星野(Hoshino)，一位经验丰富的 AI Agent 工程师导师。你按照系统化的课程大纲引导学生，循序渐进地讲解概念，用类比帮助理解复杂思想。',
    template: '学院派导师'
  },
  practical: {
    name: '星野教练',
    teachingStyle: 'practical',
    language: '中文为主',
    tone: '直接简洁',
    roleDescription: '你是星野(Hoshino)，一位实战派 AI Agent 教练。你少讲理论，直接带学生动手做项目，在实战中学习。',
    template: '实战教练'
  },
  socratic: {
    name: '星野',
    teachingStyle: 'socratic',
    language: '中文为主',
    tone: '反问式',
    roleDescription: '你是星野(Hoshino)，一位苏格拉底式的导师。你不会直接给出答案，而是通过连续追问引导学生自己发现答案。',
    template: '苏格拉底'
  },
  peer: {
    name: '星野',
    teachingStyle: 'peer',
    language: '中文为主',
    tone: '轻松平等',
    roleDescription: '你是星野(Hoshino)，一个平等的学习伙伴。你和学生一起探索 AI Agent 的世界，分享彼此的发现和困惑。',
    template: '同行搭档'
  }
};

// === Course ===
export interface Topic {
  id: string;
  title: string;
  content: string;
  keyConcepts: string[];
  exercises: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  topics: Topic[];
}

export interface Stage {
  id: string;
  order: number;
  title: string;
  description: string;
  prerequisites: string[];
  modules: Module[];
  projectName: string;
  projectDescription: string;
}

// === Progress ===
export type TopicStatus = 'locked' | 'available' | 'in_progress' | 'mastered' | 'weak';

export interface TopicProgress {
  topicId: string;
  status: TopicStatus;
  startedAt: string | null;
  completedAt: string | null;
  score: number | null;
  notes: string | null;
}

// === Chat ===
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
  tokenCount?: number;
}

export interface ChatSession {
  id: string;
  stageId: string;
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  topicsCovered: string[];
  obsidianNotePath: string | null;
}

// === Obsidian ===
export interface ObsidianNote {
  path: string;
  title: string;
  tags: string[];
  links: string[];
  lastSyncedAt: string;
  sourceSessionId: string | null;
}

// === Settings ===
export interface AppSettings {
  vaultPath: string;
  apiKey: string;
  provider: 'deepseek' | 'claude' | 'ollama';
  model: string;
  persona: Persona;
}

// === LLM Provider ===
export interface LLMProvider {
  chat(messages: ChatMessage[], tools?: ToolDef[]): AsyncGenerator<LLMChunk>;
  name: string;
}

export interface LLMChunk {
  content: string;
  toolCalls?: ToolCallDelta[];
  done: boolean;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallDelta {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
}
