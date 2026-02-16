# Session Management

## Slash Commands
In-chat commands for session control.

| Command | Description |
| :--- | :--- |
| `/new` | Generates a new unique Session ID. |
| `/sessions` | Lists all active sessions in the daemon. |
| `/load <id>` | Switches the current connection to session `<id>`. |
| `/reset` | Clears chat history but keeps the same ID. |

## Programmatic Execution
Pass a specific session ID and initial metadata when calling from code.

```typescript
const result = await agent.execute("Hello", { 
  sessionId: "user_123_chat_45",
  model: "openai:gpt-4o" // Pre-select model for this session
});
```
