# Tool Registration

## Manual Registration
Register a tool directly via the `agent.tools` registry.

```typescript
agent.tools.register({
  name: 'calculate',
  description: 'Perform math operations',
  execute: async (args) => {
    // Logic here
    return String(eval(args.expression));
  }
});
```

## Lazy Loading
Register a tool factory that only instantiates when called. Useful for heavy tools with large dependencies.

```typescript
agent.tools.registerLazy('heavy_search', async () => {
  const { HeavyTool } = await import('./HeavyTool');
  return new HeavyTool();
});
```

## Unregistering
```typescript
agent.tools.unregister('temporary_tool');
```
