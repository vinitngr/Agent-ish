# Plugin System

## Manual Registration
Register a specific plugin instance.

```typescript
import { Agent } from './agent/core/Agent';
import { MyPlugin } from './plugins/MyPlugin';

const agent = new Agent('./config');
await agent.use(new MyPlugin(), { someOption: true });
```

## Directory Loading
Automatically load all `.ts` or `.js` files from a folder.

```typescript
// Loads everything in ./custom_plugins
// monitoring: true enables hot-reloading on file change
await agent.loadPluginsFrom('./custom_plugins', { monitoring: true });
```

## Standard Plugins

### CorePlugin
Registers system tools (filesystem, shell) and loads markdown skills from `/skills`.
```typescript
await agent.use(new CorePlugin());
```

### LLMPlugin
Standard bridge for LLM providers (Gemini, OpenAI, etc.).
```typescript
await agent.use(new LLMPlugin());
```

### McpPlugin
Loads dynamic tools from Model Context Protocol (MCP) servers.
```typescript
await agent.use(new McpPlugin('./config/mcp.json'));
```

### SocketPlugin
Enables the persistent daemon interface.
```typescript
await agent.use(new SocketPlugin());
```

### ShellCommandPlugin
Allows executing shell commands directly with `!`.
```typescript
// Restricted to specific interfaces for security
await agent.use(new ShellCommandPlugin({ 
  allowedInterfaces: ['socket'] 
}));
```

## Plugin Structure
```typescript
import { IPlugin } from '../types/Plugin';

export class MyPlugin implements IPlugin {
  async register(agent: any) {
    agent.addInputInterceptor(async (input: string) => {
      if (input === 'ping') return 'pong';
      return null;
    });
  }
}
```
