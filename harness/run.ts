import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { resolve } from "node:path";

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.error('Usage: npm run harness -- "your prompt here"');
  console.error(
    'Example: npm run harness -- "Save the quote \'Stay hungry, stay foolish\' by Steve Jobs about ambition"',
  );
  process.exit(1);
}

async function main() {
  const client = new CopilotClient();

  try {
    const session = await client.createSession({
      mcpServers: {
        quotes: {
          type: "stdio",
          command: "npx",
          args: ["tsx", resolve("mcp-servers/quotes-server/server.ts")],
          tools: ["*"],
        },
      },
      onPermissionRequest: approveAll,
    });

    const response = await session.sendAndWait({ prompt });

    console.log("=== Agent response ===");
    console.log(response?.data?.content ?? "(no content returned)");

    await session.disconnect();
  } finally {
    const errors = await client.stop();
    if (errors.length > 0) {
      console.error("Cleanup errors:", errors);
    }
  }
}

main().catch((err) => {
  console.error("Harness failed:", err);
  process.exit(1);
});
