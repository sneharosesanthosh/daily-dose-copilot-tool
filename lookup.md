Hand-off: GitHub Copilot Custom Agent
You're picking up a project for GH-600 (Microsoft "Developing in Agentic AI Systems") cert prep. Build a GitHub Copilot custom agent in this folder. The agent's job is to let users add curated quotes to an existing web app (called daily-dose) by chatting with Copilot.

Example interaction the agent should support:


User in Copilot Chat: @daily-dose add a Maya Angelou quote about courage
Agent: ✅ Added quote #42 — "You may encounter many defeats..." (Maya Angelou, category: courage)
Target API (already built in a separate repo)
The daily-dose app exposes the endpoint you'll be calling:


POST http://localhost:3000/api/quotes          (dev — daily-dose runs on user's localhost)
Authorization: Bearer <AGENT_API_KEY>
Content-Type: application/json

{
  "text":     "string, required, ≤2000 chars",
  "author":   "string, optional",
  "source":   "string, optional",
  "category": "string, required, ≤100 chars"
}

Returns:
  201 → created quote object
  400 → { error: "<validation message>" }
  401 → { error: "Unauthorized" }
The user will give you the AGENT_API_KEY value (it's in their daily-dose .env, gitignored). Do NOT ask them to paste secrets into chat — have them put it in a .env in this project and load it via dotenv.

In production daily-dose runs on Vercel — get the URL from the user when needed.

Scope plan — build in this order (do NOT skip ahead)
Scope A — Single-tool: add_quote (START HERE)
Define one tool: add_quote(text, author?, source?, category)
Agent parses user's NL message into those fields, calls POST /api/quotes, returns a friendly confirmation
Demonstrates: tool calling, structured extraction from NL, external API integration
Effort: 2–3 hours once webhook plumbing works
Scope B — Multi-tool: CRUD (after A is solid)
Tools: add_quote, list_quotes, search_quotes, delete_quote
Agent routes between tools based on user intent
⚠️ list/search/delete endpoints don't exist yet in daily-dose — either ask the user to add them, or scope this to add_quote + list_quotes only
Demonstrates: tool routing (agent must choose between tools)
Effort: ~1 day after A
Scope C — Smart curator (DEFER — likely skip)
High-level tool: "given a theme, find and add 5 good quotes"
Web search → dedupe against existing → pick best → batch add
Demonstrates: chained tool use, multi-step planning
Effort: ~2 days. Probably overkill for the exam — only if time allows after B
Why this order
YAGNI: the hard part is the Copilot webhook + auth plumbing, not the tool count. Don't build B until A's plumbing is proven.
Two-way door: A → B is mechanical (add tool defs); B → A is wasted work
Asymmetric risk: if A breaks, one debug surface; B has four
Open decisions to resolve with the user BEFORE coding
Decision	Recommendation	Why
Local agent + ngrok, or deployed agent?	Local + ngrok	Faster iteration; free; Copilot just needs a public webhook URL
Language?	Node.js + Express (or Fastify)	User knows it from daily-dose
LLM for parsing NL?	Copilot's built-in API	Canonical Copilot-extension pattern; tested on GH-600
daily-dose reachable from agent?	Both local during dev	Avoid extra deploy step; switch to Vercel URL later
Working style the user expects (important)
Announce every operation before running it. No bundling under vague phrases like "let me set things up" — they want to see each git/file/command step in plain English first.
Coach through design decisions — when there are multiple plausible paths, lay out options + tradeoffs + a recommendation with reasoning. Don't just pick silently.
They are learning. Explain architectural decisions as you make them. They've recently learned about: Server Actions vs API routes, SSR/hydration timing, reversibility (one-way vs two-way doors), YAGNI, asymmetric risk. You can build on those.
Tight responses. They prefer concise explanations over long ones; trim aggressively. Use tables and structure.
Suggested first 5 steps
Confirm the 4 open decisions above with the user
Scaffold a Node + Express server with POST /webhook
Walk them through registering a GitHub App as a Copilot Extension (manual GitHub UI step)
Get a "hello world" round-trip working (Copilot → your webhook → text back to chat) — no tools yet
Only then add the add_quote tool — Scope A
Don't add Scope B's tools until A is end-to-end working and the user confirms.