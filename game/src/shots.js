// shots.js — deterministic screenshot scenes for LUMENFALL.
// One job: build a fixed, seeded scene for ?shot=title|play|boss|win
// with no wall clock, then leave the game frozen for capture. The main
// loop never runs in shot mode; this file steps the simulation itself.

import { createPlayer } from './player.js';
import { spawnEnemy, createBoss } from './enemies.js';
import { burst, spawnEmber } from './particles.js';

const STEP = 1 / 60;

/** A fake input that plays the scene the same way every time. */
function scriptedInput(game, aimAt) {
  let t = 0;
  return {
    mouse: { x: aimAt.x, y: aimAt.y, down: true, inside: true },
    isDown() {
      return false;
    },
    wasPressed() {
      return false;
    },
    moveVector() {
      // Slow orbit around the arena center so the keeper is mid-stride.
      t += STEP;
      return { x: Math.cos(t * 0.9) * 0.7, y: Math.sin(t * 0.9) * 0.7 };
    },
    endFrame() {},
    destroy() {},
  };
}

/** Run the playing simulation for `steps` fixed steps with scripted input. */
function stepScene(game, steps) {
  for (let i = 0; i < steps; i++) {
    game.time += STEP;
    game.playTime += STEP;
    // Aim at the nearest enemy each step.
    let best = null;
    let bestD = Infinity;
    for (const e of game.enemies) {
      const d = Math.hypot(e.x - game.player.x, e.y - game.player.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) {
      game.input.mouse.x = best.x;
      game.input.mouse.y = best.y;
    }
    // Inline the playing update without importing main's private loop:
    // reuse the exported pieces through the game's own step function.
    game.stepPlaying(STEP);
  }
}

/** Build the requested scene. Called once, before the first render. */
export function buildShotScene(game, kind, seed) {
  const rng = game.rng;
  // Re-seed deterministically for the scene.
  let a = (seed * 2654435761) >>> 0;
  game.rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  if (kind === 'title') {
    game.mode = 'title';
    game.time = 2.5;
    game.best = 12480;
    // Fixed title embers.
    game.titleFx = [];
    for (let i = 0; i < 46; i++) {
      game.titleFx.push({
        x: game.rng() * 1280,
        y: game.rng() * 800,
        r: 1 + game.rng() * 2.6,
        vy: 8 + game.rng() * 22,
        drift: game.rng() * Math.PI * 2,
        a: 0.25 + game.rng() * 0.55,
        color: game.rng() < 0.7 ? '#ffbe50' : '#7fe8e0',
      });
    }
    game.frozen = true;
    return;
  }

  if (kind === 'play') {
    game.mode = 'playing';
    game.wave = 4;
    game.score = 4320;
    game.kills = 38;
    game.embers = 27;
    game.best = 12480;
    game.playTime = 96;
    game.time = 96;
    game.player = createPlayer();
    game.player.x = 640;
    game.player.y = 430;
    game.player.damage = 20;
    game.player.multishot = 2;
    game.player.lantern = 200;
    game.director = { queue: [], timer: 0, spawning: false };
    const spots = [
      ['shade', 420, 300, false],
      ['shade', 880, 320, false],
      ['skitter', 520, 560, false],
      ['skitter', 900, 580, true],
      ['spitter', 1060, 200, false],
      ['brute', 300, 620, false],
      ['wisp', 760, 180, false],
    ];
    for (const [kindName, x, y, elite] of spots) spawnEnemy(game, kindName, x, y, elite, game.rng);
    spawnEmber(game.fx, 560, 380, 1, game.rng);
    spawnEmber(game.fx, 720, 500, 1, game.rng);
    spawnEmber(game.fx, 660, 330, 2, game.rng);
    burst(game.fx, 480, 340, '#8a7bff', 12, 180, 0.5, 3, game.rng);
    game.input = scriptedInput(game, { x: 420, y: 300 });
    game.banner = { text: 'WAVE 4', sub: 'The dark stirs…', time: 1.6 };
    // Step past the banner's 1.6 s so the capture shows the fight, not
    // the announcement; 105 steps is 1.75 s of staged combat.
    stepScene(game, 105);
    // The staged run may have cleared the wave or dropped the keeper;
    // the screenshot is a mid-combat frame, so hold the playing state.
    game.mode = 'playing';
    game.frozen = true;
    return;
  }

  if (kind === 'boss') {
    game.mode = 'playing';
    game.wave = 10;
    game.score = 11800;
    game.kills = 121;
    game.embers = 96;
    game.best = 12480;
    game.playTime = 480;
    game.time = 480;
    game.player = createPlayer();
    game.player.x = 640;
    game.player.y = 620;
    game.player.hp = 72;
    game.player.damage = 26;
    game.player.multishot = 3;
    game.player.fireRate = 4.6;
    game.player.lantern = 220;
    game.director = { queue: [], timer: 0, spawning: false };
    const boss = createBoss(game, game.rng);
    boss.x = 640;
    boss.y = 240;
    spawnEnemy(game, 'shade', 420, 300, false, game.rng);
    spawnEnemy(game, 'shade', 860, 300, true, game.rng);
    spawnEnemy(game, 'wisp', 540, 180, false, game.rng);
    game.input = scriptedInput(game, { x: boss.x, y: boss.y });
    game.banner = { text: 'WAVE 10 — THE GLOOM', sub: 'Slay the Gloom. End the dark.', time: 1.8 };
    // Step past the banner's 1.8 s so the boss itself is visible in the
    // capture; 115 steps is 1.92 s of staged combat.
    stepScene(game, 115);
    // Hold the boss-fight frame even if the staged run ended the wave.
    game.mode = 'playing';
    game.frozen = true;
    return;
  }

  if (kind === 'win') {
    game.mode = 'win';
    game.wave = 10;
    game.score = 18450;
    game.kills = 143;
    game.embers = 210;
    game.best = 18450;
    game.playTime = 542;
    game.time = 542;
    game.player = createPlayer();
    game.player.x = 640;
    game.player.y = 400;
    burst(game.fx, 640, 400, '#ffbe50', 60, 300, 1.2, 4, game.rng);
    burst(game.fx, 420, 300, '#7fe8e0', 30, 220, 1, 3, game.rng);
    burst(game.fx, 860, 300, '#ffbe50', 30, 220, 1, 3, game.rng);
    game.frozen = true;
    return;
  }

  // Unknown shot: fall back to the title.
  game.mode = 'title';
  game.time = 2.5;
  game.frozen = true;
}
