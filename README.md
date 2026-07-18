# Loom - AI Coding Agent

Loom is an interactive, terminal-based AI Coding Agent designed to assist developers directly from their CLI. It features a Terminal User Interface (TUI) and integrates with various commercial and local Large Language Models (LLMs) to perform file reads/writes, command execution, and interactive chats.

---

## 🚀 Today's Updates (Completed by Faiz)

Faiz has successfully implemented the core AI provider infrastructure under the `@loom/ai` package. This layer provides a unified interface for connecting to different AI backends, making them completely interchangeable.

### 1. Unified Provider Interface (`@loom/ai`)
Defined a shared contract that all AI backends must follow:
* **`ChatMessage`**: Structures system messages, user queries, assistant responses, tool calls, and tool responses.
* **`AIProvider`**: Interface that requires implementing `chat` (for one-off execution) and `streamChat` (for real-time token rendering).

### 2. Supported LLM Backends
* 🤖 **Ollama Provider** (`src/ollama.ts`):
  * Connects to a local Ollama instance (defaults to `http://localhost:11434`).
  * Verified working out-of-the-box with local models like `qwen2.5-coder:1.5b`.
* 🌟 **Gemini Provider** (`src/gemini.ts`):
  * Connects to Google's Gemini models using the official `@google/generative-ai` SDK.
  * Includes automated mapping for function/tool calling schemas and automatically groups consecutive messages of the same role to prevent API validation errors.
* 🌐 **OpenRouter Provider** (`src/openrouter.ts`):
  * Connects to commercial LLMs (like Claude 3.5 Sonnet or GPT-4o) using OpenRouter's OpenAI-compatible endpoint.

### 3. Butter-Smooth Stream Accumulator (`src/events.ts`)
* Implemented a utility function `consumeStream` that captures token streams and partial tool calls, processes them in real-time, and fires developer-friendly callbacks (`onTextChunk` and `onToolCallDelta`). It stitches together the final completed content and tool definitions automatically.

---

## 📂 Codebase Architecture

```text
loom/
├── packages/
│   ├── loom-ai/               # AI and LLM Provider Logic (Built by Faiz)
│   │   ├── src/
│   │   │   ├── gemini.ts      # Google Gemini API connector
│   │   │   ├── ollama.ts      # Local Ollama REST connector
│   │   │   ├── openrouter.ts  # OpenRouter OpenAI-compatible connector
│   │   │   └── events.ts      # Stream event handler & accumulator
│   │   ├── types.ts           # Shared TypeScript interfaces
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── loom-coding/           # TUI Components (To Be Built)
│   │   ├── src/
│   │   │   ├── input.ts       # Chat input box
│   │   │   ├── sidebar.ts     # Context viewer panel
│   │   │   ├── notification.ts# Status/Banner notifications
│   │   │   └── slash-command.ts# Shortcuts like /help, /file
│   │   └── index.ts
│   │
│   └── loom-agent/            # Main Agent Orchestration (To Be Built)
│       ├── src/
│       │   └── tools.ts       # System commands/file operations tools
│       └── index.ts           # Core execution loop
│
├── scratch/                   # Test scripts (Git-ignored)
│   └── test-provider.ts       # Provider validation runner
│
├── package.json               # Root workspaces config
└── tsconfig.base.json         # Base TypeScript configuration
```

---

## 🛠️ Running the Verification Tests

A local verification script has been created to test the streaming and completion functionality of the providers.

### 1. Install Workspace Dependencies
Make sure node dependencies are installed:
```bash
npm install
```

### 2. Run the Provider Test
To test the Ollama provider locally (ensure Ollama is running and has a model pulled):
```bash
npx tsx scratch/test-provider.ts
```

### 3. Test Commercial Models
To test Gemini or OpenRouter, create a `.env` file in the root directory and add your API keys:
```env
GEMINI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

---

## 🗺️ Next Steps: Contributor Roadmap

For other developers joining the project, here is what you should work on right now:

### Task 1: Building TUI Components (`@loom/loom-coding`)
We need to implement the terminal layout and interactive widgets using `@opentui/core`. 
* **Input Box** (`src/input.ts`): A text box that receives user commands and passes them to the agent loop.
* **Sidebar** (`src/sidebar.ts`): Side panel to display files in context, tool call status, or tokens statistics.
* **Notification System** (`src/notification.ts`): A widget to notify the user of background actions (e.g. "Running npm install...").
* **Slash Commands** (`src/slash-command.ts`): Handler for TUI commands like `/help`, `/add <file>`, and `/clear`.

### Task 2: Implementing Agent Orchestration (`@loom/cli` / `@loom/loom-agent`)
We need to build the execution loop of the agent.
* **Tools Definition** (`src/tools.ts`): Write the system tools that the AI can trigger (like `read_file`, `write_file`, `execute_command`).
* **Agent loop** (`index.ts`): Orchestrate the prompt, call the `@loom/ai` provider, parse the returned tools, run them, and feed the outputs back to the model.
