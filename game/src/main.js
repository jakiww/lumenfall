// main.js — LUMENFALL bootstrap and fixed-step loop.
// One job: own the game state, run the loop, resolve player-bullet
// collisions, and switch modes (title / playing / upgrade / paused /
// win / gameover). Everything else lives in the module it belongs to.

import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createEffects, updateEffects, drawEffects, burst } from './particles.js';
import { createPlayer, updatePlayer, damagePlayer, drawPlayer } from './player.js';
import { updateEnemies, updateEnemyBullets, hurtEnemy, drawEnemies } from './enemies.js';
import { startWave, updateDirector, waveCleared, WAVE_COUNT } from './waves.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { drawBackground, drawHUD, drawTitle, drawUpgrade, drawPause, drawWin, drawGameOver, drawBanner } from './ui.js';
import { buildShotScene } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'lumenfall_best';

/** Deterministic RNG (mulberry32) — seeded per run, fixed per shot. */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage may be unavailable; the score still shows this session.
  }
}

/** Build a fresh game bound to a canvas element. */
export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const game = {
    canvas,
    ctx,
    arena: { w: 1280, h: 800 },
    mode: 'title',
    time: 0,
    playTime: 0,
    wave: 0,
    score: 0,
    kills: 0,
    embers: 0,
    best: loadBest(),
    shake: 0,
    hitStop: 0,
    banner: null,
    rng: createRng((Math.random() * 1e9) | 0),
    input: null,
    audio: createAudio(),
    fx: createEffects(),
    player: createPlayer(),
    enemies: [],
    bullets: [],
    ebullets: [],
    director: { queue: [], timer: 0, spawning: false },
    upgradeChoices: [],
    upgradeCards: [],
    titleFx: [],
    shotMode: null,
    frozen: false,
  };
  game.input = createInput(canvas);

  // Ambient drifting embers for the title screen.
  for (let i = 0; i < 46; i++) {
    game.titleFx.push({
      x: Math.random() * 1280,
      y: Math.random() * 800,
      r: 1 + Math.random() * 2.6,
      vy: 8 + Math.random() * 22,
      drift: Math.random() * Math.PI * 2,
      a: 0.25 + Math.random() * 0.55,
      color: Math.random() < 0.7 ? '#ffbe50' : '#7fe8e0',
    });
  }

  game.damagePlayer = (dmg) => damagePlayer(game, dmg);

  /** One fixed step of the playing simulation (also used by shot scenes). */
  game.stepPlaying = (dt) => {
    game.playTime += dt;
    updatePlayer(game, dt);
    updateDirector(game, dt);
    updateEnemies(game, dt);
    updateEnemyBullets(game, dt);
    updateBullets(game, dt);
    updateEffects(game.fx, game, dt);
    if (game.banner) {
      game.banner.time -= dt;
      if (game.banner.time <= 0) game.banner = null;
    }
    if (game.mode === 'playing' && waveCleared(game)) {
      if (game.wave >= WAVE_COUNT) game.win();
      else game.openUpgrade();
    }
  };

  game.startGame = () => {
    game.mode = 'playing';
    game.time = 0;
    game.playTime = 0;
    game.wave = 0;
    game.score = 0;
    game.kills = 0;
    game.embers = 0;
    game.shake = 0;
    game.hitStop = 0;
    game.banner = null;
    game.enemies = [];
    game.bullets = [];
    game.ebullets = [];
    game.fx = createEffects();
    game.player = createPlayer();
    game.director = { queue: [], timer: 0, spawning: false };
    game.rng = createRng((Math.random() * 1e9) | 0);
    game.audio.resume();
    startWave(game, 1);
  };

  game.openUpgrade = () => {
    game.mode = 'upgrade';
    game.upgradeChoices = rollUpgrades(game.player, game.rng);
    game.audio.waveClear();
    game.audio.upgrade();
  };

  game.chooseUpgrade = (id) => {
    applyUpgrade(game.player, id);
    game.audio.upgrade();
    startWave(game, game.wave + 1);
    game.mode = 'playing';
  };

  game.win = () => {
    if (game.mode !== 'playing') return;
    game.mode = 'win';
    game.enemies = [];
    game.ebullets = [];
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.best);
    }
    game.audio.win();
    burst(game.fx, 640, 400, '#ffbe50', 80, 320, 1.2, 4, game.rng);
  };

  game.lose = () => {
    if (game.mode !== 'playing') return;
    game.mode = 'gameover';
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.best);
    }
    game.audio.lose();
    burst(game.fx, game.player.x, game.player.y, '#ff5a6e', 50, 300, 1, 4, game.rng);
  };

  return game;
}

/** Step player bolts: move, cull, and resolve hits on enemies. */
function updateBullets(game, dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0 || b.x < 8 || b.x > game.arena.w - 8 || b.y < 8 || b.y > game.arena.h - 8;
    if (!dead) {
      for (const e of game.enemies) {
        const d = Math.hypot(b.x - e.x, b.y - e.y);
        if (d < b.radius + e.radius) {
          const angle = Math.atan2(b.vy, b.vx);
          hurtEnemy(game, e, b.dmg, angle);
          burst(game.fx, b.x, b.y, '#ffd97a', 5, 120, 0.25, 2, game.rng);
          dead = true;
          break;
        }
      }
    }
    if (dead) game.bullets.splice(i, 1);
  }
}

/** One fixed simulation step. */
function update(game, dt) {
  game.time += dt;
  game.audio.update(dt);

  if (game.mode === 'title') {
    for (const s of game.titleFx) {
      s.y -= s.vy * dt;
      s.x += Math.sin(game.time * 0.7 + s.drift) * 12 * dt;
      if (s.y < -6) {
        s.y = 806;
        s.x = Math.random() * 1280;
      }
    }
    if (game.input.wasPressed('Enter') || game.input.wasPressed('Mouse0')) {
      game.startGame();
    }
    return;
  }

  if (game.mode === 'playing') {
    if (game.input.wasPressed('KeyP')) {
      game.mode = 'paused';
      return;
    }
    game.stepPlaying(dt);
    return;
  }

  if (game.mode === 'upgrade') {
    updateEffects(game.fx, game, dt);
    if (game.input.wasPressed('Digit1')) game.chooseUpgrade(game.upgradeChoices[0]?.id);
    else if (game.input.wasPressed('Digit2')) game.chooseUpgrade(game.upgradeChoices[1]?.id);
    else if (game.input.wasPressed('Digit3')) game.chooseUpgrade(game.upgradeChoices[2]?.id);
    else if (game.input.wasPressed('Mouse0')) {
      for (const card of game.upgradeCards) {
        if (game.input.mouse.x >= card.x && game.input.mouse.x <= card.x + card.w && game.input.mouse.y >= card.y && game.input.mouse.y <= card.y + card.h) {
          game.chooseUpgrade(card.id);
          break;
        }
      }
    }
    return;
  }

  if (game.mode === 'paused') {
    if (game.input.wasPressed('KeyP') || game.input.wasPressed('Mouse0')) {
      game.mode = 'playing';
    }
    return;
  }

  if (game.mode === 'win' || game.mode === 'gameover') {
    updateEffects(game.fx, game, dt);
    if (game.input.wasPressed('Enter') || game.input.wasPressed('Mouse0')) {
      game.startGame();
    }
  }
}

/** Draw the current state. */
function render(game) {
  const ctx = game.ctx;
  ctx.save();
  if (game.shake > 0.3) {
    const s = game.shake;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }
  drawBackground(ctx, game);
  if (game.mode === 'title') {
    drawTitle(ctx, game);
  } else {
    drawEnemies(ctx, game);
    drawPlayer(ctx, game);
    // Player bolts.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of game.bullets) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffbe50';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawEffects(ctx, game.fx, game.time);
    drawHUD(ctx, game);
    drawBanner(ctx, game);
    if (game.mode === 'upgrade') drawUpgrade(ctx, game);
    else if (game.mode === 'paused') drawPause(ctx, game);
    else if (game.mode === 'win') drawWin(ctx, game);
    else if (game.mode === 'gameover') drawGameOver(ctx, game);
  }
  ctx.restore();
}

/** Boot the game on the page's canvas. */
export function boot(canvas) {
  const game = createGame(canvas);
  window.__game = game;

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') || '1');
    game.shotMode = shot;
    buildShotScene(game, shot, seed);
    render(game);
    window.__shotReady = true;
    return game;
  }

  let last = performance.now();
  let acc = 0;
  // Losing the tab mid-fight pauses instead of leaving the keeper exposed.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.mode === 'playing') game.mode = 'paused';
  });
  function frame(now) {
    requestAnimationFrame(frame);
    let frameDt = (now - last) / 1000;
    last = now;
    if (frameDt > 0.25) frameDt = 0.25;

    if (game.input.wasPressed('KeyM')) game.audio.toggleMute();
    if (game.input.mouse.down) game.audio.resume();

    if (game.hitStop > 0) {
      game.hitStop -= frameDt;
      render(game);
      game.input.endFrame();
      return;
    }

    acc += frameDt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      update(game, STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
    game.shake = Math.max(0, game.shake - frameDt * 26);
    render(game);
    // Edges live until a simulation step consumes them: at frame rates
    // above 60 Hz some frames run no step, and clearing here would eat
    // a key press that arrived between steps (e.g. P to pause).
    if (steps > 0) game.input.endFrame();
  }
  requestAnimationFrame(frame);
  return game;
}

const canvas = document.getElementById('game');
if (canvas) boot(canvas);
