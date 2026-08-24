# Repository Guidelines

## Project Structure & Module Organization

This repository contains an Expo/React Native application in `expo/` and its Supabase backend in `supabase/`.

- `expo/app/` contains Expo Router screens; tab screens live in `expo/app/(tabs)/`.
- `expo/contexts/` owns shared Supabase-backed state (users, vehicles, work orders, notifications).
- `expo/types/` contains app models and the hand-maintained Supabase database types.
- `expo/lib/` holds Supabase and tRPC setup; `expo/utils/` contains integrations such as WhatsApp links.
- `supabase/migrations/` is the authoritative, ordered database-change history. Edge Functions are in `supabase/functions/<function>/index.ts`.
- `supabase/diagnostics/` contains read-only verification queries. Do not put production schema changes there.

## Build, Test, and Development Commands

Run commands from `expo/` unless noted otherwise:

```bash
/home/fernando/.bun/bin/bunx rork start -p 236sgdy8uu692h0fnu0p2 --tunnel
/home/fernando/.bun/bin/bun run lint
/home/fernando/.bun/bin/bunx tsc --noEmit
```

The first command starts Expo Go with a tunnel and prints a QR code. Lint and type-check must pass before handoff. There is currently no automated test suite; validate changed role flows manually in Expo Go.

Deploy an Edge Function from the repository root only after reviewing it:

```bash
npx supabase@latest functions deploy manage-budget --use-api
```

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, single quotes in application files, and explicit domain types from `expo/types/index.ts`. Components/screens use PascalCase exports; hooks and helpers use camelCase. Keep database fields in `snake_case` and map them at the context boundary to camelCase app models. Prefer existing context APIs over direct Supabase calls from screens.

## Database, Security & Configuration

Create a new, timestamp-prefixed migration such as `20260822_018_feature_name.sql`; never edit a migration that may already have run in Supabase. Preserve RLS, workshop isolation, and role checks. Never expose service-role keys or copy `.env`; use `.env.example` for new configuration names. Public approval endpoints must use random, expiring tokens and `verify_jwt = false` only when deliberately designed for unauthenticated access.

## Commits & Pull Requests

This checkout has no usable commit-history convention. Use concise imperative commits, for example `feat: add budget approval notification`. PRs should explain the role/workshop impact, list migrations and Edge Function deployments, link the issue when available, and include screenshots for mobile UI changes. State the exact manual verification performed.
