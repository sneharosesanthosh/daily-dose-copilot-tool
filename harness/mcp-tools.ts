// Free, quota-free harness: call the quotes tools directly.
//
// harness/run.ts drives a real Copilot session — the model reads your prompt
// and decides which tool to call, which costs quota. This script skips all
// that: it starts the quotes server as a helper program and calls each tool by
// name itself. No model, no Copilot, no quota — just a fast way to test the
// CRUD tool code on its own.
//
// Usage:
//   npm run harness:mcp                       # run a full add→read→update→delete cycle
//   npm run harness:mcp -- read_quotes                       # call one tool, no args
//   npm run harness:mcp -- add_quote '{"text":"Hi","category":"test"}'  # one tool + JSON args

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

// The helper program we start doesn't automatically receive our environment
// variables. The tools need DAILY_DOSE_API_URL/TOKEN, so pass the current env
// through explicitly, dropping undefined values to satisfy the type.
function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return env;
}

// Client-side MCP allow-list. The host (this harness) — not the server —
// decides which tools may be used, mirroring how Copilot CLI / Claude Desktop
// enforce an allow-list in *their* config. Set QUOTES_ALLOWED_TOOLS to a
// comma-separated list to restrict; leave it unset to allow every tool.
//
//   QUOTES_ALLOWED_TOOLS="add_quote,read_quotes" npm run harness:mcp
//
// Returns null when no allow-list is configured (everything permitted).
function allowedTools(): Set<string> | null {
  const raw = process.env.QUOTES_ALLOWED_TOOLS;
  if (!raw) return null;
  const names = raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return new Set(names);
}

function isAllowed(allow: Set<string> | null, name: string): boolean {
  return allow === null || allow.has(name);
}

// Pull the plain-text part out of a tool's result so we can print it.
function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  return (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("\n");
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  allow: Set<string> | null,
): Promise<string> {
  console.log(`\n→ ${name}(${JSON.stringify(args)})`);
  if (!isAllowed(allow, name)) {
    const msg = `⛔ blocked by allow-list — "${name}" is not in QUOTES_ALLOWED_TOOLS`;
    console.log(msg);
    return msg;
  }
  const result = (await client.callTool({ name, arguments: args })) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = textOf(result);
  console.log(text || "(no text content)");
  return text;
}

// Full CRUD smoke cycle. add_quote echoes "(id: N)" on success, so we read that
// id back out to drive update_quote and delete_quote. If no id came back, we
// skip the mutations rather than guess at one.
async function runCrudCycle(client: Client, allow: Set<string> | null) {
  const added = await callTool(
    client,
    "add_quote",
    {
      text: "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
      category: "harness-smoke-test",
    },
    allow,
  );

  await callTool(client, "read_quotes", { category: "harness-smoke-test" }, allow);

  const id = added.match(/\(id:\s*(\d+)\)/)?.[1];
  if (!id) {
    console.log(
      "\n⚠ add_quote returned no id — skipping update_quote and delete_quote.",
    );
    return;
  }

  await callTool(
    client,
    "update_quote",
    { id: Number(id), category: "harness-smoke-test-updated" },
    allow,
  );
  await callTool(client, "delete_quote", { id: Number(id) }, allow);
}

async function main() {
  if (!process.env.DAILY_DOSE_API_URL) {
    console.warn(
      "⚠ DAILY_DOSE_API_URL is not set — every tool call will fail.\n" +
        "  Run:  set -a; source .env; set +a   before this harness.\n",
    );
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", resolve("mcp-servers/quotes-server/server.ts")],
    env: childEnv(),
  });

  const client = new Client({ name: "mcp-tools-harness", version: "0.1.0" });

  try {
    await client.connect(transport);

    const allow = allowedTools();

    const { tools } = await client.listTools();
    console.log(
      `Connected. Server exposes ${tools.length} tool(s): ${tools
        .map((t) => t.name)
        .join(", ")}`,
    );

    // An allow-list hides the tools the host won't permit, so the agent only
    // ever "sees" the approved subset. Mirror that here.
    if (allow) {
      const visible = tools.filter((t) => allow.has(t.name)).map((t) => t.name);
      const hidden = tools.filter((t) => !allow.has(t.name)).map((t) => t.name);
      console.log(
        `Allow-list active. Agent sees ${visible.length}: ${
          visible.join(", ") || "(none)"
        }${hidden.length ? `  |  hidden: ${hidden.join(", ")}` : ""}`,
      );
    }

    // Single-tool mode: `harness:mcp -- <tool> '<json args>'`
    const [toolName, rawArgs] = process.argv.slice(2);
    if (toolName) {
      const args = rawArgs ? JSON.parse(rawArgs) : {};
      await callTool(client, toolName, args, allow);
    } else {
      await runCrudCycle(client, allow);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Harness failed:", err);
  process.exit(1);
});
