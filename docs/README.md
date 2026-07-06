# Agent-ish Developer Documentation

Welcome to the documentation for the Agent-ish core. This project is built as a highly agnostic, modular AI engine.

## 🧭 Navigation

### Core Systems
- **[plugins.md](./plugins.md)**: Standard plugins and how to load custom ones.
- **[tools.md](./tools.md)**: Manual and lazy registration of agent tools.
- **[skills.md](./skills.md)**: Markdown-based skills and capability registration.
- **[interfaces.md](./interfaces.md)**: Adding new I/O layers (TCP, HTTP, Terminal).
- [sessions.md](./sessions.md): Multi-session management and persistence logic.
- [consent.md](./consent.md): Human-in-the-Loop (HITL) tool permissions.

### Customization & Ops
- **[customization.md](./customization.md)**: Overriding Planners, Storage, and adding Security Middlewares.
- **[cli.md](./cli.md)**: Command-line reference for the daemon and one-shot execution.

## 🏗️ Architecture Philosophy
1. **Agnostic Core**: The "Brain" is decoupled from I/O and Storage.
2. **Registry Pattern**: Every capability (Tool, Skill, Provider) is managed by a dedicated registry.
3. **Pluggable**: All side-effects are handled by Plugins to keep the core code pure.
