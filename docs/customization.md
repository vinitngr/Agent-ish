# System Customization

## Custom Planner
Override the default LLM logic with a custom strategy.

```typescript
import { MyCustomPlanner } from './planners/MyCustomPlanner';

agent.setPlanner(new MyCustomPlanner());
```

## Custom Session Storage
Swap the memory storage for Disk or Database.

```typescript
import { MongoSessionStore } from './storage/MongoSessionStore';

const store = new MongoSessionStore('mongodb://localhost:27017');
agent.setSessionStore(store);
```

## Security Middlewares
Intercept and block tool calls based on name or arguments.

```typescript
agent.addMiddleware(async (call) => {
  // Block destructive tools
  if (call.name === 'delete_file') return false; 
  
  // Allow everything else
  return true;
});
```

## Observability
Monitor agent events and inspect available capabilities.

```typescript
// Listen for tool execution
agent.on('tool:call:start', (call) => {
  console.log(`🎯 Executing: ${call.name}`);
});

// Inspect all registered tools/skills
const snapshot = agent.inspect();
console.log(snapshot.tools); 
```
