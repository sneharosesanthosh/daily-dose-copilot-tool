import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDeleteQuote(server: McpServer) {
  server.registerTool(
    "delete_quote",
    {
      description:
        "Delete a quote from the Daily Dose collection by id. Use when the user asks to remove or delete a saved quote.",
      inputSchema: {
        id: z
          .number()
          .int()
          .positive()
          .describe("The numeric id of the quote to delete. Required."),
      },
    },
    async (args) => {
      const baseUrl = process.env.DAILY_DOSE_API_URL;
      const token = process.env.DAILY_DOSE_API_TOKEN;

      if (!baseUrl) {
        throw new Error("DAILY_DOSE_API_URL is not set");
      }

      const res = await fetch(`${baseUrl}/api/quotes/${args.id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Daily Dose returns 204 No Content on success — no body to parse.
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Daily Dose API error ${res.status}: ${body}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Deleted quote ${args.id}.`,
          },
        ],
      };
    },
  );
}
