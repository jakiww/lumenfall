// upgrades.js — the keeper's choices between waves.
// One job: the upgrade pool, rolling three distinct offers, and applying
// the chosen one to the player. No game flow lives here.

export const UPGRADES = [
  {
    id: 'damage',
    name: 'Ember Rounds',
    icon: '◆',
    desc: '+25% bolt damage',
    canTake: () => true,
    apply(p) {
      p.damage *= 1.25;
    },
  },
  {
    id: 'rate',
    name: 'Rapid Wick',
    icon: '≋',
    desc: '+20% fire rate',
    canTake: () => true,
    apply(p) {
      p.fireRate *= 1.2;
    },
  },
  {
    id: 'multi',
    name: 'Twin Flames',
    icon: '✦',
    desc: '+1 bolt per shot',
    canTake: (p) => p.multishot < 4,
    apply(p) {
      p.multishot += 1;
    },
  },
  {
    id: 'dash',
    name: 'Swift Step',
    icon: '»',
    desc: 'Dash recharges 30% faster',
    canTake: (p) => p.dashCdMax > 0.9,
    apply(p) {
      p.dashCdMax = Math.max(0.9, p.dashCdMax * 0.7);
    },
  },
  {
    id: 'hp',
    name: 'Sturdy Wick',
    icon: '♥',
    desc: '+25 max health, heal 30',
    canTake: () => true,
    apply(p) {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 30);
    },
  },
  {
    id: 'lantern',
    name: 'Bright Lantern',
    icon: '☀',
    desc: '+45 lantern light radius',
    canTake: () => true,
    apply(p) {
      p.lantern += 45;
    },
  },
  {
    id: 'speed',
    name: 'Light Feet',
    icon: '➤',
    desc: '+12% move speed',
    canTake: () => true,
    apply(p) {
      p.speed *= 1.12;
    },
  },
  {
    id: 'magnet',
    name: 'Ember Lure',
    icon: '◎',
    desc: '+70 ember magnet radius',
    canTake: () => true,
    apply(p) {
      p.magnet += 70;
    },
  },
];

/** Roll three distinct upgrades the player can still take. */
export function rollUpgrades(player, rng) {
  const pool = UPGRADES.filter((u) => u.canTake(player));
  const picks = [];
  const bag = [...pool];
  while (picks.length < 3 && bag.length > 0) {
    const i = Math.floor(rng() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks;
}

/** Apply an upgrade by id to the player. */
export function applyUpgrade(player, id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (up) up.apply(player);
}
