# LinkedIn Bot

AI-powered bot for analyzing LinkedIn profiles and pages.

## Project Structure

```
linkedin_bot/
├── PROJECT.md                  ← Master context (read this first each session)
├── backend/
│   ├── n8n-architecture.md     ← n8n workflow design & logic
│   └── api-config.md           ← API endpoints, credentials structure
├── linkedin/
│   ├── scoring/
│   │   └── methodology.md      ← LinkedIn page scoring methodology
│   └── prompts/
│       └── prompts.md          ← All AI prompts (full text)
├── bot/
│   ├── strategy/
│   │   └── marketing-strategy.md ← Marketing strategy & bot logic
│   └── messages/
│       └── message-scripts.md  ← All bot message scripts
└── artifacts/                  ← Code, JSON configs, n8n exports
```

## How to Work With Claude

At the start of each session:
1. Open this repo folder in Cowork
2. Tell Claude: "read PROJECT.md and continue"

Claude will read the context and pick up from where we left off.
