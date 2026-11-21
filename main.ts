// VICE TIDE — entrypoint for the make.fun gta6-01 bounty (Node 22, stdlib only).
// The game itself lives in game/ as plain static files a desktop browser loads
// fully offline. This program hands the entry in: it mirrors game/ and
// screenshots/ into the output directory (MAKEFUN_OUTPUT_DIR locally, /output
// in the grader) and writes dossier.json there with the vendored builder, so
// the judge receives exactly the bytes this repository holds.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots of 256 KiB each, at
// most 993 game files totalling 48 MiB, no game path over 1000 bytes, and the
// dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log('vice-tide: dossier written to', join(outputDir, 'dossier.json'));
