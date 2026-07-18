import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Content, Part } from "@google/generative-ai";
import type { AIProvider, ChatMessage, ToolDefinition, ChatResponse, ChatResponseChunk } from "../types";

function mapSchemaToGemini(schema: any): any {
  if (!schema) return undefined;
  const mapped: any = { ...schema };
  if (typeof schema.type === 'string') {
    mapped.type = schema.type.toUpperCase();
  }
  if (schema.properties) {
    mapped.properties = {};
    for (const key of Object.keys(schema.properties)) {
      mapped.properties[key] = mapSchemaToGemini(schema.properties[key]);
    }
  }
  if (schema.items) {
    mapped.items = mapSchemaToGemini(schema.items);
  }
  return mapped;
}

function mapMessagesToGemini(messages: ChatMessage[]): { systemInstruction?: string; contents: Content[] } {
  let systemInstruction: string | undefined;
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = (systemInstruction ? systemInstruction + "\n" : "") + msg.content;
      continue;
    }

    let role: 'user' | 'model';
    let parts: Part[] = [];

    if (msg.role === 'user') {
      role = 'user';
      parts.push({ text: msg.content });
    } else if (msg.role === 'assistant') {
      role = 'model';
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: JSON.parse(tc.arguments)
            }
          });
        }
      }
    } else if (msg.role === 'tool') {
      role = 'user';
      let responseObj: any;
      try {
        responseObj = JSON.parse(msg.content);
        if (typeof responseObj !== 'object' || responseObj === null) {
          responseObj = { result: msg.content };
        }
      } catch {
        responseObj = { result: msg.content };
      }
      parts.push({
        functionResponse: {
          name: msg.name || '',
          response: responseObj
        }
      });
    } else {
      continue;
    }

    const lastContent = contents[contents.length - 1];
    if (lastContent && lastContent.role === role) {
      lastContent.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  }

  return { systemInstruction, contents };
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly name = "Google Gemini";

  constructor(
    private apiKey?: string,
    private modelName: string = "gemini-1.5-flash"
  ) {}

  private getClient(): GoogleGenerativeAI {
    const key = this.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Gemini API key is not set. Please provide it or set the GEMINI_API_KEY environment variable.");
    }
    return new GoogleGenerativeAI(key);
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    const genAI = this.getClient();
    const { systemInstruction, contents } = mapMessagesToGemini(messages);

    const geminiTools = tools && tools.length > 0 ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: mapSchemaToGemini(t.parameters)
      }))
    }] : undefined;

    const model = genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction,
      tools: geminiTools
    });

    const result = await model.generateContent({
      contents
    });

    let content = "";
    try {
      content = result.response.text();
    } catch {
      // Ignore text retrieval error if it contains tool calls
    }

    const calls = result.response.functionCalls();
    const toolCalls = calls?.map((fc: any, index: number) => ({
      id: `call_${fc.name}_${index}_${Date.now()}`,
      name: fc.name,
      arguments: JSON.stringify(fc.args)
    }));

    return {
      content,
      toolCalls
    };
  }

  async *streamChat(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<ChatResponseChunk> {
    const genAI = this.getClient();
    const { systemInstruction, contents } = mapMessagesToGemini(messages);

    const geminiTools = tools && tools.length > 0 ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: mapSchemaToGemini(t.parameters)
      }))
    }] : undefined;

    const model = genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction,
      tools: geminiTools
    });

    const resultStream = await model.generateContentStream({
      contents
    });

    for await (const chunk of resultStream.stream) {
      let contentChunk: string | undefined;
      try {
        contentChunk = chunk.text() || undefined;
      } catch {
        contentChunk = undefined;
      }

      const calls = chunk.functionCalls();
      const toolCallChunks = calls?.map((fc: any, index: number) => ({
        index,
        id: `call_${fc.name}_${index}_${Date.now()}`,
        name: fc.name,
        argumentsChunk: JSON.stringify(fc.args)
      }));

      yield {
        contentChunk,
        toolCallChunks
      };
    }
  }
}
