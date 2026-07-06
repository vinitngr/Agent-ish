# Agent-ish

A highly flexible, modular, and agnostic AI engine designed for building powerful agentic workflows. It separates the "Brain" from I/O and storage, allowing you to easily hook it into any environment (CLI, API Gateway, WebSocket server, etc.).

## 🚀 Quick Start

### Basic Execution
The engine is incredibly simple to use for one-shot queries.

```typescript
import { Agent } from './src/core/Agent';
import { CorePlugin } from './src/plugins/CorePlugin';
import { LLMPlugin } from './src/plugins/LLMPlugin';

const agent = new Agent();
await agent.init();
await agent.use(new CorePlugin());
await agent.use(new LLMPlugin());
await agent.boot();

// Simple stateful request (pass sessionId to remember conversation)
const response = await agent.execute("What is the capital of France?", {
  sessionId: "user-123"
});

// The core automatically manages conversation history in memory/storage
const session = await agent.sessions.get("user-123");
console.log(session.getHistory()); 
/*
[
  { role: 'user', content: 'What is the capital of France?', timestamp: ... },
  { role: 'assistant', content: 'The capital of France is Paris.', timestamp: ... }
]
*/
```

### Advanced Execution Options (Safety & Budgets)
You can dynamically override safety limits, budgets, and models for any specific request without changing the global configuration.

```typescript
const response = await agent.execute("Fetch the massive dataset and summarize it.", {
  model: 'gemini:gemini-3.5-flash',
  maxIterations: 5,               // Prevent infinite loops (circuit breaker)
  timeoutSeconds: 30,             // Maximum execution time
  maxToolResponseLength: 1000,    // Truncate massive tool outputs to save tokens
  maxRetries: 3,                  // Automatically retry on rate limits (429)
  systemContext: "You are a helpful data analyst.",
  allowedTools: ['dataset_fetcher'] // Restrict what tools the agent can use
});
```

### 🌊 Live Streaming & UI Updates
Agent-ish is designed perfectly for real-time frontend applications. You can stream raw text tokens while simultaneously catching structured tool events!

```typescript
const response = await agent.execute("Search for the latest news", {
  // 1. Stream raw text instantly to the UI (SSE / WebSockets)
  onStream: (chunk) => {
    socket.emit('text_chunk', chunk);
  },

  // 2. Stream structured data (like Tool calls and Results)
  onStep: (stepInfo) => {
    if (stepInfo.type === 'action') {
      socket.emit('ui_event', `🔧 Agent is using tool: ${stepInfo.tool}`);
    }
    if (stepInfo.type === 'result') {
      socket.emit('ui_event', `✅ Tool finished! Processing results...`);
    }
  }
});
```

### 🔀 Custom Pipeline Routing
If you want to completely override the core `Orchestrator` for specific tasks, you can register custom pipelines and seamlessly route requests to them using the `pipeline` option!

```typescript
// 1. Register a custom pipeline
agent.registerPipeline("chat", {
  execute: async (orchestrator, input, options) => {
    return "Custom Pipeline Result";
  }
});

// 2. Route a request explicitly to that pipeline!
const response = await agent.execute("Hello?", {
  pipeline: "chat"
});
```

## 🏗️ Architecture

- **Agnostic Core**: The planner logic is completely decoupled from your network implementation.
- **Event-Driven**: Aside from request-scoped callbacks (`onStep`), the core emits global events (`agent.on(...)`) for logging and metrics.
- **Pluggable**: All side-effects and integrations are handled via Plugins.

## 🧭 Full Documentation

Dive deeper into specific subsystems:
- [Plugins](./docs/plugins.md): Standard plugins and custom loaders.
- [Tools](./docs/tools.md): Manual and lazy registration of tools.
- [Skills](./docs/skills.md): Markdown-based capability registration.
- [Customization](./docs/customization.md): Overriding planners and storage.
