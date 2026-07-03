import type { Persona, Stage, TopicProgress, ChatMessage } from '../../shared/types';
import { RECENT_MESSAGES_KEEP, COMPRESSION_THRESHOLD } from '../../shared/constants';

export function buildSystemPrompt(
  persona: Persona | undefined,
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
  lines.push(`\n## 语气\n${p.tone}`);

  if (currentStage) {
    lines.push(`\n# 当前课程阶段`);
    lines.push(`Stage ${currentStage.order}: ${currentStage.title}`);
    lines.push(`${currentStage.description}`);
    lines.push(`\n## 模块列表`);
    for (const mod of currentStage.modules) {
      lines.push(`- ${mod.title}: ${mod.description}`);
      for (const topic of mod.topics) {
        lines.push(`  - ${topic.id}: ${topic.title}`);
      }
    }
  }

  if (progress.length > 0) {
    lines.push(`\n# 学生学习进度`);
    for (const p of progress) {
      const emoji = p.status === 'mastered' ? '✅' : p.status === 'weak' ? '⚠️' : p.status === 'in_progress' ? '📖' : '🔒';
      lines.push(`${emoji} ${p.topicId}: ${p.status}${p.score != null ? ` (评分: ${p.score})` : ''}`);
    }
  }

  lines.push(`\n# 教学规则`);
  lines.push(`- 一次只教一个概念，确保学生理解后再推进`);
  lines.push(`- 当学生提问时，先判断是否与当前学习内容相关。相关的深入解答，不相关的简要回答后引回正题`);
  lines.push(`- 使用具体的代码示例解释抽象概念`);
  lines.push(`- 引用学生已经掌握的知识来帮助理解新概念`);

  return lines.join('\n');
}

function getStyleInstruction(style: string): string {
  switch (style) {
    case 'academic':
      return '按课程大纲循序渐近，每个概念从定义到原理到实践完整讲解。';
    case 'practical':
      return '直奔主题，用最少的概念解释开始动手做，在实践中发现问题再回头补充理论。';
    case 'socratic':
      return '不直接给出答案。通过连续追问引导学生自己思考、自己发现答案。当学生困惑时说"这个问题的答案在你之前学的 X 里面"，而不是直接告诉。';
    case 'peer':
      return '以平等的学习伙伴身份交流，用"我们一起来理解这个..."而不是"你应该学这个..."的口吻。';
    default:
      return '循序渐近，因材施教。';
  }
}

export function compressHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= RECENT_MESSAGES_KEEP) {
    return messages;
  }

  // Check if we actually need compression
  const totalTokens = estimateTokens(messages.map(m => m.content).join(' '));
  if (totalTokens < COMPRESSION_THRESHOLD) {
    return messages;
  }

  const recent = messages.slice(-RECENT_MESSAGES_KEEP);
  const older = messages.slice(0, -RECENT_MESSAGES_KEEP);

  const summaryContent = older
    .map(m => `[${m.role}]: ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}`)
    .join('\n');

  const summaryMessage: ChatMessage = {
    id: `summary-${Date.now()}`,
    sessionId: messages[0]?.sessionId || '',
    role: 'system',
    content: `[历史摘要]\n${summaryContent}`,
    createdAt: new Date().toISOString(),
  };

  return [summaryMessage, ...recent];
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
