# Learning Machine Plugin

Bundled OpenClaw plugin that injects mandatory `/recall` and `/process` calls into **every agent turn** via the `before_prompt_build` hook. The agent automatically persists and retrieves user context across WhatsApp, Slack, Telegram, Discord, and Teams sessions.

## How it works

On every turn, before the model sees any message, the plugin injects instructions into the system prompt telling the agent to:

1. Call `POST /recall` → get prior cross-channel context from the Memory Bridge API
2. Reply to the user using that context
3. Call `POST /process` → persist what was learned from this interaction

The agent has no choice but to follow — it's a system-level instruction, not a suggestion.

## Requirements

- [agno-api](https://github.com/viniciusf-dev/learning-machine-api) running and reachable
- `~/.openclaw/openclaw.json` configured (see `openclaw.json.example` at repo root)

## Setup

**1. Start the Memory Bridge API**

```bash
cd ~/Documents/agno-api
docker compose up -d
```

**2. Start the OpenClaw gateway with the Learning Machine overlay**

```bash
cd ~/Documents/openclaw
OPENCLAW_IMAGE=ghcr.io/openclaw/openclaw:latest \
OPENCLAW_CONFIG_DIR=$HOME/.openclaw \
OPENCLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace \
docker compose -f docker-compose.yml -f docker-compose.learning-machine.yml up -d openclaw-gateway
```

**3. Verify the plugin loaded**

```bash
docker exec openclaw-openclaw-gateway-1 openclaw plugins list | grep learning
# Should show: Learning Machine | learning-machine | loaded
```

## Demo — End-to-End

All `agent` commands below use the same prefix — export it once to keep things clean:

```bash
export OPENCLAW_RUN="OPENCLAW_IMAGE=ghcr.io/openclaw/openclaw:latest \
  OPENCLAW_CONFIG_DIR=$HOME/.openclaw \
  OPENCLAW_WORKSPACE_DIR=$HOME/.openclaw/workspace \
  docker compose -f docker-compose.yml -f docker-compose.learning-machine.yml run --rm openclaw-cli agent --local"
```

**Step 1 — Introduce yourself (discord channel, session 001)**

```bash
eval "$OPENCLAW_RUN" --session-id demo-001 \
  --message "Oi! Me chamo Vinicius, moro em Curitiba, sou dev Python e estou construindo uma API de memória cross-channel com FastAPI e PostgreSQL."
```

**Step 2 — New session, same channel — confirm it remembered (session 002)**

```bash
eval "$OPENCLAW_RUN" --session-id demo-002 \
  --message "Qual cidade eu moro e o que estou construindo?"
```

**Step 3 — Different channel (telegram) — demonstrate cross-channel memory (session 003)**

```bash
eval "$OPENCLAW_RUN" --session-id demo-003 --channel telegram \
  --message "Me lembra: qual cidade eu moro e o que estou construindo?"
```

The agent in step 3 has never seen the messages from sessions 001 or 002 — but it knows the answers because the Memory Bridge API persists knowledge across sessions and channels.

## Verifying API calls

```bash
docker logs --since 60s agno-api | grep -E "Recalling|Processing|Recalled|processed"
```

You should see `/recall` and `/process` calls logged for every agent turn.

## Configuration

In `~/.openclaw/openclaw.json`:

```json
"plugins": {
  "entries": {
    "learning-machine": {
      "enabled": true,
      "hooks": { "allowPromptInjection": true },
      "config": {
        "apiUrl": "http://agno-api:8000",
        "defaultChannel": "discord"
      }
    }
  }
}
```

| Field | Description |
|---|---|
| `apiUrl` | Base URL of the Memory Bridge API. Falls back to `LEARNING_MACHINE_API_URL` env var. |
| `defaultChannel` | Fallback channel when the runtime doesn't provide one. One of: `discord`, `slack`, `telegram`, `whatsapp`, `teams`. |
