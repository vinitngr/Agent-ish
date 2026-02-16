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
| `/allow <tool>` | Grant permission for a tool for the current session. |
| `/deny <tool>` | Revoke permission for a tool. |
| `/consent` | View current status of allowed/blocked tools. |

## How it works
1. Agent tries to run a tool marked `requiresConsent`.
2. The `ConsentMiddleware` checks if the tool is already allowed for the session.
3. If not, execution is blocked and the user is notified.
4. User types `/allow <tool>` to grant permission.
5. Agent can now execute that tool for the rest of the session.
