// DEPRECATED — dead code. Written during the Pass-1 harness attempt, before
// the MCP server existed, when the tool was defined inline as a Copilot SDK
// `Tool`. The tool now lives in the MCP server
// (mcp-servers/quotes-server/tools/add-quote.ts) and harness/run.ts talks to
// that server over MCP — nothing imports this file. Kept for reference; safe
// to delete.

import type { Tool } from "@github/copilot-sdk";

export interface AddQuoteInput {
  text: string;
  author?: string;
  source?: string;
  category: string;
}

interface AddQuoteResult {
  id?: string;
  status?: string;
}

export const addQuoteTool: Tool<AddQuoteInput> = {
  name: "add_quote",
  description:
    "Save a new quote to the Daily Dose collection. Use when the user asks to add, save, or record a quote.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The full text of the quote.",
        maxLength: 2000,
      },
      author: {
        type: "string",
        description: "Who said or wrote the quote. Optional.",
      },
      source: {
        type: "string",
        description: "Where the quote came from (book, speech, article, etc.). Optional.",
      },
      category: {
        type: "string",
        description:
          "Theme or category for the quote (e.g. 'motivation', 'resilience', 'courage'). Required.",
        maxLength: 100,
      },
    },
    required: ["text", "category"],
  },
  handler: async (args) => {
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

    const result = (await res.json()) as AddQuoteResult;
    const attributedTo = args.author ? ` by ${args.author}` : "";
    return `Saved quote${attributedTo}: "${args.text}"${
      result?.id ? ` (id: ${result.id})` : ""
    }`;
  },
};
