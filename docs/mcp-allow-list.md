# MCP allow-list — annotated reference

JSON can't hold comments, so this file explains every line in
[`.mcp.json`](../.mcp.json) and [`.claude/settings.json`](../.claude/settings.json).
They are the **checked-in, reviewable** way to (1) register the quotes MCP
server and (2) scope which of its tools the agent may call (least privilege).

The one load-bearing name across both files is **`quotes`** — the server key.
Change it in one place and you must change it everywhere it appears below.

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

## How to verify

Claude Code reads both files **at startup**, so changes need a restart:

1. `set -a; source .env; set +a`   (load the env the server needs)
2. Restart Claude Code in this project.
3. `/mcp` should list the `quotes` server.
4. A `delete_quote` attempt should be refused (blocked by the deny rule),
   while add / read / update work.
