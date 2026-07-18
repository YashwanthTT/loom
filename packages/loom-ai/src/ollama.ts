import type { AIProvider, ChatMessage, ToolDefinition, ChatResponse, ChatResponseChunk } from "../types";

function mapMessagesToOllama(messages: ChatMessage[]): any[] {
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
            arguments: JSON.parse(tc.arguments)
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

export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  readonly name = "Ollama Local";

  constructor(
    private modelName: string = "llama3.1",
    private endpoint: string = "http://localhost:11434/api/chat"
  ) {}

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const ollamaTools = tools?.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        messages: mapMessagesToOllama(messages),
        stream: false,
        tools: ollamaTools
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}: ${response.statusText}`);
    }

    const res: any = await response.json();
    const content = res.message?.content || "";
    const toolCalls = res.message?.tool_calls?.map((tc: any, index: number) => {
      const args = typeof tc.function.arguments === 'object'
        ? JSON.stringify(tc.function.arguments)
        : tc.function.arguments;
      return {
        id: tc.id || `call_${tc.function.name}_${index}_${Date.now()}`,
        name: tc.function.name,
        arguments: args
      };
    });

    return {
      content,
      toolCalls
    };
  }

  async *streamChat(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponseChunk> {
    const ollamaTools = tools?.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelName,
        messages: mapMessagesToOllama(messages),
        stream: true,
        tools: ollamaTools
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed with status ${response.status}: ${response.statusText}`);
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
          if (line.trim() === "") continue;
          try {
            const chunk = JSON.parse(line);
            const contentChunk = chunk.message?.content || undefined;
            const toolCallChunks = chunk.message?.tool_calls?.map((tc: any, index: number) => {
              const args = typeof tc.function.arguments === 'object'
                ? JSON.stringify(tc.function.arguments)
                : tc.function.arguments;
              return {
                index,
                id: tc.id || `call_${tc.function.name}_${index}_${Date.now()}`,
                name: tc.function.name,
                argumentsChunk: args
              };
            });

            yield {
              contentChunk,
              toolCallChunks
            };
          } catch {
            // Ignore incomplete line JSON parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
