export const AVAILABLE_MODELS = [
  'meta-llama/llama-4-scout:free',
  'openai/gpt-oss-20b:free',
  'z-ai/glm-4.5-air:free',
] as const;

export const DEFAULT_PROMPT = 'Please provide a concise summary of this voice note, highlighting the key points and main topics discussed.';

export const DEFAULT_TEMPERATURE = 0.3;