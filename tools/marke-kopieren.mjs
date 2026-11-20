#!/usr/bin/env node
/* Kopiert die Dateien der Marke aus dem Markenpaket (marke/pakete/…, erzeugt von paket.mjs im PixelLens, nicht im Git)
   nach site/. Nur was die Seite lädt: marke.css, marke.js, Schrift, vendor/ (daraus lädt marke.js nach), eigenes.css.
   Aufruf: node tools/marke-kopieren.mjs  (Paket vorher: node ~/Claude/vascooliveira/projekte/pixellens/werkzeuge/paket.mjs tfcl-hall-of-fame) */
import { cpSync, copyFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = join(dirname(fileURLToPath(import.meta.url)), '..');
const kern = JSON.parse(readFileSync(join(hier, 'marke/kunde.json'), 'utf8')).paketVersion;
const paket = join(hier, 'marke/pakete', `tfcl-hall-of-fame-${kern}`);
if (!existsSync(paket)) throw new Error(`Paket fehlt: ${paket}. Zuerst paket.mjs tfcl-hall-of-fame im PixelLens ausführen.`);
const site = join(hier, 'site');
for (const f of ['marke.css', 'marke.js']) copyFileSync(join(paket, f), join(site, f));
copyFileSync(join(hier, 'marke/eigenes.css'), join(site, 'eigenes.css'));
for (const o of ['schrift', 'vendor']) cpSync(join(paket, o), join(site, o), { recursive: true });
console.log(`Marke ${kern} nach site/ kopiert`);
