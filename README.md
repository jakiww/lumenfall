# LUMENFALL

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/jakiww/lumenfall/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/jakiww/lumenfall/reward.svg)](https://make.fun/bounty/best-game-01)

**LUMENFALL** — you are the last Lumen Keeper. Your lantern is your weapon
and your light. Hold the arena against ten waves of the Gloom, gather
embers from the fallen, choose blessings between waves, and slay
**The Gloom** on wave 10.

## Play

Serve `game/` with any static server and open `game/index.html` in a
desktop browser. No network requests, no build step — plain Canvas 2D.

- **WASD / arrows** — move
- **Mouse** — aim · **hold click** — shoot lantern bolts
- **Space** — dash (brief invulnerability, short cooldown)
- **P** — pause · **M** — mute

## The loop

- **Waves 1–10**, growing difficulty: shades, skitters, spitters, brutes
  and wisps, elites from wave 4, and the boss **The Gloom** on wave 10.
- **Embers** drop from kills — magnet-pick them up for score.
- **Between waves, choose 1 of 3 upgrades**: damage, fire rate, multishot,
  dash cooldown, max HP, lantern radius, move speed, ember magnet.
- **Win** by clearing wave 10. **Lose** when your light goes out.
- Best score is saved in `localStorage`.

## Sound

All sound is synthesized with WebAudio — no audio files. SFX for shooting,
hits, kills, pickups, dashes, waves and the boss, plus a slow ambient
music loop.

## Files

One clear job per file, all plain Canvas 2D, no libraries:

- `game/index.html` — page + canvas
- `game/src/main.js` — bootstrap, fixed-step loop, mode switching
- `game/src/player.js` — the Lumen Keeper: move, dash, shoot, draw
- `game/src/enemies.js` — five enemy kinds, elites, and The Gloom (boss)
- `game/src/waves.js` — the ten-wave director and spawn pacing
- `game/src/upgrades.js` — the eight between-wave blessings
- `game/src/particles.js` — sparks, damage numbers, ember pickups
- `game/src/audio.js` — synthesized SFX + ambient music loop
- `game/src/input.js` — keyboard + mouse state
- `game/src/ui.js` — HUD, title, upgrades, pause, win / game over
- `game/src/shots.js` — deterministic `?shot=` scenes for screenshots
- `main.ts` — copies `game/` + `screenshots/` to `/output`, writes `dossier.json`

## Entry

Built for the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01)
— play it on [make.fun](https://make.fun/?ref=ybsp0vay).
