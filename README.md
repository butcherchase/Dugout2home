# Dugout2Home

**Turn every game into a development plan.**

Dugout2Home is a softball development platform built around four connected engines:

1. Scorebook Analyzer
2. Individual Player Development
3. Practice Planner
4. Game / Tournament Recaps

## MVP architecture

- Next.js + TypeScript
- PostgreSQL + Prisma
- OpenAI Responses API for vision + structured scorebook extraction
- Railway-ready deployment

## Local setup

```bash
cp .env.example .env.local
npm install
npm run prisma:generate
npm run dev
```

Set `OPENAI_API_KEY`. A database is not required to preview the current UI; PostgreSQL persistence is the next wiring step.

## Core flow

`Scorebook image -> structured game analysis -> player/team development priorities -> practice plan -> recap -> next game`

## Implemented now

- Responsive product dashboard
- Scorebook image upload
- Vision analysis through OpenAI Responses API
- Strict structured output for game/player data
- Evidence-based development priorities
- AI-generated 75-minute practice plan
- Player development dashboard shell
- Tournament recap dashboard shell
- PostgreSQL/Prisma schema for users, teams, players, games, evaluations, practices, tournaments

## Next implementation phase

- Persist analyses to PostgreSQL
- Team/coach authentication
- Roster CRUD
- Match extracted player names to roster players
- Multi-game tournament aggregation
- Manual coach correction screen for low-confidence scorebook events
- Parent-facing player development view
- PDF/GameChanger import
