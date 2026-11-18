// enemies.js — the Gloom's creatures.
// One job: enemy kinds, their AI, their bullets, the boss, and what
// happens when a bolt hits one. Spawning schedules live in waves.js.

import { burst, ring, addFloat, spawnEmber } from './particles.js';

// kind: base stats. HP scales with the wave in spawnEnemy.
export const ENEMY_TYPES = {
  shade: { hp: 22, speed: 64, radius: 15, dmg: 9, score: 50, embers: 1, color: '#8a7bff', glow: '#5a48c8' },
  skitter: { hp: 13, speed: 158, radius: 11, dmg: 6, score: 60, embers: 1, color: '#ff7ad9', glow: '#c23a9e' },
  spitter: { hp: 28, speed: 50, radius: 14, dmg: 0, score: 80, embers: 2, color: '#7dff8a', glow: '#2fae4e' },
  brute: { hp: 95, speed: 40, radius: 27, dmg: 17, score: 150, embers: 3, color: '#ff8a5a', glow: '#c24e1e' },
  wisp: { hp: 17, speed: 88, radius: 12, dmg: 8, score: 70, embers: 2, color: '#7fe8e0', glow: '#2a9d94' },
};

/** Spawn one enemy of a kind at (x, y). Elites are bigger, tougher, richer. */
export function spawnEnemy(game, kind, x, y, elite, rng) {
  const base = ENEMY_TYPES[kind];
  const hpScale = 1 + (game.wave - 1) * 0.13;
  const e = {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    kx: 0,
    ky: 0,
    radius: base.radius * (elite ? 1.55 : 1),
    hp: Math.round(base.hp * hpScale * (elite ? 3.2 : 1)),
    maxHp: Math.round(base.hp * hpScale * (elite ? 3.2 : 1)),
    speed: base.speed * (elite ? 0.92 : 1) * (0.9 + rng() * 0.2),
    dmg: base.dmg * (elite ? 1.5 : 1),
    score: base.score * (elite ? 3 : 1),
    embers: base.embers * (elite ? 3 : 1),
    color: base.color,
    glow: base.glow,
    elite: !!elite,
    flash: 0,
    shootTimer: 1.5 + rng() * 1.5,
    wobble: rng() * Math.PI * 2,
    phase: rng() * Math.PI * 2,
    burstTimer: 0,
    summonTimer: 6,
    chargeTimer: 5,
    charging: 0,
    telegraph: 0,
  };
  game.enemies.push(e);
  if (elite) ring(game.fx, x, y, '#ffbe50', 70);
  return e;
}

/** The Gloom, boss of wave 10. */
export function createBoss(game, rng) {
  const boss = spawnEnemy(game, 'shade', game.arena.w / 2, 150, false, rng);
  boss.kind = 'boss';
  boss.radius = 54;
  boss.hp = 950;
  boss.maxHp = 950;
  boss.speed = 46;
  boss.dmg = 22;
  boss.score = 2500;
  boss.embers = 12;
  boss.color = '#b98cff';
  boss.glow = '#6a2fd6';
  boss.shootTimer = 2;
  boss.burstTimer = 3;
  boss.summonTimer = 7;
  boss.chargeTimer = 6;
  return boss;
}

/** Hurt an enemy; kills it (score, embers, effects) at zero HP. */
export function hurtEnemy(game, e, dmg, angle) {
  e.hp -= dmg;
  e.flash = 0.12;
  const kb = e.kind === 'brute' || e.kind === 'boss' ? 30 : 130;
  e.kx += Math.cos(angle) * kb;
  e.ky += Math.sin(angle) * kb;
  addFloat(game.fx, e.x, e.y - e.radius - 6, String(Math.round(dmg)), '#ffe9a8');
  if (e.hp > 0) {
    game.audio.hit();
    return false;
  }
  killEnemy(game, e);
  return true;
}

function killEnemy(game, e) {
  const idx = game.enemies.indexOf(e);
  if (idx >= 0) game.enemies.splice(idx, 1);
  game.kills++;
  game.score += e.score * game.wave;
  game.hitStop = Math.max(game.hitStop, e.kind === 'boss' ? 0.22 : 0.05);
  game.shake = Math.min(12, game.shake + (e.kind === 'boss' ? 12 : 2));
  burst(game.fx, e.x, e.y, e.color, e.kind === 'boss' ? 60 : 16, 240, 0.6, 3.5, game.rng);
  burst(game.fx, e.x, e.y, '#ffffff', 6, 140, 0.3, 2, game.rng);
  if (e.kind === 'boss') {
    ring(game.fx, e.x, e.y, '#b98cff', 320);
    game.audio.boss();
  } else {
    game.audio.kill();
  }
  for (let i = 0; i < e.embers; i++) spawnEmber(game.fx, e.x, e.y, 1, game.rng);
}

/** Fire an enemy bullet at the player. */
function enemyShoot(game, e, speed) {
  const p = game.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  game.ebullets.push({
    x: e.x + Math.cos(a) * (e.radius + 4),
    y: e.y + Math.sin(a) * (e.radius + 4),
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    dmg: 10,
    life: 4,
    radius: 6,
  });
}

/** Boss radial burst. */
function bossBurst(game, boss) {
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + boss.phase;
    game.ebullets.push({
      x: boss.x + Math.cos(a) * (boss.radius + 6),
      y: boss.y + Math.sin(a) * (boss.radius + 6),
      vx: Math.cos(a) * 150,
      vy: Math.sin(a) * 150,
      dmg: 12,
      life: 5,
      radius: 7,
    });
  }
  game.audio.boss();
}

/** Step every enemy's AI, separation and contact damage. */
export function updateEnemies(game, dt) {
  const p = game.player;
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    e.flash = Math.max(0, e.flash - dt);
    e.phase += dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    let mx = 0;
    let my = 0;
    if (e.kind === 'shade' || e.kind === 'brute') {
      mx = nx;
      my = ny;
    } else if (e.kind === 'skitter') {
      const wob = Math.sin(e.phase * 5) * 0.9;
      mx = nx + -ny * wob;
      my = ny + nx * wob;
    } else if (e.kind === 'spitter') {
      if (dist > 300) {
        mx = nx;
        my = ny;
      } else if (dist < 200) {
        mx = -nx;
        my = -ny;
      } else {
        mx = -ny * Math.sin(e.phase * 1.4);
        my = nx * Math.sin(e.phase * 1.4);
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 520) {
        e.shootTimer = 2.3;
        enemyShoot(game, e, 175);
      }
    } else if (e.kind === 'wisp') {
      const surge = 0.6 + 0.4 * Math.sin(e.phase * 2.2);
      mx = nx * surge + -ny * Math.cos(e.phase * 1.7) * 0.6;
      my = ny * surge + nx * Math.cos(e.phase * 1.7) * 0.6;
    } else if (e.kind === 'boss') {
      e.burstTimer -= dt;
      e.summonTimer -= dt;
      e.chargeTimer -= dt;
      if (e.telegraph > 0) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          e.charging = 0.55;
          e.chargeTimer = 6;
          const ca = Math.atan2(p.y - e.y, p.x - e.x);
          e.vx = Math.cos(ca) * 420;
          e.vy = Math.sin(ca) * 420;
          game.audio.dash();
        }
      } else if (e.charging > 0) {
        e.charging -= dt;
      } else {
        mx = nx;
        my = ny;
        if (e.burstTimer <= 0) {
          e.burstTimer = 3.2;
          bossBurst(game, e);
        }
        if (e.summonTimer <= 0) {
          e.summonTimer = 8;
          for (let s = 0; s < 3; s++) {
            const a = (s / 3) * Math.PI * 2 + e.phase;
            spawnEnemy(game, 'shade', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, false, game.rng);
          }
          burst(game.fx, e.x, e.y, '#b98cff', 20, 200, 0.5, 3, game.rng);
        }
        if (e.chargeTimer <= 0) {
          e.telegraph = 0.7;
          e.chargeTimer = 6;
        }
      }
    }

    const ml = Math.hypot(mx, my);
    if (ml > 0.01 && e.charging <= 0) {
      e.vx = (mx / ml) * e.speed;
      e.vy = (my / ml) * e.speed;
    }
    e.kx *= 1 - 6 * dt;
    e.ky *= 1 - 6 * dt;
    e.x += (e.vx + e.kx) * dt;
    e.y += (e.vy + e.ky) * dt;
    const m = e.radius + 6;
    e.x = Math.max(m, Math.min(game.arena.w - m, e.x));
    e.y = Math.max(m, Math.min(game.arena.h - m, e.y));

    // Touch damage.
    if (dist < e.radius + p.radius - 2) {
      game.damagePlayer(e.dmg);
      const push = 260;
      p.vx += nx * push;
      p.vy += ny * push;
    }
  }

  // Gentle separation so enemies do not stack on one point.
  const list = game.enemies;
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const A = list[a];
      const B = list[b];
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const d = Math.hypot(dx, dy);
      const min = A.radius + B.radius - 4;
      if (d > 0.01 && d < min) {
        const push = ((min - d) / d) * 0.5;
        A.x -= dx * push * 0.5;
        A.y -= dy * push * 0.5;
        B.x += dx * push * 0.5;
        B.y += dy * push * 0.5;
      }
    }
  }
}

/** Step enemy bullets and test them against the player. */
export function updateEnemyBullets(game, dt) {
  const p = game.player;
  for (let i = game.ebullets.length - 1; i >= 0; i--) {
    const b = game.ebullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const hit = Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 3;
    const out = b.x < 0 || b.x > game.arena.w || b.y < 0 || b.y > game.arena.h;
    if (hit) {
      game.ebullets.splice(i, 1);
      game.damagePlayer(b.dmg);
      continue;
    }
    if (b.life <= 0 || out) game.ebullets.splice(i, 1);
  }
}

/** Draw every enemy, dimmed outside the lantern's light. */
export function drawEnemies(ctx, game) {
  const p = game.player;
  for (const e of game.enemies) {
    const dist = Math.hypot(e.x - p.x, e.y - p.y);
    const lit = Math.max(0.35, 1 - Math.max(0, dist - game.player.lantern) / 320);
    ctx.save();
    ctx.globalAlpha = lit;
    ctx.translate(e.x, e.y);

    if (e.elite) {
      ctx.strokeStyle = '#ffbe50';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.telegraph > 0) {
      ctx.strokeStyle = `rgba(255, 90, 110, ${0.4 + 0.6 * Math.sin(game.time * 20)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    const flash = e.flash > 0;
    const body = flash ? '#ffffff' : e.color;
    const dark = flash ? '#ffffff' : e.glow;

    if (e.kind === 'shade' || e.kind === 'boss') {
      // Wobbling blob with glowing eyes.
      ctx.fillStyle = dark;
      ctx.beginPath();
      const wob = Math.sin(e.phase * 3) * 2;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const r = e.radius + Math.sin(a * 3 + e.phase * 2) * 3 + wob;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      const look = Math.atan2(p.y - e.y, p.x - e.x);
      const eyeOff = e.radius * 0.32;
      const eyeR = e.kind === 'boss' ? 7 : 3.4;
      for (const s of [-1, 1]) {
        const ex = Math.cos(look) * 4 + Math.cos(look + Math.PI / 2) * eyeOff * s;
        const ey = Math.sin(look) * 4 + Math.sin(look + Math.PI / 2) * eyeOff * s;
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.kind === 'boss') {
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(0, -e.radius * 0.62, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.kind === 'skitter') {
      ctx.rotate(e.phase * 2);
      ctx.fillStyle = dark;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const px = Math.cos(a) * (e.radius + 5);
        const py = Math.sin(a) * (e.radius + 5);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'spitter') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      const look = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.fillStyle = '#0b0e18';
      ctx.beginPath();
      ctx.arc(Math.cos(look) * 6, Math.sin(look) * 6, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'brute') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + e.phase * 0.4;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(-6, -4, 3, 0, Math.PI * 2);
      ctx.arc(6, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'wisp') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = e.glow;
      ctx.globalAlpha = lit * 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = lit;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elite / boss health bar.
    if ((e.elite || e.kind === 'boss') && e.hp < e.maxHp) {
      ctx.globalAlpha = 1;
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-w / 2, -e.radius - 14, w, 5);
      ctx.fillStyle = '#ffbe50';
      ctx.fillRect(-w / 2, -e.radius - 14, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }

  // Enemy bullets: violet orbs.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of game.ebullets) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#b98cff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e6d4ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
