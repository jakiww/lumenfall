// waves.js — the ten waves of the Gloom.
// One job: what spawns, when, and where. Enemy behavior lives in
// enemies.js; this file only directs the assault and calls the banner.

import { spawnEnemy, createBoss } from './enemies.js';

export const WAVE_COUNT = 10;

// Which kinds have joined the hunt by each wave.
const KIND_LADDER = [
  ['shade'],
  ['shade', 'skitter'],
  ['shade', 'skitter', 'wisp'],
  ['shade', 'skitter', 'wisp', 'spitter'],
  ['shade', 'skitter', 'wisp', 'spitter', 'brute'],
];

/** How many creatures a wave throws at the keeper. */
function waveSize(wave) {
  return 4 + wave * 2;
}

/** A spawn point on the arena edge, far from the player. */
function spawnPoint(game, rng) {
  const p = game.player;
  const w = game.arena.w;
  const h = game.arena.h;
  for (let tries = 0; tries < 12; tries++) {
    const edge = Math.floor(rng() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = 50 + rng() * (w - 100);
      y = 50;
    } else if (edge === 1) {
      x = 50 + rng() * (w - 100);
      y = h - 50;
    } else if (edge === 2) {
      x = 50;
      y = 50 + rng() * (h - 100);
    } else {
      x = w - 50;
      y = 50 + rng() * (h - 100);
    }
    if (Math.hypot(x - p.x, y - p.y) > 280) return { x, y };
  }
  return { x: 60, y: 60 };
}

/** Build the spawn queue for a wave: kinds, elites, pacing. */
function buildQueue(game, wave, rng) {
  const kinds = KIND_LADDER[Math.min(wave - 1, KIND_LADDER.length - 1)];
  const queue = [];
  if (wave === WAVE_COUNT) {
    queue.push({ kind: 'boss', elite: false, delay: 0.8 });
    for (let i = 0; i < 6; i++) queue.push({ kind: 'shade', elite: false, delay: 1.6 + i * 2.2 });
    queue.push({ kind: 'wisp', elite: false, delay: 5 });
    queue.push({ kind: 'wisp', elite: false, delay: 9 });
    return queue;
  }
  const total = waveSize(wave);
  const elites = wave >= 4 ? 1 + Math.floor((wave - 4) / 3) : 0;
  for (let i = 0; i < total; i++) {
    const kind = kinds[Math.floor(rng() * kinds.length)];
    queue.push({ kind, elite: false, delay: 0 });
  }
  for (let i = 0; i < elites; i++) {
    const slot = Math.floor(rng() * queue.length);
    queue[slot].elite = true;
  }
  // Shuffle the queue so the mix is unpredictable.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  return queue;
}

/** Begin a wave: fill the queue, raise the banner, sound the horn. */
export function startWave(game, wave) {
  game.wave = wave;
  game.director.queue = buildQueue(game, wave, game.rng);
  game.director.timer = 1.1;
  game.director.spawning = true;
  game.banner = { text: wave === WAVE_COUNT ? 'WAVE 10 — THE GLOOM' : `WAVE ${wave}`, sub: wave === WAVE_COUNT ? 'Slay the Gloom. End the dark.' : 'The dark stirs…', time: 2.4 };
  if (wave === WAVE_COUNT) game.audio.boss();
  else game.audio.waveStart();
}

/** The director's per-step work: drip-feed the queue into the arena. */
export function updateDirector(game, dt) {
  const d = game.director;
  if (!d.spawning) return;
  d.timer -= dt;
  const interval = Math.max(0.35, 1.15 - game.wave * 0.07);
  while (d.timer <= 0 && d.queue.length > 0) {
    d.timer += interval;
    const next = d.queue.shift();
    const at = spawnPoint(game, game.rng);
    if (next.kind === 'boss') createBoss(game, game.rng);
    else spawnEnemy(game, next.kind, at.x, at.y, next.elite, game.rng);
  }
  if (d.queue.length === 0) d.spawning = false;
}

/** True when the wave is fully cleared: nothing queued, nothing alive. */
export function waveCleared(game) {
  return !game.director.spawning && game.director.queue.length === 0 && game.enemies.length === 0;
}
