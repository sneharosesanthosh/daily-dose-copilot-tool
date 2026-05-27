# Docs gaps & resolutions — GitHub Copilot CLI extensions

A log of what was unclear in the official Copilot docs when we started,
what we learned by reading the SDK source, and what we ended up shipping.
Doubles as a study artifact for GH-600 Domain 2.

Initial source:
<https://docs.github.com/en/copilot/how-tos/copilot-sdk/use-copilot-sdk/custom-agents>

Last updated: 2026-05-26.

## Pass 1 — end-to-end verification (2026-05-26)

Pass 1 was verified end-to-end via the **programmatic harness path**
(see `harness/run.ts`) on 2026-05-26.

**Verified flow**:

1. Harness instantiated `CopilotClient`.
2. `client.createSession({ tools: [addQuoteTool], onPermissionRequest: approveAll })` succeeded.
3. Agent called `add_quote` in response to the prompt.
4. Handler ran in our process, POSTed to Daily Dose's `POST /api/quotes`.
5. Daily Dose returned `201` with `id: 26`.
6. Agent reported back: *"Successfully saved... with ID 26 and category 'perseverance'."*

**Schema gap surfaced during the run**: the `lookup.md` hand-off doc in
this project's root described the real Daily Dose API contract —
`category` is required (not optional), and there's a `source` field we
didn't have. The agent worked around the gap (inferred "perseverance")
but the schema was updated afterwards to match the real contract in
both `harness/tools/add-quote.ts` and `.github/extensions/quotes/extension.mjs`.

**Extension path status**: `.github/extensions/quotes/extension.mjs`
remains as a spec-compliant learning artifact but does **not** currently
load in Copilot CLI 1.0.51. The CLI's project-extension auto-discovery
is gated behind an experimental feature flag (`/experimental on`) that,
even when enabled, did not trigger extension scanning in our testing.
SDK is `1.0.0-beta.4` — the feature may stabilize in a future release.

## The big conceptual gap

**Gap:** The public docs page describes "custom agents" in language that
suggests they can be invoked as `@agent-name` in Copilot Chat. That is
not what the SDK actually builds.

**Resolution:** The `@github/copilot-sdk` package builds **Copilot CLI
extensions** — `.mjs` files at `.github/extensions/<name>/extension.mjs`
that the *local* Copilot CLI auto-discovers and loads when it runs in
that repo. The "custom agents" feature inside this SDK is named
sub-personas you can switch between *inside a CLI session*, not
separately-invocable chat agents.

The `@-agent in Copilot Chat` product is a *separate* thing —
GitHub Apps / Copilot Marketplace Extensions, built with a different
SDK (we did not investigate it; out of scope).

We confirmed the CLI-extension framing by reading the SDK's own author
guide at `node_modules/@github/copilot-sdk/docs/agent-author.md` after
installing the package.

## Resolved gaps

### 1. Custom tool definition format — RESOLVED

The public docs only showed pre-built tool names
(`["grep", "glob", "view"]`). We assumed user-authored tools followed a
`{name, description, parameters, execute}` convention.

The SDK confirmed the shape is `{name, description, parameters (JSON
Schema), handler: async (args, invocation) => ...}`. Handler returns a
string (success) or `{textResultForLlm, resultType}` (structured).
Throwing inside the handler sends a failure. There's also a `defineTool`
helper exported for Zod schema type inference.

### 2. Chat registration / `@agent` invocation — RESOLVED (different product)

Not covered in the public docs because this SDK does not provide it.
The chat `@-agent` product is GitHub Apps / Copilot Marketplace
Extensions — separate SDK, out of scope for this project.

### 3. CopilotClient initialization / auth — RESOLVED

`CopilotClient` is what we ended up using for the harness path.
Constructor accepts `CopilotClientOptions` — key relevant field is
`gitHubToken` (not `token`). For this project we instantiated it with
no options and it auto-detected auth from `gh auth` / existing VS Code
Copilot session.

### 4. Session lifecycle — RESOLVED

The session object returned from `client.createSession(...)` exposes
`send`, `sendAndWait`, event subscriptions via `on`, and `disconnect`.
The harness uses `sendAndWait` to fire a prompt and block until
`session.idle`, then `disconnect`. Cleanup is done by `client.stop()`.

### 5. SDK version — DOCUMENTED

Installed `@github/copilot-sdk` resolved to **`1.0.0-beta.4`** at the
time of writing. Still public preview. Worth pinning to a specific
version once GA.

## Other notable learnings

- **Copilot CLI 1.0.51 auto-reads `CLAUDE.md`** as a custom instruction
  file (alongside `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`,
  etc.). So anything we put in `CLAUDE.md` is fed to the live Copilot
  agent's context every session. Cross-tool convergence on `*.md` instruction
  files is real.
- **Extension auto-discovery requires a git root**. `.github/extensions/`
  is scanned relative to the git root, so non-git directories never get
  scanned. `git init` was required just for the CLI to even consider
  looking.
- **`stdout` is reserved for JSON-RPC** in extension processes. Use
  `session.log()` from the SDK, never `console.log()`.

## Open follow-ups

- **Pass 2 — MCP server extraction**: move `add_quote`'s handler into a
  separate MCP server process; consume it via
  `joinSession({ mcpServers: { quotes: { ... } } })` (extension path) or
  `SessionConfig.mcpServers` (harness path). The SDK supports MCP
  servers natively at both session and custom-agent level.
- **Multi-tool routing (Scope B from lookup.md)**: add `list_quotes`,
  `search_quotes`, `delete_quote`. Demonstrates the agent choosing
  between tools. Requires those endpoints to exist on Daily Dose.
- **Extension auto-discovery on a stable CLI release**: retest the
  `.github/extensions/quotes/extension.mjs` path once SDK leaves beta
  and the `EXTENSIONS` experimental flag is GA.
- **Pin SDK version**: replace `"latest"` in `package.json` with a
  specific version once SDK is GA.
