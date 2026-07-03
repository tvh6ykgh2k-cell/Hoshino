import { BrowserWindow } from 'electron';
import OpenAI from 'openai';
import type { ChatMessage, Persona, Stage, TopicProgress } from '../shared/types';
import { getDatabase } from './database';

// This handles the LLM call + streaming from the main process
export async function streamChatResponse(
  window: BrowserWindow,
  sessionId: string,
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string
): Promise<void> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });

  const systemMsg = { role: 'system' as const, content: systemPrompt };
  const chatMessages = [systemMsg, ...messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))] as any;

  // Save user message to DB
  const db = getDatabase();
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const userMsgId = `msg-${Date.now()}-user`;
    db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)')
      .run(userMsgId, sessionId, 'user', lastUserMsg.content);
  }

  try {
    const stream = await client.chat.completions.create({
      model: 'deepseek-chat',
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

    // Save assistant message to DB
    const assistantMsgId = `msg-${Date.now()}-assistant`;
    db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)')
      .run(assistantMsgId, sessionId, 'assistant', fullContent);

    window.webContents.send('chat:stream:done');
  } catch (err: any) {
    window.webContents.send('chat:stream:error', err.message || 'Unknown error');
  }
}

// Build system prompt in main process (mirrors renderer's context.ts logic)
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
  lines.push(`\n## 语言\n${p.language}`);

  if (currentStage) {
    lines.push(`\n# 当前课程阶段`);
    lines.push(`Stage ${currentStage.order}: ${currentStage.title}`);
    lines.push(`${currentStage.description}`);
    for (const mod of currentStage.modules) {
      lines.push(`- ${mod.title}: ${mod.description}`);
      for (const topic of mod.topics) {
        lines.push(`  - ${topic.id}: ${topic.title}`);
      }
    }
  }

  if (progress.length > 0) {
    lines.push(`\n# 学生学习进度`);
    for (const prog of progress) {
      const emoji = prog.status === 'mastered' ? '✅' : prog.status === 'weak' ? '⚠️' : prog.status === 'in_progress' ? '📖' : '🔒';
      lines.push(`${emoji} ${prog.topicId}: ${prog.status}${prog.score != null ? ` (评分: ${prog.score})` : ''}`);
    }
  }

  lines.push(`\n# 教学规则`);
  lines.push(`- 一次只教一个概念，确保学生理解后再推进`);
  lines.push(`- 当学生提问时，先判断是否与当前学习内容相关`);

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
