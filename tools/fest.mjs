#!/usr/bin/env node
/* Schreibt Texte und Zahlen der Seite beim Bau fest ins HTML (Vasco, 2026-11-16: Text einer öffentlichen
   Seite steht fest im HTML, damit Suche und KI-Antworten ihn finden; Prüfung: npm run text-fest im Brand System).
   Vorbild ist fest.mjs des TFCZ, hier ohne Browser: site/js/rendern.js baut aus dem Schnappschuss Text und Markup,
   dieselbe Datei zeichnet die Seite im Browser. Zahlen stehen nie von Hand im HTML.

     node tools/fest.mjs            schreibt site/index.html und kopiert den Schnappschuss nach site/daten/
     node tools/fest.mjs --pruefen  schreibt nichts, Exit 1 wenn das HTML nicht zum Schnappschuss passt

   Der Schnappschuss (daten/hall-of-fame.json) gehört der IT. Nach site/daten/ kommt eine Kopie, weil nur site/
   ausgeliefert wird und daten/ auch spieler.json und pflege.json enthält. Die Kopie ist Byte für Byte gleich.
   Die Kontaktadresse kommt aus «kontakt» in daten/pflege.json; fehlt sie, steht der Platzhalter KONTAKT. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(hier, 'site');
const nurPruefen = process.argv.includes('--pruefen');
const R = await import(pathToFileURL(join(site, 'js/rendern.js')).href);

const quelle = readFileSync(join(hier, 'daten/hall-of-fame.json'), 'utf8');
const m = R.modell(JSON.parse(quelle));
const pflege = existsSync(join(hier, 'daten/pflege.json')) ? JSON.parse(readFileSync(join(hier, 'daten/pflege.json'), 'utf8')) : {};
const kontakt = typeof pflege.kontakt === 'string' && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(pflege.kontakt) ? pflege.kontakt : 'KONTAKT';

const alle = R.zeilen(m, { bereich: 'alle', q: '' });
const teile = {
  lead: R.leadText(),
  leit: R.leitHtml(m),
  filter: R.filterHtml(m, 'alle'),
  satz: R.satzText(m, { bereich: 'alle', q: '' }, alle.length),
  liste: R.listeHtml(alle),
  teams: R.teamsHtml(m),
  stand: R.datumLang(m.stand),
  kontakt: `<a class="btn btn--zwei btn--gross" href="mailto:${R.esc(kontakt)}">Vasco schreiben</a><span class="t-muted">${R.esc(kontakt)}</span>`,
};

const datei = join(site, 'index.html');
let html = readFileSync(datei, 'utf8');
for (const [name, inhalt] of Object.entries(teile)) {
  const re = new RegExp(`(<!-- fest:${name} -->)[\\s\\S]*?(<!-- /fest:${name} -->)`);
  if (!re.test(html)) throw new Error(`Marke fest:${name} fehlt in site/index.html`);
  html = html.replace(re, (_, a, b) => `${a}${inhalt}${b}`);
}

const kopieZiel = join(site, 'daten/hall-of-fame.json');
const kopieStimmt = existsSync(kopieZiel) && readFileSync(kopieZiel, 'utf8') === quelle;
const htmlStimmt = readFileSync(datei, 'utf8') === html;
if (nurPruefen) {
  if (!kopieStimmt || !htmlStimmt) { console.error(`fest: veraltet (${!kopieStimmt ? 'site/daten/hall-of-fame.json' : ''} ${!htmlStimmt ? 'site/index.html' : ''})`.replace(/\s+/g, ' ')); process.exit(1); }
  console.log('fest: HTML und Kopie des Schnappschusses stimmen'); process.exit(0);
}
mkdirSync(dirname(kopieZiel), { recursive: true });
writeFileSync(kopieZiel, quelle);
writeFileSync(datei, html);
console.log(`fest: ${alle.length} Personen, ${m.teams.length} Teams, ${m.gesamt.podestplaetze} Podestplätze, Stand ${m.stand}, Kontakt ${kontakt}`);
