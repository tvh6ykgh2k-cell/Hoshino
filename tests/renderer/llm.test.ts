import { describe, it, expect } from 'vitest';
import { createProvider } from '../../src/renderer/lib/llm';

describe('createProvider', () => {
  it('returns a DeepSeek provider', () => {
    const provider = createProvider('deepseek', 'test-key');
    expect(provider).toBeDefined();
    expect(provider.name).toBe('deepseek');
  });

  it('throws for unknown provider', () => {
    expect(() => createProvider('unknown' as any, 'key')).toThrow('Unknown provider: unknown');
  });
});
