// ui.js — every screen the keeper sees.
// One job: draw the arena backdrop, the HUD, and all menus (title,
// upgrade choice, pause, victory, defeat) plus wave banners. No game
// logic here — only what the current state looks like.

const GOLD = '#ffbe50';
const TEAL = '#7fe8e0';
const CREAM = '#ffe9a8';
const DIM = '#8a93a8';

function panel(ctx, x, y, w, h, alpha = 0.88) {
  ctx.save();
  ctx.fillStyle = `rgba(10, 14, 26, ${alpha})`;
  ctx.strokeStyle = 'rgba(255, 190, 80, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function centerText(ctx, text, x, y, font, color) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** The arena floor: dark stone, faint grid, glowing border. */
export function drawBackground(ctx, game) {
  const w = game.arena.w;
  const h = game.arena.h;
  ctx.save();
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0, 0, w, h);

  // Faint floor grid.
  ctx.strokeStyle = 'rgba(120, 140, 190, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 80; x < w; x += 80) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 80; y < h; y += 80) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Old rune circle in the middle, barely visible.
  ctx.strokeStyle = 'rgba(127, 232, 224, 0.10)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 150, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 132, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 + Math.cos(a) * 132, h / 2 + Math.sin(a) * 132);
    ctx.lineTo(w / 2 + Math.cos(a) * 150, h / 2 + Math.sin(a) * 150);
    ctx.stroke();
  }

  // Arena border glow.
  ctx.strokeStyle = 'rgba(255, 190, 80, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.restore();

  // Vignette: darkness closes in at the edges.
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/** Health, wave, score, embers, best — always on screen while playing. */
export function drawHUD(ctx, game) {
  const p = game.player;
  ctx.save();
  ctx.textBaseline = 'middle';

  // Health bar, top left.
  const hx = 28;
  const hy = 26;
  const hw = 260;
  const hh = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(hx - 2, hy - 2, hw + 4, hh + 4, 6);
  ctx.fill();
  const frac = Math.max(0, p.hp / p.maxHp);
  const grad = ctx.createLinearGradient(hx, 0, hx + hw, 0);
  grad.addColorStop(0, '#ff5a6e');
  grad.addColorStop(1, '#ffbe50');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(hx, hy, hw * frac, hh, 5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`HP  ${Math.ceil(p.hp)} / ${p.maxHp}`, hx + 6, hy + hh / 2 + 0.5);

  // Dash readiness pip under the health bar.
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = p.dashCd <= 0 ? TEAL : DIM;
  ctx.fillText(p.dashCd <= 0 ? '◆ DASH READY  [SPACE]' : '◆ dash recharging…', hx, hy + 38);

  // Wave, top center.
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = CREAM;
  ctx.fillText(`WAVE ${game.wave} / 10`, 640, 30);
  const alive = game.enemies.length + game.director.queue.length;
  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText(`${alive} foes remain`, 640, 52);

  // Score + embers, top right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = CREAM;
  ctx.fillText(`SCORE ${game.score.toLocaleString('en-US')}`, 1252, 30);
  ctx.font = '15px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText(`◆ ${game.embers} embers`, 1252, 54);
  ctx.fillStyle = DIM;
  ctx.font = '12px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`BEST ${game.best.toLocaleString('en-US')}`, 1252, 74);

  // Boss bar.
  const boss = game.enemies.find((e) => e.kind === 'boss');
  if (boss) {
    const bw = 520;
    const bx = 640 - bw / 2;
    const by = 84;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(bx - 2, by - 2, bw + 4, 14, 5);
    ctx.fill();
    ctx.fillStyle = '#b98cff';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 10, 4);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e6d4ff';
    ctx.fillText('THE GLOOM', 640, by + 26);
  }
  ctx.restore();
}

/** Title screen: name, best score, controls, start prompt. */
export function drawTitle(ctx, game) {
  const w = game.arena.w;
  const h = game.arena.h;
  const pulse = 0.75 + Math.sin(game.time * 2.2) * 0.25;

  // Drifting title embers.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of game.titleFx) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  centerText(ctx, 'LUMENFALL', w / 2, 250, 'bold 92px "Segoe UI", Arial, sans-serif', GOLD);
  ctx.save();
  ctx.globalAlpha = 0.5;
  centerText(ctx, 'LUMENFALL', w / 2, 254, 'bold 92px "Segoe UI", Arial, sans-serif', '#7fe8e0');
  ctx.restore();
  centerText(ctx, 'THE LAST LUMEN KEEPER', w / 2, 312, '18px "Segoe UI", Arial, sans-serif', TEAL);
  centerText(
    ctx,
    'Your lantern is your weapon. Your light is your life. Survive ten waves of the Gloom.',
    w / 2,
    352,
    '16px "Segoe UI", Arial, sans-serif',
    CREAM,
  );

  panel(ctx, w / 2 - 250, 400, 500, 118);
  centerText(ctx, 'WASD / ARROWS — move', w / 2, 424, '15px "Segoe UI", Arial, sans-serif', '#c8d0e0');
  centerText(ctx, 'MOUSE — aim · HOLD CLICK — shoot lantern bolts', w / 2, 448, '15px "Segoe UI", Arial, sans-serif', '#c8d0e0');
  centerText(ctx, 'SPACE — dash · P — pause · M — mute', w / 2, 472, '15px "Segoe UI", Arial, sans-serif', '#c8d0e0');
  centerText(ctx, 'Clear a wave, then choose 1 of 3 upgrades. Slay The Gloom on wave 10.', w / 2, 496, '15px "Segoe UI", Arial, sans-serif', '#c8d0e0');

  ctx.save();
  ctx.globalAlpha = pulse;
  centerText(ctx, 'CLICK  or  PRESS ENTER  to begin', w / 2, 580, 'bold 24px "Segoe UI", Arial, sans-serif', '#ffffff');
  ctx.restore();
  if (game.best > 0) {
    centerText(ctx, `BEST SCORE  ${game.best.toLocaleString('en-US')}`, w / 2, 624, '16px "Segoe UI", Arial, sans-serif', GOLD);
  }
}

/** Between-wave upgrade choice: three cards, click or press 1/2/3. */
export function drawUpgrade(ctx, game) {
  const w = game.arena.w;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 12, 0.72)';
  ctx.fillRect(0, 0, w, game.arena.h);
  ctx.restore();

  centerText(ctx, `WAVE ${game.wave} CLEARED`, w / 2, 150, 'bold 40px "Segoe UI", Arial, sans-serif', GOLD);
  centerText(ctx, 'Choose one blessing of the lantern', w / 2, 196, '17px "Segoe UI", Arial, sans-serif', CREAM);

  const cardW = 280;
  const cardH = 220;
  const gap = 36;
  const total = cardW * 3 + gap * 2;
  const startX = w / 2 - total / 2;
  const y = 260;
  game.upgradeCards = [];
  game.upgradeChoices.forEach((up, i) => {
    const x = startX + i * (cardW + gap);
    const hover = game.input.mouse.x >= x && game.input.mouse.x <= x + cardW && game.input.mouse.y >= y && game.input.mouse.y <= y + cardH;
    game.upgradeCards.push({ x, y, w: cardW, h: cardH, id: up.id });
    ctx.save();
    if (hover) {
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 22;
    }
    panel(ctx, x, y, cardW, cardH, hover ? 0.96 : 0.88);
    ctx.restore();
    centerText(ctx, up.icon, x + cardW / 2, y + 58, 'bold 44px "Segoe UI", Arial, sans-serif', GOLD);
    centerText(ctx, up.name, x + cardW / 2, y + 118, 'bold 20px "Segoe UI", Arial, sans-serif', '#ffffff');
    centerText(ctx, up.desc, x + cardW / 2, y + 152, '15px "Segoe UI", Arial, sans-serif', TEAL);
    centerText(ctx, `[ ${i + 1} ]`, x + cardW / 2, y + 190, '14px "Segoe UI", Arial, sans-serif', DIM);
  });
  centerText(ctx, 'Click a card or press 1, 2 or 3', w / 2, 540, '15px "Segoe UI", Arial, sans-serif', DIM);
}

/** Pause overlay. */
export function drawPause(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 12, 0.7)';
  ctx.fillRect(0, 0, game.arena.w, game.arena.h);
  ctx.restore();
  centerText(ctx, 'PAUSED', 640, 360, 'bold 56px "Segoe UI", Arial, sans-serif', CREAM);
  centerText(ctx, 'Press P or click to resume', 640, 420, '17px "Segoe UI", Arial, sans-serif', DIM);
}

/** Shared stats block for the end screens. */
function drawStats(ctx, game, y) {
  const rows = [
    ['SCORE', game.score.toLocaleString('en-US')],
    ['WAVE REACHED', `${game.wave} / 10`],
    ['FOES SLAIN', String(game.kills)],
    ['EMBERS GATHERED', String(game.embers)],
    ['TIME', formatTime(game.playTime)],
    ['BEST', game.best.toLocaleString('en-US')],
  ];
  ctx.save();
  ctx.font = '17px "Segoe UI", Arial, sans-serif';
  rows.forEach((row, i) => {
    const ry = y + i * 32;
    ctx.textAlign = 'right';
    ctx.fillStyle = DIM;
    ctx.fillText(row[0], 620, ry);
    ctx.textAlign = 'left';
    ctx.fillStyle = CREAM;
    ctx.fillText(row[1], 660, ry);
  });
  ctx.restore();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Victory screen after wave 10. */
export function drawWin(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 6, 0.78)';
  ctx.fillRect(0, 0, game.arena.w, game.arena.h);
  ctx.restore();
  centerText(ctx, 'THE LIGHT PREVAILS', 640, 170, 'bold 54px "Segoe UI", Arial, sans-serif', GOLD);
  centerText(ctx, 'The Gloom is broken. Dawn returns to the arena.', 640, 222, '18px "Segoe UI", Arial, sans-serif', CREAM);
  drawStats(ctx, game, 300);
  const pulse = 0.75 + Math.sin(game.time * 2.2) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  centerText(ctx, 'PRESS ENTER  or  CLICK  to play again', 640, 560, 'bold 22px "Segoe UI", Arial, sans-serif', '#ffffff');
  ctx.restore();
}

/** Defeat screen. */
export function drawGameOver(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 8, 0.78)';
  ctx.fillRect(0, 0, game.arena.w, game.arena.h);
  ctx.restore();
  centerText(ctx, 'THE LIGHT FADES', 640, 170, 'bold 54px "Segoe UI", Arial, sans-serif', '#ff5a6e');
  centerText(ctx, `The Gloom claims another keeper on wave ${game.wave}.`, 640, 222, '18px "Segoe UI", Arial, sans-serif', CREAM);
  drawStats(ctx, game, 300);
  const pulse = 0.75 + Math.sin(game.time * 2.2) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  centerText(ctx, 'PRESS ENTER  or  CLICK  to try again', 640, 560, 'bold 22px "Segoe UI", Arial, sans-serif', '#ffffff');
  ctx.restore();
}

/** Center wave banner, fading in and out. */
export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const total = 2.4;
  const age = total - b.time;
  const alpha = Math.min(1, age * 4) * Math.min(1, b.time * 1.5);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  centerText(ctx, b.text, 640, 300, 'bold 52px "Segoe UI", Arial, sans-serif', GOLD);
  centerText(ctx, b.sub, 640, 348, '18px "Segoe UI", Arial, sans-serif', CREAM);
  ctx.restore();
}
