# daily-dose-copilot-tool

A GitHub **Copilot CLI extension** that exposes tools for managing
curated quotes in the [Daily Dose](https://github.com/sneharosesanthosh/daily-dose)
app.

> **Note on naming:** this is a *Copilot CLI extension* (loaded by the
> local Copilot CLI when it runs in this repo), **not** a *Copilot
> Marketplace Extension* (the `@-mentionable` kind in Copilot Chat).
> Those are two different products built with different SDKs.
> See [docs/gaps.md](./docs/gaps.md) for the trace of how we worked out
> the distinction.

## Status

🚧 Pass 1 (inline tool) — scaffolded.
Pass 2 (MCP server extraction) — not started.

## What it does

When you run `copilot` inside this repo, Copilot CLI auto-discovers the
extension at `.github/extensions/quotes/extension.mjs` and loads it.
The extension registers an `add_quote` tool. You can then ask the agent
in natural language, e.g. *"Save the quote 'The only way out is through'
by Robert Frost"*, and it will call the tool, which POSTs the quote to
Daily Dose's REST API.

The extension itself doesn't store data — Daily Dose does.

## Architecture

```
$ copilot                                  (run in this repo)
       │
       ▼
  Copilot CLI
       │  (auto-discovers + loads)
       ▼
  .github/extensions/quotes/extension.mjs
       │  (registers `add_quote` tool)
       ▼
  agent calls add_quote({ text, author, category? })
       │  (HTTP POST)
       ▼
  Daily Dose REST API
       │
       ▼
  Postgres
```

Pass 2 will extract `add_quote`'s handler into a separate **MCP server**
process. The extension will consume it via `joinSession({ mcpServers })`
instead of running the HTTP call inline.

## Dependencies

- **Daily Dose** — required for the tool to function.
  Repo: <https://github.com/sneharosesanthosh/daily-dose>. Local clone
  expected at `../daily-dose` during development.
- **GitHub Copilot CLI** — required to load and run the extension.
- **GitHub Copilot subscription** — required to actually run Copilot CLI.
- **Node 18+** — needed by Copilot CLI itself for the SDK runtime
  (`fetch`, ESM, top-level `await`).

## Setup

1. `npm install` — installs `@github/copilot-sdk` (for IDE autocomplete
   on the extension's `import`).
2. `cp .env.example .env` and fill in `DAILY_DOSE_API_URL` and
   `DAILY_DOSE_API_TOKEN`.
3. Export the env vars in your shell — Copilot CLI does NOT auto-load
   `.env`:

   ```
   set -a; source .env; set +a
   ```

4. In another terminal, start Daily Dose on `http://localhost:3000`.
5. Run `copilot` in this repo. The extension auto-loads. Try:

   > Save the quote "The only way out is through" by Robert Frost.

## Project structure

```
.
├── .github/extensions/quotes/extension.mjs   ← the extension
├── docs/gaps.md                              ← decisions + open questions
├── .env.example                              ← required env vars
├── package.json                              ← npm metadata + SDK dep
├── README.md                                 ← you are here
└── CLAUDE.md                                 ← AI-agent collaboration notes
```
