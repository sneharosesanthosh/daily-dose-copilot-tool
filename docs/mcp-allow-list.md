# MCP allow-list — annotated reference

JSON can't hold comments, so this file explains every line in
[`.mcp.json`](../.mcp.json) and [`.claude/settings.json`](../.claude/settings.json) —
the **checked-in, reviewable** way to (1) register the quotes MCP server and
(2) scope which of its tools the agent may call (least privilege).

It also covers a **third** control that is *not* in those files: a **server-side
gate** (`QUOTES_ENABLED_TOOLS`) inside
[`mcp-servers/quotes-server/server.ts`](../mcp-servers/quotes-server/server.ts).
The difference between the client-side controls and that server-side gate is the
whole point — see the comparison table below.

The one load-bearing name across the two JSON files is **`quotes`** — the server
key. Change it in one place and you must change it everywhere it appears below.

---

## `.mcp.json` — registers the server

```jsonc
{
  "mcpServers": {           // map of every MCP server this project provides
    "quotes": {             // server KEY — becomes the mcp__quotes__* tool prefix
      "command": "npx",     // how to launch the server process...
      "args": ["tsx", "mcp-servers/quotes-server/server.ts"],  // ...run the TS server with tsx
      "env": {              // env passed to the server process (NO secrets in repo)
        "DAILY_DOSE_API_URL":   "${DAILY_DOSE_API_URL}",    // expanded from your shell at launch
        "DAILY_DOSE_API_TOKEN": "${DAILY_DOSE_API_TOKEN}"   // expanded from your shell at launch
      }
    }
  }
}
```

- **`mcpServers`** — top-level map; add more servers as sibling keys.
- **`quotes`** — the server's identifier. The host builds tool names as
  `mcp__` + this key + `__` + tool, e.g. `mcp__quotes__delete_quote`.
- **`command` / `args`** — the exact process to spawn (same shape the test
  harness uses). Path is relative to the repo root.
- **`env` with `${VAR}`** — values are pulled from the environment *at launch*,
  so the token never lives in the committed file. Load them first with
  `set -a; source .env; set +a`.

---

## `.claude/settings.json` — governs the tools (the allow-list)

```jsonc
{
  "permissions": {
    "allow": [                         // auto-approved: agent calls these WITHOUT a prompt
      "mcp__quotes__add_quote",        // create a quote — permitted
      "mcp__quotes__read_quotes",      // read quotes — permitted
      "mcp__quotes__update_quote"      // edit a quote — permitted
    ],
    "deny": [                          // hard-blocked: cannot run, even if allowed elsewhere
      "mcp__quotes__delete_quote"      // irreversible delete — denied (least privilege)
    ]
  },
  "enabledMcpjsonServers": ["quotes"]  // trust the .mcp.json server named "quotes" (skip the trust prompt)
}
```

- **`permissions.allow`** — these tools run automatically, no confirmation.
- **`permissions.deny`** — a hard block. **Deny always beats allow**, so a
  denied tool stays blocked no matter what. We deny `delete_quote` because it's
  the only irreversible action.
- **`enabledMcpjsonServers`** — answers a *different* question than the tool
  permissions: "may this server **start at all**?" Listing `quotes` here
  pre-approves the project server so Claude Code doesn't prompt on load.

### Two separate trust decisions (defense in depth)

| Question | Answered by |
| --- | --- |
| May the server **run at all**? | `enabledMcpjsonServers` |
| Which of its **tools** may the agent call? | `permissions.allow` / `permissions.deny` |

---

## `server.ts` — the server-side gate (`QUOTES_ENABLED_TOOLS`)

The two files above are **client-side** controls — each binds only the client
that reads it. The quotes server itself has a separate, stronger gate: it
registers a tool **only if it is listed in `QUOTES_ENABLED_TOOLS`**. A tool left
off the list is never registered, so it does not exist for *any* client.

```bash
# server registers only these three — delete_quote is never created
QUOTES_ENABLED_TOOLS="add_quote,read_quotes,update_quote" npm run harness:mcp
```

- **Unset = every tool enabled** (the default — opt-in, backward-compatible).
- On startup the server logs what it built, to **stderr** (stdout is reserved
  for JSON-RPC): `quotes-server: registered tools -> add_quote, read_quotes, update_quote`

### Client-side vs server-side — the core distinction

| Control | Lives in | Effect | Block message | Binds |
| --- | --- | --- | --- | --- |
| `QUOTES_ALLOWED_TOOLS` | harness (client) | client won't *call* the tool | `⛔ blocked by allow-list` | that one client |
| `.claude/settings.json` `deny` | Claude Code (client) | host filters the tool out | tool absent for the agent | Claude Code only |
| `QUOTES_ENABLED_TOOLS` | `server.ts` (server) | tool is never *registered* | `Tool delete_quote not found` | **every client** |

Client controls say *"don't call it"* — the tool still exists. The server gate
says *"it doesn't exist"* — gone for Claude Code, the harness, and Claude Desktop
all at once.

### The honest limit

The server gate blocks everything going **through the MCP server**. It does
**not** stop a direct HTTP call to the Daily Dose API (e.g.
`curl -X DELETE .../api/quotes/37`), which skips the MCP server entirely. That
boundary lives in Daily Dose itself.

### The actual professional way — auth/authorization at the API

`QUOTES_ENABLED_TOOLS` is **capability gating**: real and useful, but **coarse** —
a per-deployment on/off switch that is **identity-blind** (it can't say "Alice
may delete, Bob may not").

Professional server-side enforcement is **authentication + authorization checked
per request at the API** (the Daily Dose route): verify *who* is calling
(identity) and *whether they're allowed* (RBAC / token scopes), then reject
unauthorized actions. This is the **only** boundary that holds against *every*
path — any MCP client, a direct `curl`, or a future tool — because it's tied to
identity + permission, not to whether a tool happened to be registered.

Illustrative — where it would live in Daily Dose's `/api/quotes/[id]` DELETE
route (separate codebase, not this repo):

```ts
// app/api/quotes/[id]/route.ts (Daily Dose) — sketch
export async function DELETE(req, { params }) {
  const token = getBearer(req);
  if (!token || !hasScope(token, "quotes:delete")) {
    return new Response("Forbidden", { status: 403 }); // rejected regardless of client
  }
  // ...delete the quote...
}
```

Layering: the env gate (capability) is **defense-in-depth on top of** API auth —
not a replacement for it.

---

## How to verify

Claude Code reads both files **at startup**, so changes need a restart:

1. `set -a; source .env; set +a`   (load the env the server needs)
2. Restart Claude Code in this project.
3. `/mcp` should list the `quotes` server.
4. A `delete_quote` attempt should be refused (blocked by the deny rule),
   while add / read / update work.

**Server-side gate (no restart — straight through the harness):**

```bash
QUOTES_ENABLED_TOOLS="add_quote,read_quotes,update_quote" npm run harness:mcp -- delete_quote '{"id":1}'
```

Expect `Server exposes 3 tool(s)` and `Tool delete_quote not found`. Running
`npm run harness:mcp -- read_quotes` with no gate shows `4 tool(s)` again —
proving the env var is what removed the tool.
