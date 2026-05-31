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

registerAddQuote(server);
registerUpdateQuote(server);
registerDeleteQuote(server);
registerReadQuotes(server);

await server.connect(new StdioServerTransport());
