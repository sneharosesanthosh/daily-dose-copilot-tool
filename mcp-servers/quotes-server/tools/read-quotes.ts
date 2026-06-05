import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerReadQuotes(server: McpServer) {
    server.registerTool(
        "read_quotes",
        {
            description: "Fetch quotes from the Daily Dose collection, optionally filtered by category or author. Use when the user asks to see, read, or list saved quotes.",
            inputSchema: {
                category: z
                    .string()
                    .max(100)
                    .optional()
                    .describe("Filter quotes by this category. Optional."),
                author: z
                    .string()
                    .max(100)
                    .optional()
                    .describe("Filter quotes by this author. Optional.")
            }
        },
        async (args) => {
            const baseUrl = process.env.DAILY_DOSE_API_URL;
            const token = process.env.DAILY_DOSE_API_TOKEN;

            if (!baseUrl) {
                throw new Error("DAILY_DOSE_API_URL is not set");
            }

            const params = new URLSearchParams();
            if (args.category) params.set("category", args.category);
            if (args.author) params.set("author", args.author);

            const query = params.toString();
            const url = `${baseUrl}/api/quotes${query ? `?${query}` : ""}`;

            const res = await fetch(url, {
                method: "GET",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`Daily Dose API error ${res.status}: ${body}`);
            }

            const rows = (await res.json()) as Array<Record<string, unknown>>;

            // Explicitly map to the fields an agent reasons about. Keeps the
            // payload small and insulates the tool from DB column changes.
            const quotes = rows.map((q) => ({
                id: q.id,
                text: q.text,
                author: q.author,
                category: q.category
            }));

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(quotes, null, 2)
                    }
                ]
            };
        }
    );
}