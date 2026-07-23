import type {
  AIProvider,
  AIChatMessage,
  ToolDefinition,
  ChatResponse,
  ChatResponseChunk,
} from "../types";

function mapMessagesToOpenRouter(messages: AIChatMessage[]): unknown[] {
  return messages.map((msg) => {
    if (msg.role === "tool") {
      return {
        role: "tool",
        content: msg.content,
        name: msg.name,
        tool_call_id: msg.toolCallId,
      };
    }
    if (msg.role === "assistant") {
      return {
        role: "assistant",
        content: msg.content,
        tool_calls: msg.toolCalls?.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    return { role: msg.role, content: msg.content };
  });
}

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter AI";

  constructor(
    private apiKey?: string,
    private modelName: string = "anthropic/claude-3.5-sonnet",
    private endpoint: string = "https://openrouter.ai/api/v1/chat/completions"
  ) { }

  private getApiKey(): string {
    const key = this.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error(
        "OpenRouter API key is not set. Provide it or set OPENROUTER_API_KEY."
      );
    }
    return key;
  }

  private buildRequest(
    messages: AIChatMessage[],
    tools: ToolDefinition[] | undefined,
    stream: boolean
  ) {
    return {
      model: this.modelName,
      messages: mapMessagesToOpenRouter(messages),
      stream,
      tools: tools?.map((t) => ({ type: "function", function: t })),
    };
  }

  private headers(key: string) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://github.com/YashwanthTT/loom",
      "X-Title": "Loom Coding Agent",
    };
  }

  async chat(
    messages: AIChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<ChatResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers(this.getApiKey()),
      body: JSON.stringify(this.buildRequest(messages, tools, false)),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed: ${response.status}: ${await response.text()}`);
    }

    const res = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id?: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };
    const message = res.choices?.[0]?.message;
    const toolCalls = message?.tool_calls?.map((tc, index) => ({
      id: tc.id ?? `call_${tc.function.name}_${index}_${Date.now()}`,
      name: tc.function.name,
      arguments: tc.function.arguments,
    }));

    return { content: message?.content ?? "", toolCalls };
  }

  async *streamChat(
    messages: AIChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<ChatResponseChunk> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.headers(this.getApiKey()),
      body: JSON.stringify(this.buildRequest(messages, tools, true)),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenRouter request failed: ${response.status}: ${await response.text()}`);
    }

    // SSE format: lines of `data: {json}`, terminated by `data: [DONE]`.
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
            const toolCallChunks = delta.tool_calls?.map((tc: {
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }) => ({
              index: tc.index,
              id: tc.id,
              name: tc.function?.name,
              argumentsChunk: tc.function?.arguments,
            }));

            yield { contentChunk, toolCallChunks };
          } catch {
            // ignore incomplete JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
