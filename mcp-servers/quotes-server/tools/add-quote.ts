import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAddQuote(server: McpServer) {
  server.registerTool(
    "add_quote",
    {
      description:
        "Save a new quote to the Daily Dose collection. Use when the user asks to add, save, or record a quote.",
      inputSchema: {
        text: z
          .string()
          .max(2000)
          .describe("The full text of the quote."),
        author: z
          .string()
          .optional()
          .describe("Who said or wrote the quote. Optional."),
        source: z
          .string()
          .optional()
          .describe(
            "Where the quote came from (book, speech, article, etc.). Optional.",
          ),
        category: z
          .string()
          .max(100)
          .describe(
            "Theme or category for the quote (e.g. 'motivation', 'resilience', 'courage'). Required.",
          ),
      },
    },
    async (args) => {
      const baseUrl = process.env.DAILY_DOSE_API_URL;
      const token = process.env.DAILY_DOSE_API_TOKEN;

      if (!baseUrl) {
        throw new Error("DAILY_DOSE_API_URL is not set");
      }

      const res = await fetch(`${baseUrl}/api/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(args),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Daily Dose API error ${res.status}: ${body}`);
      }

      const result = (await res.json()) as { id?: string };
      const attributedTo = args.author ? ` by ${args.author}` : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `Saved quote${attributedTo}: "${args.text}"${
              result?.id ? ` (id: ${result.id})` : ""
            }`,
          },
        ],
      };
    },
  );
}
