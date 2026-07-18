export * from "./types";
export * from "./src/events";

import { GeminiProvider } from "./src/gemini";
import { OllamaProvider } from "./src/ollama";
import { OpenRouterProvider } from "./src/openrouter";
import type { AIProvider } from "./types";

export function getProvider(
  providerType: 'gemini' | 'ollama' | 'openrouter',
  config: { apiKey?: string; modelName?: string } = {}
): AIProvider {
  switch (providerType) {
    case 'gemini':
      return new GeminiProvider(config.apiKey);
    case 'ollama':
      return new OllamaProvider(config.modelName);
    case 'openrouter':
      return new OpenRouterProvider(config.apiKey, config.modelName);
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}
