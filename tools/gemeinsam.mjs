// Gemeinsame Helfer der Werkzeuge. Keine Spieler-IDs, keine Kennungen: nur Namen, Rang, Quelle.
import fs from 'node:fs';

export const TS = 'https://api.tablesoccer.org/cms.rankings';
export const KATEGORIEN = { 1: [312, 308, 314, 310, 316, 315, 311, 322, 313, 309, 317], 2: [318, 320, 319, 321] };

// Eine Quelle hat ihr Format geändert: Exit 1, nichts schreiben.
export class QuelleVeraendert extends Error {}

// Schlüssel eines Namens: klein, Bindestriche als Leerzeichen, Teile sortiert («ZUBER Silvan» = «Silvan Zuber»).
export function schluessel(name) {
  return String(name).normalize('NFC').toLowerCase().replace(/[-–]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
}

export function heute() { return new Date().toISOString().slice(0, 10); }

export async function holeJson(url, versuche = 3) {
  let fehler;
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`${url} antwortet mit ${r.status}`);
      return await r.json();
    } catch (f) { fehler = f; await new Promise((w) => setTimeout(w, 500 * (i + 1))); }
  }
  throw new Error(`Quelle nicht erreichbar: ${fehler.message}`);
}

// «NACHNAME Vorname» (Verband, tablesoccer.org) in «Vorname Nachname». Grossgeschriebene Wörter vorn sind der Nachname.
export function anzeigeName(verband) {
  const teile = String(verband).trim().split(/\s+/);
  let n = 0;
  while (n < teile.length - 1 && teile[n] === teile[n].toUpperCase() && /[A-ZÄÖÜ]/.test(teile[n])) n++;
  if (n === 0) return String(verband).trim();
  const gross = (w) => w.toLowerCase().replace(/(^|[-'])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  const nach = teile.slice(0, n).map(gross).join(' ');
  return `${teile.slice(n).join(' ')} ${nach}`.trim();
}

export function slug(name) {
  return String(name).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function liesJson(datei) { return JSON.parse(fs.readFileSync(datei, 'utf8')); }
export function schreibeJson(datei, daten) { fs.writeFileSync(datei, JSON.stringify(daten, null, 2) + '\n'); }
