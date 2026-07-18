import type { AIProvider, ChatMessage, ToolDefinition, ChatResponse, ChatResponseChunk } from "../types";

function mapMessagesToOpenRouter(messages: ChatMessage[]): any[] {
  return messages.map(msg => {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        name: msg.name,
        tool_call_id: msg.toolCallId
      };
    }
    if (msg.role === 'assistant') {
      return {
        role: 'assistant',
        content: msg.content,
        tool_calls: msg.toolCalls?.map((tc: any) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: tc.arguments
          }
        }))
      };
    }
    return {
      role: msg.role,
      content: msg.content
    };
  });
}

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter AI";

  constructor(
    private apiKey?: string,
    private modelName: string = "anthropic/claude-3.5-sonnet",
    private endpoint: string = "https://openrouter.ai/api/v1/chat/completions"
  ) {}

  private getApiKey(): string {
    const key = this.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error("OpenRouter API key is not set. Please provide it or set the OPENROUTER_API_KEY environment variable.");
    }
    return key;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const key = this.getApiKey();
    const openRouterTools = tools?.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://github.com/YashwanthTT/loom",
        "X-Title": "Loom Coding Agent"
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: mapMessagesToOpenRouter(messages),
        stream: false,
        tools: openRouterTools
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed with status ${response.status}: ${errorText}`);
    }

    const res: any = await response.json();
    const message = res.choices?.[0]?.message;
    const content = message?.content || "";
    
    const toolCalls = message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments
    }));

    return {
      content,
      toolCalls
    };
  }

  async *streamChat(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponseChunk> {
    const key = this.getApiKey();
    const openRouterTools = tools?.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://github.com/YashwanthTT/loom",
        "X-Title": "Loom Coding Agent"
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: mapMessagesToOpenRouter(messages),
        stream: true,
        tools: openRouterTools
      })
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed with status ${response.status}: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const chunk = JSON.parse(dataStr);
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            const contentChunk = delta.content || undefined;
            const toolCallChunks = delta.tool_calls?.map((tc: any) => ({
              index: tc.index,
              id: tc.id,
              name: tc.function?.name,
              argumentsChunk: tc.function?.arguments
            }));

            yield {
              contentChunk,
              toolCallChunks
            };
          } catch {
            // Ignore JSON parse errors for incomplete lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
