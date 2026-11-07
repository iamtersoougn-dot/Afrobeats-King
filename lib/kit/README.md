# Naija life-sim kit

Shared, game-agnostic pieces for the Naija life-sim games (Campus to Camp, Japa Journey, and the rest).
Copy this whole folder into another game **unchanged**. Each game writes its own settings file
(Campus to Camp's is `lib/game/kit.config.ts`) and a little glue.

| File | What it gives you |
| --- | --- |
| `calendar.ts` | A Nigerian year: seasons, festivals (fixed dates, Easter worked out, Sallah from the moon), effects on prices, demand, mood, friendships and event odds. |
| `chill.ts` | Chill mode rules and word scales ("Sapa don land", "Tired", "On track for a 2:1"). |
| `routines.ts` | Quick do after N uses, routines after M uses, reward scaling. |

The kit has no React, no store, and imports nothing from a game. Days are counted from 1 Jan 2026.

## Pulling the kit into another game

1. **Copy** `lib/kit/` into the other game's repo at the same path.
2. **Write the settings file** (copy `lib/game/kit.config.ts` from Campus to Camp as a starting point):
   - `CALENDAR`: keep the festivals; change the seasons to fit the game (Japa might add "visa interview season" or "UK winter"). Use the game's own event ids in `effects.events` and `onlyIn`.
   - `DAYS_PER_TURN` and `START`: how long a turn is in that game, and when a new life starts.
   - `CHILL`: which events count as setbacks, which never happen, and the word scales.
   - `ROUTINES` and `NO_ROUTINE`: unlock numbers, and the actions that open mini-games.
3. **Add the save fields** to the player type: `chill?`, `calDay?`, `uses?`, `routines?`. All optional, so old saves still load.
4. **Migrate saves**: bump the persist version and fill the fields for old saves (Chill off, a calendar day worked out from the turn, empty uses and routines). Campus to Camp's `migratePlayer` in `lib/store.ts` shows how.
5. **Wire the engine** (search Campus to Camp for `chillOn(`, `effectsNow(` and `runRoutines(` to see every spot):
   - end of turn: run routines first, move the calendar on, greet new seasons and festivals, open a festival event;
   - living costs × `prices`, hustle earnings × `demand`, mood and health per turn;
   - random events: weight × `eventMult`, and Chill's setbacks/never lists;
   - every game-over, deadline, late fee, query or timer: skip or soften it when `chillOn(p)`.
6. **Wire the screens**: a Chill switch in Settings (and on character creation), words in the top bar,
   `softenText` on feeds and pop-ups, Quick do / routine buttons on action cards, the season strip on Home,
   and no clocks in timed mini-games.
7. **Test**: lint, type check, build, the life simulation with Chill on and off, an old save loading, and a phone playtest.

## Rules the kit expects games to keep

- Chill off must play exactly as before.
- Chill lives stay off the life leaderboard and show a "🌿 Chill life" badge.
- Routines never add competitive points (uni season, leaderboards).
- Festival dates: fixed dates and Easter are exact; Sallah dates are worked out from the moon and can be a day out, like real moon-sighting.
