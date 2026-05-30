import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAddQuote } from "./tools/add-quote.js";

const server = new McpServer({
  name: "quotes-server",
  version: "0.1.0",
});

registerAddQuote(server);

await server.connect(new StdioServerTransport());
