import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAddQuote } from "./tools/add-quote.js";
import { registerUpdateQuote } from "./tools/update-quote.js";
import { registerDeleteQuote } from "./tools/delete-quote.js";
import { registerReadQuotes } from "./tools/read-quotes.js";

const server = new McpServer({
  name: "quotes-server",
  version: "0.1.0",
});

// Server-side tool allow-list — enforced at the SOURCE. Unlike the client-side
// allow-lists (.claude/settings.json, QUOTES_ALLOWED_TOOLS in the harness), a
// tool that isn't enabled here is never registered, so NO client — Claude Code,
// the harness, Claude Desktop — can call it. This locks the "agent door".
// (It does NOT stop a direct HTTP call (through Bash curl) to the Daily Dose API — that boundary
// lives in Daily Dose itself, via auth/authorization on the route.)
//
//   QUOTES_ENABLED_TOOLS="add_quote,read_quotes,update_quote"   # block delete everywhere
//
// Unset = every tool enabled (default).
const ALL_TOOLS = {
  add_quote: registerAddQuote,
  read_quotes: registerReadQuotes,
  update_quote: registerUpdateQuote,
  delete_quote: registerDeleteQuote,
};

const raw = process.env.QUOTES_ENABLED_TOOLS;
const enabled = raw
  ? new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))
  : new Set(Object.keys(ALL_TOOLS));

const registered: string[] = [];
for (const [name, register] of Object.entries(ALL_TOOLS)) {
  if (enabled.has(name)) {
    register(server);
    registered.push(name);
  }
}

// stderr is safe to log to (stdout is reserved for JSON-RPC). Confirms the gate.
console.error(`quotes-server: registered tools -> ${registered.join(", ")}`);

await server.connect(new StdioServerTransport());
