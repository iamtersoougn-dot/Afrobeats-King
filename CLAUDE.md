# Afrobeats King

Before doing anything in this repo, read `DESIGN_NOTES.md`. It has the game rules, code map, decisions and what's next.
Also read `AGENTS.md` (Next.js 16 has breaking changes).

This game keeps its own identity (name, story, places, look, humour). Campus to Camp (`iamtersoougn-dot/campus-to-camp`) is the reference for systems and code patterns, never for names, places, art or story.

At the end of every session:
1. Run `npm run lint`, `npx tsc --noEmit` and `npm run build`.
2. Run the balance bot (`npm run balance`) when rules or data changed. It must report no stuck runs and no missing events.
3. Run the phone playtest (`node scripts/playtest.mjs`) when screens changed.
4. Update `DESIGN_NOTES.md`: decision log, current status, what's next.

Never commit secrets or personal emails; use environment variables (see `.env.example`). Commit as the GitHub no-reply address.
