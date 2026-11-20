#!/usr/bin/env node
// Sammelt Turniere (P4P, STF, WS, ITSF World Cup) und Teilnahmen an der Champions League für die Spieler mit
// Lizenz LUZE und die Ehrenmitglieder. Schreibt daten/turniere.json und daten/champions-league.json (Handdateien);
// erneuern.mjs liest nur diese Dateien und prüft sie. Braucht Netz und Google Chrome (Coral über die öffentliche Seite).
//   node tools/turniere-sammeln.mjs [--cache <ordner>]
// Der Zwischenspeicher hält die Coral-Seiten (store-<Kurzcode>.json) und die P4P-Seiten; ein zweiter Lauf geht ohne Netz.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { liesJson, schreibeJson, holeJson, heute } from './gemeinsam.mjs';
import { personen } from './erneuern.mjs';
import { holeTurniere } from './coral.mjs';
import { p4pSammeln } from './p4p.mjs';
import { coralAbleiten, championsAbleiten, doppelte, STF_AUSGESCHLOSSEN } from './turniere.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEN = path.join(HIER, '..', 'daten');
const i = process.argv.indexOf('--cache');
const cache = i > 0 ? process.argv[i + 1] : path.join(os.tmpdir(), 'tfcl-turniere-cache');
fs.mkdirSync(path.join(cache, 'p4p'), { recursive: true });
const datum = heute();

const spielerDatei = liesJson(path.join(DATEN, 'spieler.json'));
const pflege = liesJson(path.join(DATEN, 'pflege.json'));
const ehren = (pflege.ehrenmitglieder || []).map((n) => ({ id: n.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-'), name: n, ehrenmitglied: true }));
const P = personen({ ...spielerDatei, spieler: [...spielerDatei.spieler, ...ehren] }, pflege.nicht_nennen || []);

async function store(code) {
  const f = path.join(cache, `store-${code.replace(/\//g, '_')}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const v = (await holeTurniere([code]))[code];
  if (v) fs.writeFileSync(f, JSON.stringify(v));
  return v;
}

const offen = [];
const eintraege = [];

// 1. P4P
const pp = await p4pSammeln({ personen: P.alle.map((s) => ({ id: s.id, namen: [s.name, ...(s.schreibweisen || [])] })), wahl: pflege.p4p_wahl || {}, cache: path.join(cache, 'p4p'), datum });
eintraege.push(...pp.eintraege);
offen.push(...pp.offen, ...pp.mehrdeutig.map((m) => `P4P: Name ${m.name} mehrdeutig in der Galerie`), ...pp.gegenprobe_fehlt.map((g) => `P4P: ${g.name}, ${g.turnier}, ${g.disziplin} Rang ${g.rang} ohne Gegenprobe auf der Ergebnisseite`));

// 2. STF: Coral-Tour 78, alle gewerteten Turniere (ohne Finals, League, Cup)
const stf = [];
for (const saison of pflege.stf_saisons) {
  const lokal = new Set();
  const l0 = await holeJson(`https://api.tablesoccer.org/cms.tournaments?tour=78&season=${saison}`);
  const liste = new Map(l0.tournaments.map((t) => [t.code, t]));
  for (const t of l0.tournaments) lokal.add(t.locality);
  for (const ort of lokal) for (const t of (await holeJson(`https://api.tablesoccer.org/cms.tournaments?tour=78&season=${saison}&locality=${encodeURIComponent(ort)}`)).tournaments) liste.set(t.code, t);
  if (l0.tournaments.length >= 50) offen.push(`STF Saison ${saison}: die Abfrage liefert höchstens 50 Turniere, vollständig nur über die Orte`);
  for (const t of liste.values()) if (t.status === 'finished' && !STF_AUSGESCHLOSSEN.test(t.category.name)) stf.push(t);
}
for (const t of stf) {
  const v = await store(t.code);
  if (!v) { offen.push(`STF ${t.name}: Coral liefert keine Daten`); continue; }
  eintraege.push(...coralAbleiten(v, { code: t.code, name: t.name, start_on: t.start_on, serie: 'STF' }, P, datum));
}
// 3. ITSF: World Series (WS) und World Cup (ITSF)
for (const x of pflege.itsf_turniere) {
  const v = await store(x.kurz);
  if (!v) { offen.push(`${x.serie} ${x.kurz}: Coral liefert keine Daten`); continue; }
  eintraege.push(...coralAbleiten(v, { code: x.kurz, name: v.tournament.name, start_on: String(v.tournament.start_at).slice(0, 10), serie: x.serie }, P, datum));
}
const liste = doppelte(eintraege).sort((a, b) => b.datum.localeCompare(a.datum) || a.turnier.localeCompare(b.turnier, 'de') || a.disziplin.localeCompare(b.disziplin, 'de') || a.rang - b.rang);
offen.push(...(pflege.turniere_offen || []));
schreibeJson(path.join(DATEN, 'turniere.json'), { abgerufen: datum, hinweis: 'Handdatei, vom Sammelskript erzeugt. Personen als Namenskennung der Spielerliste, Quelle je Eintrag.', eintraege: liste, offen });

// 4. Champions League
const teilnahmen = [];
for (const x of pflege.champions_turniere) {
  const code = x.seite.split('/').pop();
  const v = await store(code);
  if (!v) { offen.push(`Champions League ${code}: Coral liefert keine Daten`); continue; }
  teilnahmen.push(...championsAbleiten(v, { code }, P, new RegExp(pflege.champions_muster, 'i'), datum));
}
teilnahmen.sort((a, b) => b.datum.localeCompare(a.datum));
schreibeJson(path.join(DATEN, 'champions-league.json'), { abgerufen: datum, hinweis: 'Handdatei, vom Sammelskript erzeugt. Teilnahmen des Clubs; Kader nur mit Lizenz LUZE.', teilnahmen, offen: pflege.champions_offen || [] });
console.error(`Turniere: ${liste.length} Einträge (${offen.length} offen), Champions League: ${teilnahmen.length} Teilnahmen`);
