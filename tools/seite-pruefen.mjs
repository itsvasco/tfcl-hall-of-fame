#!/usr/bin/env node
/* Lässt die Seitenprüfung des Markenpakets laufen. Sie liest briefing.md neben der Seite. Damit das Briefing nicht
   mit der Seite ausgeliefert wird, entsteht für die Prüfung eine Kopie von site/ samt briefing.md in einem
   Wegwerfordner.   node tools/seite-pruefen.mjs */
import { cpSync, copyFileSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const hier = join(dirname(fileURLToPath(import.meta.url)), '..');
const kern = JSON.parse(readFileSync(join(hier, 'marke/kunde.json'), 'utf8')).paketVersion;
const tmp = mkdtempSync(join(tmpdir(), 'tfcl-seite-'));
cpSync(join(hier, 'site'), tmp, { recursive: true });
copyFileSync(join(hier, 'briefing.md'), join(tmp, 'briefing.md'));
const r = spawnSync('node', [join(hier, 'marke/pakete', `tfcl-hall-of-fame-${kern}`, 'seite-pruefen.mjs'), join(tmp, 'index.html')], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
process.exit(r.status ?? 1);
