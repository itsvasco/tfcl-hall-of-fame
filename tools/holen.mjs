// Die Abrufe der Quellen. Jede Funktion liefert Rohdaten und wirft bei Fehlern; geschrieben wird hier nichts.
// erneuern.mjs bekommt diese Funktionen als Parameter, der Test setzt feste Eingaben ein (kein Netz).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TS, holeJson } from './gemeinsam.mjs';

const DATEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'daten');
const hand = (datei) => JSON.parse(fs.readFileSync(path.join(DATEN, datei), 'utf8'));
import { holeTurniere } from './coral.mjs';

async function text(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'follow' });
  if (!r.ok) throw new Error(`${url} antwortet mit ${r.status}`);
  return r.text();
}

export const echt = {
  sm: () => holeJson('https://api.swisstablesoccer.ch/hall-of-fame'),
  rangliste: (saison, kategorie, seite) => holeJson(`${TS}?tour=78&season=${saison}&rule=1&category=${kategorie}&page=${seite}`),
  archiv: (zeitstempel) => text(`https://web.archive.org/web/${zeitstempel}/https://swisstablesoccer.ch/index.php/de/spielbetrieb/ranglisten`),
  coral: (slugs) => holeTurniere(slugs),
  // Handdateien, vom Sammelskript (tools/turniere-sammeln.mjs) erzeugt, dazu daten/fast.json (FAST, das alte
  // Turniersystem der ITSF bis 2024) und daten/stf-archiv.json (Verbandsturniere bis 2024 aus dem Web-Archiv,
  // tools/stf-archiv.mjs); beide nachgeführt von Hand und vom Sammelskript nie überschrieben
  turniere: async () => { const t = hand('turniere.json'); return { ...t, eintraege: [...t.eintraege, ...hand('fast.json').eintraege, ...hand('stf-archiv.json').eintraege] }; },
  champions: async () => { const c = hand('champions-league.json'); return { ...c, teilnahmen: [...c.teilnahmen, ...(hand('fast.json').champions || [])] }; },
  // Kader der Clubliga-Teams auf dem Podest (Handdatei, von Hand nachgeführt)
  clubligaKader: async () => hand('clubliga-kader.json'),
  fordere: (nr) => holeJson(`https://fordere.ch/api/seasons/${nr}/final-day`),
  // PDF der Clubliga als Textstücke mit Lage: [{ seite, x, y, str }]
  async pdf(jahr) {
    const r = await fetch(`https://tournaments.swisstablesoccer.ch/assets/docs/stl/league-${jahr}-standings.pdf`, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`PDF ${jahr} antwortet mit ${r.status}`);
    const doc = await getDocument({ data: new Uint8Array(await r.arrayBuffer()), useSystemFonts: true, verbosity: 0 }).promise;
    const items = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const c = await (await doc.getPage(n)).getTextContent();
      for (const i of c.items) if (i.str.trim()) items.push({ seite: n, x: Math.round(i.transform[4]), y: Math.round(i.transform[5]), str: i.str.trim() });
    }
    return items;
  },
};

export const URL_ARCHIV = (z) => `https://web.archive.org/web/${z}/https://swisstablesoccer.ch/index.php/de/spielbetrieb/ranglisten`;
export const URL_PDF = (jahr) => `https://tournaments.swisstablesoccer.ch/assets/docs/stl/league-${jahr}-standings.pdf`;
