import type {
  AIProvider,
  AIChatMessage,
  ToolDefinition,
  ChatResponse,
  ChatResponseChunk,
} from "../types";

function mapMessagesToOllama(messages: AIChatMessage[]): unknown[] {
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
          function: { name: tc.name, arguments: JSON.parse(tc.arguments) },
        })),
      };
    }
    return { role: msg.role, content: msg.content };
  });
}

function argsToString(args: unknown): string {
  return typeof args === "object" && args !== null
    ? JSON.stringify(args)
    : String(args ?? "");
}

function makeToolCallId(name: string, index: number): string {
  return `call_${name}_${index}_${Date.now()}`;
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  readonly name = "Ollama Local";

  constructor(
    private modelName: string = "llama3.1",
    private endpoint: string = "http://localhost:11434/api/chat"
  ) {}

  private buildBody(messages: AIChatMessage[], tools: ToolDefinition[] | undefined, stream: boolean) {
    return JSON.stringify({
      model: this.modelName,
      messages: mapMessagesToOllama(messages),
      stream,
      tools: tools?.map((t) => ({ type: "function", function: t })),
    });
  }

  async chat(
    messages: AIChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<ChatResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: this.buildBody(messages, tools, false),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama request failed: ${response.status} ${response.statusText}`
      );
    }

    const res = (await response.json()) as {
      message?: { content?: string; tool_calls?: any[] };
    };

    const toolCalls = res.message?.tool_calls?.map((tc, index) => ({
      id: tc.id || makeToolCallId(tc.function?.name ?? "tool", index),
      name: tc.function.name,
      arguments: argsToString(tc.function.arguments),
    }));

    return { content: res.message?.content ?? "", toolCalls };
  }

  async *streamChat(
    messages: AIChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<ChatResponseChunk> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: this.buildBody(messages, tools, true),
    });

    if (!response.ok || !response.body) {
      throw new Error(
        `Ollama request failed: ${response.status} ${response.statusText}`
      );
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
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const chunk = JSON.parse(line) as {
              message?: { content?: string; tool_calls?: any[] };
            };
            const contentChunk = chunk.message?.content || undefined;
            const toolCallChunks = chunk.message?.tool_calls?.map(
              (tc, index) => ({
                index,
                id: tc.id || makeToolCallId(tc.function?.name ?? "tool", index),
                name: tc.function?.name,
                argumentsChunk: argsToString(tc.function?.arguments),
              })
            );
            yield { contentChunk, toolCallChunks };
          } catch {
            // ignore malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
