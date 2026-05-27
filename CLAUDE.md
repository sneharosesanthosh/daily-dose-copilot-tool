# Working with Claude on this project

This file gives AI agents (Claude Code sessions, etc.) the context they
need to work on this project effectively. Read this before making
suggestions or changes. For the project overview, see
[README.md](./README.md).

## Working preferences

These are non-negotiable:

1. **Announce each operation before running it.** Never bundle. Vague
   phrasing like "let me set up the workspace" is forbidden — name each
   step ("I'm going to run `git init` now"). Visibility ≠ authorization.
2. **Never read, display, or log `.env` contents aloud.** Reference key
   names only.
3. **Concise > verbose.** Don't summarize what you just did at the end of
   every reply.
4. **Don't propose code edits for runtime errors that a server restart
   can fix.** Ask about restart first.

## What this project actually is

A **GitHub Copilot CLI extension** at
`.github/extensions/quotes/extension.mjs` that registers an `add_quote`
tool. When a user runs Copilot CLI inside this repo, the extension is
auto-discovered and the local Copilot agent can call `add_quote`, which
POSTs to the Daily Dose REST API.

**NOT** a Copilot Chat `@-agent` (that's a separate product — GitHub
Apps / Copilot Marketplace Extensions — built with a different SDK).
The [docs/gaps.md](./docs/gaps.md) file traces how we worked out the
distinction.

## Conceptual framing

- **Tool** — something the agent can *call* (function + JSON Schema).
  Our `add_quote`.
- **Skill** — knowledge/instructions *preloaded* into the agent's
  context (text content). Not used here.
- **Extension** — the `.mjs` package registering tools and hooks.
  Our `extension.mjs`.
- **Harness** — an optional programmatic test driver using
  `CopilotClient`. Not built yet — see open follow-ups in
  [docs/gaps.md](./docs/gaps.md).
- **MCP server** — a separate process exposing tools to agents over the
  MCP protocol. Pass 2 will extract `add_quote` into one.
- **Daily Dose** — a Next.js web app. Neither agent nor extension nor
  MCP server. Just the REST API the tool calls.

## Two-pass plan

### Pass 1 — inline tool (current state)

Tool handler lives inline in
`.github/extensions/quotes/extension.mjs`. It calls Daily Dose's HTTP
API directly. Goal: learn the extension shape — `joinSession`, tool
registration, JSON Schema parameters, handler return values.

### Pass 2 — MCP server (next)

Extract `add_quote` into a separate MCP server process. The extension
consumes it via `joinSession({ mcpServers: { ... } })`. Daily Dose
itself does **not** become an MCP server — the MCP server is a separate
program that calls Daily Dose's HTTP API.

## Runtime constraints (from the SDK's agent-author.md)

- Extension files must be `.mjs` (no TypeScript yet).
- `stdout` is reserved for JSON-RPC — use `session.log()`, **not**
  `console.log()`.
- Tool names must be globally unique across all loaded extensions.
- Copilot CLI does **not** auto-load `.env`. Env vars must be in the
  shell before running `copilot`.

## Integration: Daily Dose API

The `add_quote` handler POSTs to `${DAILY_DOSE_API_URL}/api/quotes`.
During local development, Daily Dose runs on `http://localhost:3000`.
The exact endpoint may need to be added to Daily Dose if it doesn't yet
exist — confirm before relying on it.

## Running locally

Copilot CLI doesn't load `.env` automatically:

    set -a; source .env; set +a
    copilot

## Open follow-ups

- **Programmatic test harness** — small Node script using
  `CopilotClient` to drive the extension's tool end-to-end for fast
  iteration. Skipped in Pass 1; revisit when manual testing becomes
  painful.
- **Pass 2** — MCP server extraction.
- **Pin SDK version** — currently `@github/copilot-sdk: "latest"`. Pin
  once the SDK leaves public preview.
