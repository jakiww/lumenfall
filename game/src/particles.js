// particles.js — sparks, floating damage numbers and ember pickups.
// One job: everything that bursts, drifts, floats or gets collected after
// combat. Pure visual/gameplay feedback; no enemy or player logic here.

/** Create an empty effects container. */
export function createEffects() {
  return { sparks: [], floats: [], pickups: [] };
}

/** Spawn a burst of glowing sparks at (x, y). */
export function burst(fx, x, y, color, count, speed, life, size, rng) {
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const v = speed * (0.3 + rng() * 0.7);
    fx.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.5 + rng() * 0.5),
      maxLife: life,
      size: size * (0.6 + rng() * 0.8),
      color,
    });
  }
}

/** A soft ring shockwave, drawn as an expanding stroked circle. */
export function ring(fx, x, y, color, maxRadius) {
  fx.sparks.push({ x, y, vx: 0, vy: 0, life: 0.45, maxLife: 0.45, size: 2, color, ring: true, maxRadius });
}

/** Floating combat text, e.g. damage numbers. */
export function addFloat(fx, x, y, text, color) {
  fx.floats.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

/** Drop an ember pickup worth `value` at (x, y). */
export function spawnEmber(fx, x, y, value, rng) {
  const angle = rng() * Math.PI * 2;
  const dist = 8 + rng() * 18;
  fx.pickups.push({
    x: x + Math.cos(angle) * dist,
    y: y + Math.sin(angle) * dist,
    vx: Math.cos(angle) * 40,
    vy: Math.sin(angle) * 40,
    value,
    bob: rng() * Math.PI * 2,
    life: 14,
  });
}

/**
 * Step all effects. Pickups drift toward the player inside the magnet
 * radius and are collected on touch (embers + score + pickup sound).
 */
export function updateEffects(fx, game, dt) {
  const p = game.player;
  for (let i = fx.sparks.length - 1; i >= 0; i--) {
    const s = fx.sparks[i];
    s.life -= dt;
    if (s.life <= 0) {
      fx.sparks.splice(i, 1);
      continue;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 1 - 2.4 * dt;
    s.vy *= 1 - 2.4 * dt;
  }
  for (let i = fx.floats.length - 1; i >= 0; i--) {
    const f = fx.floats[i];
    f.life -= dt;
    f.y -= 42 * dt;
    if (f.life <= 0) fx.floats.splice(i, 1);
  }
  for (let i = fx.pickups.length - 1; i >= 0; i--) {
    const e = fx.pickups[i];
    e.life -= dt;
    e.bob += dt * 4;
    if (e.life <= 0) {
      fx.pickups.splice(i, 1);
      continue;
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    const magnet = p.magnet;
    if (dist < magnet && dist > 1) {
      const pull = 620 * (1 - dist / magnet) + 180;
      e.vx += (dx / dist) * pull * dt * 3;
      e.vy += (dy / dist) * pull * dt * 3;
    }
    e.vx *= 1 - 3 * dt;
    e.vy *= 1 - 3 * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (dist < p.radius + 14) {
      fx.pickups.splice(i, 1);
      game.embers += e.value;
      game.score += 10 * e.value;
      game.audio.pickup();
      burst(fx, e.x, e.y, '#ffbe50', 6, 90, 0.35, 2.5, game.rng);
    }
  }
}

/** Draw sparks, pickups and floating text. */
export function drawEffects(ctx, fx, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of fx.sparks) {
    const a = Math.max(0, s.life / s.maxLife);
    if (s.ring) {
      const prog = 1 - a;
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.maxRadius * prog, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const e of fx.pickups) {
    const bobY = Math.sin(e.bob) * 3;
    const pulse = 0.75 + Math.sin(time * 6 + e.bob) * 0.25;
    // Blink when about to expire so the keeper can grab it in time.
    const expireBlink = e.life < 3 ? (Math.floor(time * 6) % 2 === 0 ? 0.35 : 1) : 1;
    ctx.globalAlpha = 0.35 * pulse * expireBlink;
    ctx.fillStyle = '#ffbe50';
    ctx.beginPath();
    ctx.arc(e.x, e.y + bobY, 13 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd97a';
    ctx.save();
    ctx.translate(e.x, e.y + bobY);
    ctx.rotate(Math.PI / 4);
    const s = e.value > 1 ? 6.5 : 5;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  for (const f of fx.floats) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}
