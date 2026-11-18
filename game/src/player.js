// player.js — the Lumen Keeper.
// One job: the player object — movement, dash, lantern bolts, damage,
// and how the keeper looks. Combat against enemies is resolved by main.js;
// this file only moves, shoots and draws the keeper.

import { burst } from './particles.js';

/** The keeper's starting stats. Upgrades mutate these fields. */
export function createPlayer() {
  return {
    x: 640,
    y: 430,
    vx: 0,
    vy: 0,
    radius: 16,
    hp: 100,
    maxHp: 100,
    speed: 265,
    damage: 13,
    fireRate: 3.4,
    multishot: 1,
    lantern: 175,
    magnet: 95,
    dashCdMax: 2.4,
    dashCd: 0,
    dashTime: 0,
    dashX: 0,
    dashY: 1,
    fireTimer: 0,
    iframes: 0,
    aimAngle: -Math.PI / 2,
    walkPhase: 0,
    flicker: 0,
  };
}

/** Move, dash and shoot. Called once per fixed step while playing. */
export function updatePlayer(game, dt) {
  const p = game.player;
  const input = game.input;
  const move = input.moveVector();

  p.iframes = Math.max(0, p.iframes - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.fireTimer -= dt;
  p.flicker += dt;

  // Aim follows the mouse.
  p.aimAngle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  // Dash: a short burst with brief invulnerability.
  if (input.wasPressed('Space') && p.dashCd <= 0 && (move.x !== 0 || move.y !== 0)) {
    p.dashTime = 0.16;
    p.dashCd = p.dashCdMax;
    p.iframes = Math.max(p.iframes, 0.3);
    const len = Math.hypot(move.x, move.y) || 1;
    p.dashX = move.x / len;
    p.dashY = move.y / len;
    game.audio.dash();
    burst(game.fx, p.x, p.y, '#7fe8e0', 10, 160, 0.35, 3, game.rng);
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.vx = p.dashX * 760;
    p.vy = p.dashY * 760;
    // Teal sparks trail the dash.
    if (game.rng() < 0.6) {
      burst(game.fx, p.x - p.dashX * 18, p.y - p.dashY * 18, '#7fe8e0', 1, 40, 0.3, 2.5, game.rng);
    }
  } else {
    const accel = 2400;
    p.vx += move.x * accel * dt;
    p.vy += move.y * accel * dt;
    const drag = Math.max(0, 1 - 9 * dt);
    p.vx *= drag;
    p.vy *= drag;
    const spd = Math.hypot(p.vx, p.vy);
    const max = p.speed;
    if (spd > max) {
      p.vx = (p.vx / spd) * max;
      p.vy = (p.vy / spd) * max;
    }
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const m = 34;
  p.x = Math.max(m, Math.min(game.arena.w - m, p.x));
  p.y = Math.max(m, Math.min(game.arena.h - m, p.y));

  if (Math.hypot(p.vx, p.vy) > 40) p.walkPhase += dt * 11;

  // Fire lantern bolts toward the mouse while held.
  if (input.mouse.down && p.fireTimer <= 0) {
    p.fireTimer = 1 / p.fireRate;
    const spread = 0.13;
    const shots = p.multishot;
    for (let i = 0; i < shots; i++) {
      const off = (i - (shots - 1) / 2) * spread;
      const a = p.aimAngle + off;
      game.bullets.push({
        x: p.x + Math.cos(a) * 22,
        y: p.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 640,
        vy: Math.sin(a) * 640,
        dmg: p.damage,
        life: 0.85,
        radius: 5,
      });
    }
    game.audio.shoot();
    burst(game.fx, p.x + Math.cos(p.aimAngle) * 24, p.y + Math.sin(p.aimAngle) * 24, '#ffd97a', 3, 70, 0.2, 2, game.rng);
  }
}

/** Hurt the keeper (honors dash invulnerability frames). */
export function damagePlayer(game, dmg) {
  const p = game.player;
  if (p.iframes > 0 || game.mode !== 'playing') return;
  p.hp -= dmg;
  p.iframes = 0.6;
  game.shake = Math.min(14, game.shake + 7);
  game.audio.hurt();
  burst(game.fx, p.x, p.y, '#ff5a6e', 14, 200, 0.5, 3, game.rng);
  if (p.hp <= 0) {
    p.hp = 0;
    game.lose();
  }
}

/** Draw the keeper: lantern glow, hooded cloak, the lantern itself. */
export function drawPlayer(ctx, game) {
  const p = game.player;
  const t = game.time;
  const flick = 1 + Math.sin(t * 9 + p.flicker * 3) * 0.05 + Math.sin(t * 23) * 0.03;

  // Lantern light pool on the floor.
  ctx.save();
  const glow = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.lantern * flick);
  glow.addColorStop(0, 'rgba(255, 205, 110, 0.28)');
  glow.addColorStop(0.55, 'rgba(255, 180, 80, 0.10)');
  glow.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.lantern * flick, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dash trail.
  if (p.dashTime > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#7fe8e0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x - p.dashX * 34, p.y - p.dashY * 34);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }

  // Blink while invulnerable.
  if (p.iframes > 0 && Math.floor(t * 18) % 2 === 0) return;

  const bob = Math.sin(p.walkPhase) * 2;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.4);

  // Cloak.
  ctx.fillStyle = '#2c4a6e';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(15, -6, 13, 12);
  ctx.quadraticCurveTo(0, 18, -13, 12);
  ctx.quadraticCurveTo(-15, -6, 0, -18);
  ctx.fill();
  ctx.strokeStyle = '#7fe8e0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hood + face glow.
  ctx.fillStyle = '#1d3247';
  ctx.beginPath();
  ctx.arc(0, -6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(Math.cos(p.aimAngle) * 3, -6 + Math.sin(p.aimAngle) * 3, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // The lantern, held toward the aim.
  const lx = Math.cos(p.aimAngle) * 20;
  const ly = Math.sin(p.aimAngle) * 20;
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = '#ffbe50';
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(lx, ly, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dash cooldown pip under the keeper.
  if (p.dashCd > 0) {
    const frac = 1 - p.dashCd / p.dashCdMax;
    ctx.save();
    ctx.strokeStyle = 'rgba(127, 232, 224, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 24, 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
