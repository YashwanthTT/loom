import type { ChatResponseChunk, ToolCall } from "../types";

export interface StreamCallbacks {
  onTextChunk?: (chunk: string) => void;
  onToolCallDelta?: (
    toolIndex: number,
    delta: { id?: string; name?: string; argumentsChunk?: string }
  ) => void;
}

export interface StreamResult {
  content: string;
  toolCalls: ToolCall[];
}

/**
 * Helper function to consume a chat stream.
 * It accumulates the content, stitches together tool calls, calls callbacks,
 * and returns the final accumulated ChatResponse.
 */
export async function consumeStream(
  stream: AsyncIterable<ChatResponseChunk>,
  callbacks: StreamCallbacks = {}
): Promise<StreamResult> {
  let content = "";
  const toolCallsMap: Map<number, { id?: string; name?: string; arguments: string }> = new Map();

  for await (const chunk of stream) {
    if (chunk.contentChunk) {
      content += chunk.contentChunk;
      if (callbacks.onTextChunk) {
        callbacks.onTextChunk(chunk.contentChunk);
      }
    }

    if (chunk.toolCallChunks) {
      for (const tcChunk of chunk.toolCallChunks) {
        const index = tcChunk.index;
        if (!toolCallsMap.has(index)) {
          toolCallsMap.set(index, {
            id: tcChunk.id,
            name: tcChunk.name,
            arguments: tcChunk.argumentsChunk || ""
          });
        } else {
          const current = toolCallsMap.get(index)!;
          if (tcChunk.id) current.id = tcChunk.id;
          if (tcChunk.name) current.name = tcChunk.name;
          if (tcChunk.argumentsChunk) {
            current.arguments += tcChunk.argumentsChunk;
          }
        }

        if (callbacks.onToolCallDelta) {
          callbacks.onToolCallDelta(index, tcChunk);
        }
      }
    }
  }

  const toolCalls: ToolCall[] = [];
  for (const [index, tc] of toolCallsMap.entries()) {
    if (tc.name) {
      toolCalls.push({
        id: tc.id || `call_${tc.name}_${index}_${Date.now()}`,
        name: tc.name,
        arguments: tc.arguments
      });
    }
  }

  return {
    content,
    toolCalls
  };
}
