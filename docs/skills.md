# Skill Registration

## Manual Registration
Skills are higher-level capabilities (like a specialized AI persona or a complex multi-step prompt).

```typescript
agent.skills.register({
  name: 'code-reviewer',
  description: 'Specialized in reviewing PRs',
  instructions: 'Review the following code for security and performance...'
});
```

# Skill Registration

## Manual Registration
Skills are higher-level capabilities (specialized personas or multi-step logic).

```typescript
agent.skills.register({
  name: 'code-reviewer',
  description: 'Specialized in reviewing PRs',
  instructions: 'Review the following code for security and performance...'
});
```

## Directory Loading (Markdown + YAML)
The `CorePlugin` automatically loads skills from the `/skills` folder. Each skill should be in its own sub-directory with a `SKILL.md` file.

**File Structure:** `/skills/greet-user/SKILL.md`

```markdown
---
name: greet-user
description: friendly greeting skill
---

# Friendly Greet
When the user says hello, reply: "Hello! I am your agent. How can I help?"
```

## Programmatic Directory Loading
You can also load a directory of skills directly via the `Agent` instance. This is useful for loading multiple skill folders or if you aren't using the `CorePlugin`.

```typescript
await agent.loadSkillsFrom('./custom-skills', { monitoring: true });
```

## Hot-Reloading
Skills are monitored when `monitoring: true` is passed to either the `CorePlugin` or `loadSkillsFrom`. Editing any `SKILL.md` file instantly updates the agent's capabilities without a restart.
