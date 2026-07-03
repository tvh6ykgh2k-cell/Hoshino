import type { LLMProvider, LLMChunk, ToolDef, ChatMessage } from '../../shared/types';
import OpenAI from 'openai';

class DeepSeekProvider implements LLMProvider {
  name = 'deepseek';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
    });
  }

  async *chat(messages: ChatMessage[], tools?: ToolDef[]): AsyncGenerator<LLMChunk> {
    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages.map(m => ({ role: m.role as any, content: m.content })),
      tools: tools?.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const content = delta?.content || '';

      const toolCalls = delta?.tool_calls?.map(tc => ({
        id: tc.id || '',
        name: tc.function?.name || '',
        arguments: tc.function?.arguments || '',
      }));

      yield { content, toolCalls, done: false };
    }

    yield { content: '', done: true };
  }
}

export function createProvider(type: string, apiKey: string): LLMProvider {
  switch (type) {
    case 'deepseek':
      return new DeepSeekProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
}
