import { BrowserWindow } from 'electron';
import OpenAI from 'openai';
import type { ChatMessage, Persona, Stage, TopicProgress } from '../shared/types';
import { getDatabase } from './database';
import { MAX_CONTEXT_TOKENS } from '../shared/constants';

// ── Provider 配置 ──────────────────────────────────────────────────

const PROVIDER_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  claude: 'https://api.anthropic.com',
  ollama: 'http://localhost:11434/v1',
};

function getProviderConfig(): { model: string; baseURL: string } {
  const db = getDatabase();
  const modelRow = db.prepare("SELECT value FROM settings WHERE key = 'model'").get() as { value: string } | undefined;
  const providerRow = db.prepare("SELECT value FROM settings WHERE key = 'provider'").get() as { value: string } | undefined;
  const model = modelRow?.value || 'deepseek-chat';
  const provider = providerRow?.value || 'deepseek';
  const baseURL = PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.deepseek;
  return { model, baseURL };
}

// ── 上下文窗口管理 ──────────────────────────────────────────────────

export function estimateTokens(text: string): number {
  // 中文/日文混合文本的保守估算：约 1.5 字符/token
  return Math.ceil(text.length / 1.5);
}

function enforceTokenBudget(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = MAX_CONTEXT_TOKENS
): ChatMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  let budget = maxTokens - systemTokens;
  if (budget <= 0) return [];

  const result: ChatMessage[] = [];
  // 从最新消息开始保留，直到用完 token 预算
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (budget - msgTokens < 0) break;
    result.unshift(messages[i]);
    budget -= msgTokens;
  }

  return result;
}

// ── LLM 调用 + 流式响应 ────────────────────────────────────────────

export async function streamChatResponse(
  window: BrowserWindow,
  sessionId: string,
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string
): Promise<void> {
  const { model, baseURL } = getProviderConfig();

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  // 上下文窗口裁剪
  const trimmedMessages = enforceTokenBudget(systemPrompt, messages);

  const systemMsg = { role: 'system' as const, content: systemPrompt };
  const chatMessages = [systemMsg, ...trimmedMessages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))] as any;

  try {
    const stream = await client.chat.completions.create({
      model,
      messages: chatMessages,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        window.webContents.send('chat:stream:chunk', content);
      }
    }

    // 仅保存 assistant 消息（user 消息由 CHAT_SEND handler 负责）
    const db = getDatabase();
    const assistantMsgId = `msg-${Date.now()}-assistant`;
    db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)')
      .run(assistantMsgId, sessionId, 'assistant', fullContent);

    window.webContents.send('chat:stream:done');
  } catch (err: any) {
    window.webContents.send('chat:stream:error', err.message || 'Unknown error');
  }
}

// ── System Prompt 构建 ──────────────────────────────────────────────

export function buildSystemPromptMain(
  persona: Persona | null,
  currentStage: Stage | null,
  progress: TopicProgress[]
): string {
  const p = persona || {
    name: '星野老师',
    teachingStyle: 'academic' as const,
    language: '中文为主',
    tone: '详细但不过度',
    roleDescription: '你是星野(Hoshino)，一位经验丰富的 AI Agent 工程师导师。',
    template: '学院派导师'
  };

  const lines: string[] = [];
  lines.push(`# 你的身份\n${p.roleDescription}`);
  lines.push(`\n## 教学风格\n${getStyleInstruction(p.teachingStyle)}`);
  lines.push(`\n## 语气\n${p.tone}`);
  lines.push(`\n## 语言\n${p.language}`);

  // 当前课程阶段
  if (currentStage) {
    lines.push(`\n# 当前课程阶段`);
    lines.push(`Stage ${currentStage.order}: ${currentStage.title}`);
    lines.push(`${currentStage.description}`);
    // 只列出模块和主题名，不展开内容以控制 prompt 长度
    if (currentStage.modules) {
      for (const mod of currentStage.modules) {
        lines.push(`- ${mod.title}`);
        if (mod.topics) {
          for (const topic of mod.topics) {
            lines.push(`  - ${topic.id}: ${topic.title}`);
          }
        }
      }
    }
  }

  // 学生学习进度
  if (progress.length > 0) {
    lines.push(`\n# 学生学习进度`);
    for (const prog of progress) {
      const emoji = prog.status === 'mastered' ? '✅'
        : prog.status === 'weak' ? '⚠️'
        : prog.status === 'in_progress' ? '📖'
        : '🔒';
      lines.push(`${emoji} ${prog.topicId}: ${prog.status}${prog.score != null ? ` (评分: ${prog.score})` : ''}`);
    }
  }

  lines.push(`\n# 教学规则`);
  lines.push(`- 一次只教一个概念，确保学生理解后再推进`);
  lines.push(`- 当学生提问时，先判断是否与当前学习内容相关`);
  lines.push(`- 多举代码实例，让学生在实践中理解`);
  lines.push(`- 在新概念讲解前，先关联学生已有的知识`);

  return lines.join('\n');
}

function getStyleInstruction(style: string): string {
  switch (style) {
    case 'academic': return '按课程大纲循序渐近，每个概念从定义到原理到实践完整讲解。';
    case 'practical': return '直奔主题，用最少的概念解释开始动手做。';
    case 'socratic': return '不直接给出答案，通过连续追问引导学生自己思考。';
    case 'peer': return '以平等的学习伙伴身份交流。';
    default: return '循序渐近，因材施教。';
  }
}
