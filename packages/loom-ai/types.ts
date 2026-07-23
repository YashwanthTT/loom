export type Role = "user" | "assistant" | "tool" | "system";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIChatMessage {
  role: Role;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ChatResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface ChatResponseChunk {
  contentChunk?: string;
  toolCallChunks?: {
    index: number;
    id?: string;
    name?: string;
    argumentsChunk?: string;
  }[];
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  chat(
    messages: AIChatMessage[],
    tools?: ToolDefinition[]
  ): Promise<ChatResponse>;
  streamChat(
    messages: AIChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<ChatResponseChunk>;
}
