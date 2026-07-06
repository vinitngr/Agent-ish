---
name: Current Date
description: A skill to get the current date and time.
---

# Current Date Skill

This skill allows the agent to retrieve the current date and time.

## Usage

When the user asks for the date or time, use the `Date` object in JavaScript/TypeScript to get the current date and time.

Example:
\`\`\`typescript
const now = new Date();
console.log(now.toISOString());
\`\`\`