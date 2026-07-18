export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string containing arguments
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
  
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse>;
  streamChat(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponseChunk>;
}
