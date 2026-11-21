#!/usr/bin/env node
// Verbandsturniere vor der Coral-Zeit (STS, STRT, STRT Pro bis 2024): liest die archivierten Ergebnisseiten des
// Verbands (Web-Archiv, «turnierdisziplinen»), sucht Rang 1 bis 3 der Spieler mit Lizenz LUZE und der Ehrenmitglieder
// und schreibt die Einträge in die Handdatei daten/stf-archiv.json. Die Turnierliste steht in derselben Datei
// (`turnierliste`, übernommen aus der Liste des TFCZ, website/hall-of-fame/stf-turniere.md).
//   node tools/stf-archiv.mjs [--cache <ordner>] [--trocken]
// Abgleich: Name gegen spieler.json; dazu die Verbandsnummer im Link der Ergebnisseite, nur im Speicher (so zählt
// ein früherer Name derselben Person). Plätze, die schon unter P4P, Coral oder FAST stehen (gleiche Person, gleicher
// Rang, gleiche Disziplinart, Turnierfenster ±2 Tage), stehen nicht noch einmal. Personen in `stf_nicht_zaehlen`
// (pflege.json) fallen weg und stehen mit Grund unter `nicht_gezaehlt`.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { liesJson, schreibeJson, heute, schluessel } from './gemeinsam.mjs';
import { personen } from './erneuern.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEN = path.join(HIER, '..', 'daten');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const cache = arg('--cache') || path.join(os.tmpdir(), 'tfcl-stf-archiv-cache');
fs.mkdirSync(cache, { recursive: true });
const trocken = process.argv.includes('--trocken');

const ent = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è');

// Ergebnisseite: Name, Kopfzeile, je Disziplin Titel, Beginn und Rang 1 bis 3 mit Namen (und Verbandsnummer im Link).
export function ergebnisseite(h) {
  const name = ent((h.match(/stf-page-subtitle-1[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '');
  const teile = h.split(/<h2\s+class="stf-page-subtitle-2/).slice(1);
  const disz = teile.map((t) => {
    const titel = ent((t.match(/^[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '');
    const b = t.match(/Beginn:\s*(\d\d)\.(\d\d)\.(\d\d)/);
    const plaetze = [...t.split('stf-tournamentresult-detail-results-more')[0].matchAll(/stf-tournamentresult-detail-result-item">\s*<span>([\s\S]*?)<\/span>\s*<\/div>/g)].map((m) => {
      const links = [...m[1].matchAll(/<a([^>]*)>([\s\S]*?)<\/a>/g)];
      const namen = links.map((x) => ent(x[2])), nrn = links.map((x) => (x[1].match(/[?&;]id=(\d+)/) || [])[1] || null);
      const r = (namen[0] || '').match(/^(\d+)\.\s*(.*)$/);
      return r ? { rang: +r[1], namen: [r[2], ...namen.slice(1)], nrn } : null;
    }).filter(Boolean);
    return { titel, beginn: b ? `20${b[3]}-${b[2]}-${b[1]}` : null, plaetze };
  });
  return { name, disz };
}

// Disziplinart wie beim FAST-Abgleich: Einzel oder Doppel und Klasse («Rookie Doubles» = «Neulinge Doppel»).
export function art(d) {
  const s = d.toLowerCase();
  const form = /single|einzel|simple|goalie/.test(s) ? 'E' : /double|doppel|dyp|d\.y\.p|draw your|mixed|team/.test(s) ? 'D' : '?';
  const k = /dyp|d\.y\.p|draw your/.test(s) ? 'Y' : /mixed/.test(s) ? 'X' : /wom|damen|ladies|féminin/.test(s) ? 'W' : /senior|o50|ü50/.test(s) ? 'S' : /junior|u1\d|u2\d/.test(s) ? 'J' : /neuling|novice|rookie|beginner|débutant/.test(s) ? 'N' : /amat|semi|pro-am|hobby/.test(s) ? 'A' : /classic/.test(s) ? 'C' : 'O';
  return form + k;
}
const tage = (d) => Math.round(Date.parse(d) / 864e5);
export function dublette(e, id, bestand) {
  const passt = (a, b) => (a[0] === b[0] || a[0] === '?' || b[0] === '?') && a[1] === b[1];
  return bestand.find((b) => b.personen.includes(id) && b.rang === e.rang && Math.abs(tage(b.datum) - tage(e.datum)) <= 2 && passt(art(b.disziplin), art(e.disziplin))) || null;
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));
async function hole(url) {
  const f = path.join(cache, url.replace(/[^a-z0-9]+/gi, '_').slice(0, 200) + '.html');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  for (let v = 0; v < 6; v++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { 'user-agent': 'Mozilla/5.0 (Hall of Fame, nur lesend)' } });
      if (r.ok) { const t = await r.text(); if (!/Temporarily Offline/.test(t)) { fs.writeFileSync(f, t); await warte(800); return t; } }
    } catch {}
    await warte(5000 * (v + 1));
  }
  throw new Error('Web-Archiv nicht erreichbar: ' + url);
}
// Rohstand ohne Rahmen des Web-Archivs: Zeitstempel + «id_».
const roh = (q) => q.replace(/(web\.archive\.org\/web\/\d+)\//, '$1id_/');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const datum = heute();
  const datei = path.join(DATEN, 'stf-archiv.json');
  const alt = liesJson(datei);
  const pflege = liesJson(path.join(DATEN, 'pflege.json'));
  const spielerDatei = liesJson(path.join(DATEN, 'spieler.json'));
  const ehren = (pflege.ehrenmitglieder || []).map((n) => ({ id: n.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-'), name: n, ehrenmitglied: true }));
  const P = personen({ ...spielerDatei, spieler: [...spielerDatei.spieler, ...ehren] }, pflege.nicht_nennen || []);
  const nichtZaehlen = new Map((pflege.stf_nicht_zaehlen || []).map((x) => [x.person, x.grund]));
  const bestand = [...liesJson(path.join(DATEN, 'turniere.json')).eintraege, ...liesJson(path.join(DATEN, 'fast.json')).eintraege];

  // 1. Alle Seiten lesen; Verbandsnummer -> Person aus Namenstreffern (bleibt im Speicher)
  const seiten = [];
  for (const t of alt.turnierliste) {
    const h = await hole(roh(t.quelle));
    const s = ergebnisseite(h);
    if (!s.disz.length) throw new Error(`Ergebnisseite ohne Disziplinen (Aufbau verändert?): ${t.turnier} ${t.datum}`);
    seiten.push({ t, s });
    const b = s.disz.map((d) => d.beginn).filter(Boolean).map(tage);
    if (b.length && Math.max(...b) - Math.min(...b) > 3 && !t.hinweis) console.log(`Hinweis: ${t.turnier} ${t.datum}, Beginn der Disziplinen liegt mehr als 3 Tage auseinander`);
  }
  const nrVon = new Map();
  for (const { s } of seiten) for (const d of s.disz) for (const p of d.plaetze) p.namen.forEach((n, i) => { const x = P.finde(n); if (x && p.nrn[i]) nrVon.set(p.nrn[i], x); });

  // 2. Rang 1 bis 3 je Disziplin
  const eintraege = [], dubletten = [], nichtGezaehlt = [];
  let plaetze = 0;
  for (const { t, s } of seiten) for (const d of s.disz) for (const p of d.plaetze) {
    if (p.rang > 3) continue;
    const ids = [...new Set(p.namen.map((n, i) => (P.finde(n) || (p.nrn[i] && nrVon.get(p.nrn[i])) || null)).filter(Boolean).map((x) => x.id))];
    if (!ids.length) continue;
    // Datum: Beginn der Disziplin; ohne Beginn oder bei einem Hinweis in der Turnierliste (Seite fehlerhaft) das Datum der Liste
    const tag = d.beginn && !t.hinweis ? d.beginn : t.datum;
    const e = { jahr: Number(tag.slice(0, 4)), datum: tag, turnier: s.name || t.turnier, serie: 'STF', disziplin: d.titel, rang: p.rang, personen: [], quelle: t.quelle, abgerufen: datum };
    for (const id of ids) {
      if (nichtZaehlen.has(id)) { nichtGezaehlt.push({ person: id, datum: tag, turnier: e.turnier, disziplin: e.disziplin, rang: e.rang, grund: nichtZaehlen.get(id) }); continue; }
      const b = dublette(e, id, bestand);
      if (b) { dubletten.push({ person: id, datum: tag, turnier: e.turnier, disziplin: e.disziplin, rang: e.rang, schon: `${b.serie}: ${b.turnier}, ${b.disziplin}` }); continue; }
      e.personen.push(id);
    }
    if (e.personen.length) { e.personen.sort(); eintraege.push(e); plaetze += e.personen.length; }
  }
  // 3. Von Hand belegte Plätze aus News des Verbands (`news`, wenn keine Ergebnisseite archiviert ist), gleicher Abgleich
  for (const n of alt.news || []) {
    const e = { ...n, personen: [] };
    for (const id of n.personen) {
      if (nichtZaehlen.has(id)) { nichtGezaehlt.push({ person: id, datum: n.datum, turnier: n.turnier, disziplin: n.disziplin, rang: n.rang, grund: nichtZaehlen.get(id) }); continue; }
      const b = dublette(n, id, bestand);
      if (b) { dubletten.push({ person: id, datum: n.datum, turnier: n.turnier, disziplin: n.disziplin, rang: n.rang, schon: `${b.serie}: ${b.turnier}, ${b.disziplin}` }); continue; }
      e.personen.push(id);
    }
    if (e.personen.length) { eintraege.push(e); plaetze += e.personen.length; }
  }
  eintraege.sort((a, b) => b.datum.localeCompare(a.datum) || a.turnier.localeCompare(b.turnier) || a.disziplin.localeCompare(b.disziplin) || a.rang - b.rang);
  const neu = { ...alt, abgerufen: datum, eintraege, dubletten, nicht_gezaehlt: nichtGezaehlt };
  console.log(`Seiten ${seiten.length}, Einträge ${eintraege.length}, Plätze ${plaetze}, Dubletten ${dubletten.length}, nicht gezählt ${nichtGezaehlt.length}`);
  for (const r of [1, 2, 3]) console.log(`Rang ${r}: ${eintraege.filter((e) => e.rang === r).reduce((n, e) => n + e.personen.length, 0)}`);
  if (!trocken) schreibeJson(datei, neu);
}
