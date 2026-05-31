import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerUpdateQuote(server: McpServer) {
  server.registerTool(
    "update_quote",
    {
      description:
        "Update an existing quote in the Daily Dose collection. Only the fields you provide are changed. Use when the user asks to edit, change, or correct a saved quote.",
      inputSchema: {
        id: z
          .number()
          .int()
          .positive()
          .describe("The numeric id of the quote to update. Required."),
        text: z
          .string()
          .max(2000)
          .optional()
          .describe("New quote text. Optional — omit to leave unchanged."),
        author: z
          .string()
          .optional()
          .describe("New author. Optional — omit to leave unchanged."),
        source: z
          .string()
          .optional()
          .describe("New source. Optional — omit to leave unchanged."),
        category: z
          .string()
          .max(100)
          .optional()
          .describe("New category. Optional — omit to leave unchanged."),
      },
    },
    async (args) => {
      const baseUrl = process.env.DAILY_DOSE_API_URL;
      const token = process.env.DAILY_DOSE_API_TOKEN;

      if (!baseUrl) {
        throw new Error("DAILY_DOSE_API_URL is not set");
      }

      const { id, ...fields } = args;

      const res = await fetch(`${baseUrl}/api/quotes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Daily Dose API error ${res.status}: ${body}`);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Updated quote ${id}.`,
          },
        ],
      };
    },
  );
}
