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

## Hot-Reloading
Skills are monitored. Editing any `SKILL.md` file instantly updates the agent's capabilities without a restart.
