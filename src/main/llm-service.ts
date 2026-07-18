import { BrowserWindow } from 'electron';
import OpenAI from 'openai';
import type { ChatMessage, Persona, Stage, TopicProgress } from '../shared/types';
import { getDatabase } from './database';
import { MAX_CONTEXT_TOKENS } from '../shared/constants';
import { findRelatedNotes, readNote, writeNote } from './obsidian-bridge';

// ── Provider 配置 ──────────────────────────────────────────────────

const PROVIDER_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com',
  claude: 'https://api.anthropic.com',
  ollama: 'http://localhost:11434/v1',
  agnes: 'https://apihub.agnes-ai.com/v1',
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

function getApiKey(): string | null {
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'apiKey'").get() as { value: string } | undefined;
  if (!row?.value) return null;
  // safeStorage 解密由调用方处理，这里返回原始值
  return row.value;
}

function getVaultPath(): string | null {
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'vaultPath'").get() as { value: string } | undefined;
  return row?.value || null;
}

// ── 上下文窗口管理 ──────────────────────────────────────────────────

export function estimateTokens(text: string): number {
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
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (budget - msgTokens < 0) break;
    result.unshift(messages[i]);
    budget -= msgTokens;
  }
  return result;
}

// ── Obsidian 上下文注入 ─────────────────────────────────────────────

export function buildObsidianContext(vaultPath: string | null, keywords: string[]): string | null {
  if (!vaultPath || keywords.length === 0) return null;

  const related = findRelatedNotes(vaultPath, keywords);
  if (related.length === 0) return null;

  const lines: string[] = [];
  lines.push(`\n# 知识库关联笔记`);
  lines.push(`以下是你之前学过的相关内容：`);

  for (const notePath of related.slice(0, 3)) {
    const content = readNote(vaultPath, notePath);
    if (!content) continue;
    // 只取前 300 字避免 token 爆炸
    const excerpt = content.length > 300 ? content.slice(0, 300) + '...' : content;
    lines.push(`\n## ${notePath.replace('.md', '')}`);
    lines.push(excerpt);
  }

  return lines.join('\n');
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

  const client = new OpenAI({ apiKey, baseURL });

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

    const db = getDatabase();
    const assistantMsgId = `msg-${Date.now()}-assistant`;
    db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)')
      .run(assistantMsgId, sessionId, 'assistant', fullContent);

    window.webContents.send('chat:stream:done');
  } catch (err: any) {
    window.webContents.send('chat:stream:error', err.message || 'Unknown error');
  }
}

// ── 会话总结 + 自动存档到 Obsidian ──────────────────────────────────

export async function summarizeAndSaveToObsidian(
  window: BrowserWindow,
  sessionId: string,
  apiKey: string
): Promise<{ notePath: string } | { error: string }> {
  const db = getDatabase();
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return { error: '请先在设置中配置 Obsidian Vault 路径' };
  }

  // 获取会话消息
  const msgRows = db.prepare(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId) as any[];

  if (msgRows.length === 0) {
    return { error: '会话无消息，无法生成总结' };
  }

  // 获取当前 stage 信息
  const sessionRow = db.prepare("SELECT stage_id FROM sessions WHERE id = ?").get(sessionId) as { stage_id: string } | undefined;
  const stageId = sessionRow?.stage_id || 'unknown';

  // 获取 persona
  const personaRow = db.prepare("SELECT * FROM persona WHERE id = 'active'").get() as any;
  const personaName = personaRow?.name || '星野';

  // 用 LLM 流式生成总结
  const { model, baseURL } = getProviderConfig();
  console.log('[summarize] model:', model, 'baseURL:', baseURL, 'apiKey prefix:', apiKey.slice(0, 6) + '...');
  const client = new OpenAI({ apiKey, baseURL });

  const conversationText = msgRows.map((r: any) =>
    `[${r.role === 'user' ? '学生' : personaName}]: ${r.content}`
  ).join('\n\n');

  console.log('[summarize] conversation length:', conversationText.length, 'messages:', msgRows.length);

  try {
    // 用流式模式（DeepSeek 非流式偶发返回空）
    const stream = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个知识管理助手。请根据教学对话内容生成高质量的学习笔记。用中文输出。',
        },
        {
          role: 'user',
          content: `请根据以下教学对话，写一份学习笔记。按以下格式输出（严格按这个结构，但内容要充分）：

【标题】
用15字以内概括本次学习主题

【标签】
3-5个关键词，逗号分隔

【总结】
用200-400字概括本次对话的核心内容。要求：
- 说明讨论了什么问题、为什么重要
- 提炼关键观点和结论
- 能独立阅读，不依赖上下文

【核心概念】
提取3-6个关键概念，每个按格式：概念名 — 一句话解释（是什么 + 为什么重要）

【延伸方向】
2-4个可进一步学习的关联主题

对话内容：
${conversationText}`,
        },
      ],
      stream: true,
    });

    let resultText = '';
    let chunkCount = 0;
    for await (const chunk of stream) {
      chunkCount++;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) resultText += content;
    }
    console.log('[summarize] stream chunks received:', chunkCount);
    console.log('[summarize] LLM response length:', resultText.length);
    if (resultText.length > 0) {
      console.log('[summarize] LLM response preview:', resultText.slice(0, 300));
    } else {
      // Try to see if there's any response at all
      console.log('[summarize] DEBUG: empty response, checking if API call succeeded at all');
    }

    // 解析结构化文本
    const parsed = parseNoteResponse(resultText, stageId);

    // 生成笔记内容
    const today = new Date().toISOString().split('T')[0];
    const tagLine = parsed.tags.map((t: string) => `  - ${t}`).join('\n');
    const conceptsSection = parsed.concepts.length > 0
      ? parsed.concepts.map((c) => `- **${c.name}**：${c.detail}`).join('\n')
      : '(从本次学习提取的关键概念)';
    const relatedSection = parsed.relatedKnowledge.length > 0
      ? parsed.relatedKnowledge.map((l: string) => `- ${l}`).join('\n')
      : '(后续补充)';

    const noteContent = `---
date: ${today}
stage: ${stageId}
topic: manual-input
tags:
${tagLine}
---

# ${parsed.title}

## AI 总结
${parsed.summary}

## 核心概念
${conceptsSection}

## 我的理解
(课后补充)

## 关联知识
${relatedSection}
`;

    // 唯一文件名：日期 + 时间戳，避免覆盖
    const ts = Date.now();
    const safeFileName = parsed.title.replace(/[\/\\:*?"<>|]/g, '-');
    const notePath = `sessions/${today}/${ts}-${safeFileName}.md`;
    console.log('[summarize] writing to:', notePath);
    console.log('[summarize] content length:', noteContent.length);
    writeNote(vaultPath, notePath, noteContent);
    console.log('[summarize] write done');

    // 更新 session 的 obsidian_note_path（保留最新一次）
    db.prepare('UPDATE sessions SET obsidian_note_path = ? WHERE id = ?')
      .run(notePath, sessionId);

    // 同步到 obsidian_notes 表
    db.prepare(`INSERT OR REPLACE INTO obsidian_notes (path, title, tags, links, last_synced_at, source_session_id)
      VALUES (?, ?, ?, ?, datetime('now'), ?)`)
      .run(notePath, parsed.title, JSON.stringify(parsed.tags), '[]', sessionId);

    return { notePath };
  } catch (err: any) {
    console.error('[summarize] ERROR:', err.message, err.stack);
    return { error: err.message || '总结生成失败' };
  }
}

// ── 解析 LLM 输出的笔记内容 ────────────────────────────────────────

function parseNoteResponse(text: string, stageId: string): {
  title: string;
  tags: string[];
  summary: string;
  concepts: { name: string; detail: string }[];
  relatedKnowledge: string[];
} {
  const today = new Date().toISOString().split('T')[0];
  const defaults = {
    title: `学习记录 ${today}`,
    tags: [stageId],
    summary: '',
    concepts: [] as { name: string; detail: string }[],
    relatedKnowledge: [] as string[],
  };

  if (!text.trim()) return { ...defaults, summary: '(AI 未返回内容，请手动总结)' };

  // 按【】分隔各段落
  const sections: Record<string, string> = {};
  const parts = text.split(/【(.+?)】/);
  for (let i = 1; i < parts.length; i += 2) {
    sections[parts[i].trim()] = (parts[i + 1] || '').trim();
  }

  // 解析标题
  const titleSection = sections['标题'] || '';
  const title = titleSection.split('\n')[0]?.trim() || defaults.title;

  // 解析标签
  const tagsSection = sections['标签'] || '';
  const tags = tagsSection
    .split(/[,，\n]/)
    .map((t: string) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  // 解析总结
  const summary = sections['总结'] || sections['摘要'] || text.slice(0, 500);

  // 解析核心概念
  const conceptsText = sections['核心概念'] || '';
  const concepts = conceptsText
    .split('\n')
    .filter((l: string) => l.includes('—') || l.includes('：') || l.includes(':'))
    .map((l: string) => {
      const sep = l.includes('—') ? '—' : l.includes('：') ? '：' : ':';
      const [name, detail] = l.split(sep, 2);
      return { name: name.replace(/^[-*\s\d.]+/, '').trim(), detail: (detail || '').trim() };
    })
    .filter((c: { name: string; detail: string }) => c.name.length > 0);

  // 解析延伸方向
  const relatedText = sections['延伸方向'] || '';
  const relatedKnowledge = relatedText
    .split('\n')
    .map((l: string) => l.replace(/^[-*\s\d.]+/, '').trim())
    .filter(Boolean);

  return { title, tags, summary, concepts, relatedKnowledge };
}

// ── 网页抓取 ──────────────────────────────────────────────────────

function fetchArticleContent(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const { get } = url.startsWith('https') ? require('https') : require('http');

    const req = get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 15000,
    }, (res: any) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchArticleContent(res.headers.location));
        return;
      }

      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const html = Buffer.concat(chunks).toString('utf-8');
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#x\w+;/g, '')
            .replace(/&\w+;/g, '')
            .split('\n')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 20)
            .join('\n')
            .slice(0, 8000);

          resolve(text.length > 50 ? text : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── 快速捕获：AI 提炼内容 → 写 Obsidian ────────────────────────────

export async function captureAndSave(
  rawText: string,
  apiKey: string
): Promise<{ notePath: string; title: string; debug?: string } | { error: string; debug?: string }> {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return { error: '请先在设置中配置 Obsidian Vault 路径' };
  }

  const { model, baseURL } = getProviderConfig();
  const client = new OpenAI({ apiKey, baseURL });

  // 如果是链接，先抓取
  const isUrl = /^https?:\/\/\S+/.test(rawText.trim());
  let userContent = rawText;
  if (isUrl) {
    const fetched = await fetchArticleContent(rawText.trim());
    if (fetched) {
      userContent = `请总结以下文章的核心内容：\n\n${fetched}`;
    } else {
      return { error: '无法抓取该链接内容，请直接粘贴文章文字' };
    }
  } else {
    userContent = `请总结以下内容的核心要点：\n\n${rawText}`;
  }

  try {
    // 把指令和内容合并到一个 user message（避免某些模型忽略 system prompt）
    const prompt = `请总结以下内容。按这个格式回复：

第一行：标题（15字以内，精确概括主题）
第二行：标签（逗号分隔，3-5个关键词）
第三行：分类（如：AI Agent / LLM / 工具链 / 前端 / 架构 / 未分类）
空行
200-400字总结：提取核心观点和关键论据，结构化呈现，用自己的话而非复制原文

---
${userContent}`;

    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.5,
      max_tokens: 1200,
    });

    let resultText = '';
    for await (const chunk of stream) {
      resultText += chunk.choices[0]?.delta?.content || '';
    }

    const lines = resultText.split('\n').filter(l => l.trim());
    const title = lines[0]?.trim() || `知识笔记`;
    const tagsLine = lines[1]?.trim() || '';
    const tags = tagsLine ? tagsLine.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) : [];
    const category = lines[2]?.trim() || '未分类';
    const summary = lines.slice(4).join('\n').trim() || resultText || '(AI 未返回内容)';

    // 写入 Obsidian
    const fs = require('fs');
    const path = require('path');
    const safeFileName = title.replace(/[\/\\:*?"<>|]/g, '-');
    const dir = category && category !== '未分类'
      ? path.join(vaultPath, 'AgentGuide', category)
      : path.join(vaultPath, 'AgentGuide');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ts = Date.now();
    const notePath = path.join(dir, `${ts}-${safeFileName}.md`);
    const noteContent = `---
date: ${new Date().toISOString().split('T')[0]}
tags: [${tags.join(', ')}]
category: ${category}
source: ${isUrl ? rawText.trim() : '手动输入'}
---

# ${title}

## 核心要点
${summary}

## 原文
> ${rawText.trim().slice(0, 500)}${rawText.length > 500 ? '...' : ''}
`;

    fs.writeFileSync(notePath, noteContent, 'utf-8');

    // 数据库
    const db = getDatabase();
    const relPath = path.relative(vaultPath, notePath).replace(/\\/g, '/');
    db.prepare(`INSERT OR REPLACE INTO obsidian_notes (path, title, tags, links, last_synced_at, source_session_id)
      VALUES (?, ?, ?, ?, datetime('now'), ?)`)
      .run(relPath, title, JSON.stringify(tags), '[]', null);

    return { notePath: relPath, title, debug: resultText.slice(0, 500) };
  } catch (err: any) {
    return { error: err.message || '捕获失败', debug: String(err) };
  }
}

// ── System Prompt 构建 ──────────────────────────────────────────────

export function buildSystemPromptMain(
  persona: Persona | null,
  currentStage: Stage | null,
  progress: TopicProgress[],
  obsidianContext?: string | null
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

  // Obsidian 知识库上下文
  if (obsidianContext) {
    lines.push(obsidianContext);
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
  lines.push(`- 一次聚焦一个核心概念，由浅入深，确保学生理解后再推进`);
  lines.push(`- 每个概念从「是什么」→「为什么重要」→「怎么用」三步完整讲解`);
  lines.push(`- 多举真实代码示例，附带注释说明关键行`);
  lines.push(`- 在新概念讲解前，先关联学生已有的知识`);
  lines.push(`- 如果知识库中有相关笔记，优先引用其中的内容`);
  lines.push(`\n## 重要：回复风格要求`);
  lines.push(`- 回复要完整充实：概念解释 + 代码示例 + 注意事项，不少于300字`);
  lines.push(`- 用清晰的层次结构：概念说明 → 示例 → 要点总结`);
  lines.push(`- 代码块要有注释，说明每段代码的作用`);
  lines.push(`- 学生追问时深入展开细节，不要重复已讲过的内容`);

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
