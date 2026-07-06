# Tool Consent System (HITL)

The Human-in-the-Loop (HITL) system ensures that the agent cannot execute sensitive operations without explicit user approval.

## Global Configuration
You can enable/disable the entire system in your global configuration.

```json
// config/default.json
{
  "agent": {
    "consent": true
  }
}
```

## Tagging Tools
Mark any tool as sensitive by adding `requiresConsent: true`.

```typescript
agent.tools.register({
  name: 'system.deleteFile',
  description: 'Delete a file',
  requiresConsent: true,
  execute: async (ctx, args) => { /* ... */ }
});
```

## User Commands
Users manage consent per session using slash commands.

| Command | Description |
| :--- | :--- |
| `/allow <tool>` | Grant permission for a specific tool (e.g., `system.writeFile`). |
| `/allow <namespace>` | Grant permission for an entire group (e.g., `/allow system` unlocks all `system.*` tools). |
| `/allow *` | **Master Key:** Unlock every tool for the current session. |
| `/deny <tool>` | Revoke permission (works for namespaces too). |
| `/consent` | View current status of allowed patterns. |

## How it works
The `ConsentManager` uses prefix matching. If you allow `system`, any tool starting with `system.` (like `system.readFile`) will be automatically permitted without another prompt.
