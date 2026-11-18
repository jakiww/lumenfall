// main.ts — LUMENFALL entry program for the make.fun best-game-01 bounty.
// Node 22 standard library only. It copies game/ and screenshots/ from
// this repository into the output directory, then writes dossier.json
// with buildDossier from the kit's library (vendor/makefun-game.ts).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GAME_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

// Start from a clean output directory. NEVER remove the directory itself:
// in the grader /output is a mount point whose parent directory is
// read-only for the grading user, so removing it fails with EACCES.
// Remove only its contents instead.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

// The playable game and its screenshots, copied whole.
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The dossier: byte for byte what the kit's library writes from them.
const dossier = buildDossier(outDir, GAME_CAPS);
// buildDossier returns a Uint8Array: decode it as UTF-8 explicitly.
// (Uint8Array.toString() would give comma-joined byte values instead,
// and JSON.parse would then fail at the comma after the first number.)
const dossierText = Buffer.from(dossier).toString('utf8');
// Sanity check: the dossier must be valid JSON before it is written.
JSON.parse(dossierText);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`lumenfall: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
