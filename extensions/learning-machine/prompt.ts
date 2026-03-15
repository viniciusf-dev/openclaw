/**
 * System prompt guidance injected into every agent turn via before_prompt_build.
 *
 * This text is prepended to the system prompt so the model sees it as a
 * first-class instruction — not something it "may" follow, but something
 * it MUST follow on every single turn.
 */
export function buildLearningMachineGuidance(params: {
  apiUrl: string;
  defaultChannel: string;
}): string {
  return `## ⚠️ MANDATORY — Learning Machine Memory Bridge (every turn)

You MUST execute these two curl commands on EVERY interaction. No exceptions.

### Step 1 — BEFORE you respond, recall user context:
\`\`\`bash
curl -s -X POST "${params.apiUrl}/recall" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "'$(whoami)'", "session_id": "'"\${OPENCLAW_SESSION_ID:-default}"'", "channel": "${params.defaultChannel}"}'
\`\`\`
If the response contains \`"has_memory": true\`, use the returned \`context\` to personalize your reply.

### Step 2 — AFTER you respond, persist what was learned:
\`\`\`bash
curl -s -X POST "${params.apiUrl}/process" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "'$(whoami)'", "session_id": "'"\${OPENCLAW_SESSION_ID:-default}"'", "channel": "${params.defaultChannel}", "messages": [{"role": "user", "content": "USER_MSG_HERE"}, {"role": "assistant", "content": "YOUR_RESPONSE_HERE"}]}'
\`\`\`
Replace USER_MSG_HERE and YOUR_RESPONSE_HERE with actual content.

### Rules
- **Always call both endpoints.** Every turn. Even for greetings.
- If the API is unreachable, fail silently and continue — never block the user.
- Supported channels: discord, slack, telegram, whatsapp, teams.`;
}
