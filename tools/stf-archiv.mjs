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
import { STF_AUSGESCHLOSSEN } from './turniere.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEN = path.join(HIER, '..', 'daten');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const cache = arg('--cache') || path.join(os.tmpdir(), 'tfcl-stf-archiv-cache');
fs.mkdirSync(cache, { recursive: true });
const trocken = process.argv.includes('--trocken');

const ent = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&Uuml;/g, 'Ü');

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
  const teilnehmer = [...h.matchAll(/<a[^>]*[?&;]id=(\d+)[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ nr: m[1], name: ent(m[2]).replace(/^\d+\.\s*/, '') })).filter((x) => x.name);
  return { name, disz, teilnehmer };
}

// Archivierte Spielerseite des Verbands: Abschnitt «Turnier Platzierungen», je Zeile Saison, Turnier, Disziplin, Datum, Rang.
export function spielerseite(h) {
  const i = h.indexOf('Turnier Platzierungen'); if (i < 0) return null;
  const j = h.indexOf('Einzel Resultate', i); const t = h.slice(i, j > i ? j : undefined);
  const zeilen = []; let saison = null;
  const re = /stf-spieler-detail__ranking-year">([^<]*)<|stf-spieler-detail-ranking__tournament">([\s\S]*?)<\/span>\s*<span class="stf-spieler-detail-ranking__discipline">([\s\S]*?)<\/span>\s*<span class="stf-spieler-detail-ranking__date">([\s\S]*?)<\/span>\s*<span class="stf-spieler-detail-ranking__rank">([\s\S]*?)<\/span>/g;
  for (const m of t.matchAll(re)) {
    if (m[1] !== undefined) { saison = ent(m[1]); continue; }
    const [d, mo, y] = ent(m[4]).split('.'); const r = ent(m[5]).match(/^(\d+)\s*von\s*(\d+)/);
    if (r && y) zeilen.push({ saison, turnier: ent(m[2]), disziplin: ent(m[3]), datum: `${y}-${mo}-${d}`, rang: +r[1] });
  }
  return zeilen;
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
  for (const { s } of seiten) for (const x of s.teilnehmer) { const p = P.finde(x.name); if (p) nrVon.set(x.nr, p); }

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
  // 4. Archivierte Spielerseiten (Vasco 2026-11-21, «F1 ja»): Plätze aus Turnieren ohne archivierte Ergebnisseite.
  //    Je Verbandsnummer einer Person die Seiten im Web-Archiv (CDX), davon die jüngste, älteste und mittlere Fassung.
  //    Eine Zeile zählt nicht, wenn die Person dort schon steht (Ergebnisseite, News, FAST, Coral, P4P: gleiche Disziplinart
  //    und Rang, ±2 Tage, oder gleicher Turniername ±60 Tage, weil Spielerseiten teils ein anderes Datum nennen).
  const cdx = [];
  for (const host of ['swisstablesoccer.ch', 'stf-tischfussball.ch', 'www.swisstablesoccer.ch', 'www.stf-tischfussball.ch']) {
    const t = await hole(`https://web.archive.org/cdx/search/cdx?url=${host}/index.php/&matchType=prefix&filter=original:.*task=spieler_details.*&filter=statuscode:200&fl=timestamp,original&output=json&collapse=original`);
    try { cdx.push(...JSON.parse(t).slice(1).map((x) => x[1])); } catch { throw new Error(`CDX ${host}: Antwort nicht lesbar`); }
  }
  const nrsVon = new Map(); for (const [nr, p] of nrVon) { if (!nrsVon.has(p.id)) nrsVon.set(p.id, []); nrsVon.get(p.id).push(nr); }
  const schon = (id) => [...bestand, ...eintraege, ...dubletten.map((x) => ({ ...x, personen: [x.person] })), ...nichtGezaehlt.map((x) => ({ ...x, personen: [x.person] }))].filter((b) => b.personen.includes(id));
  const nameGleich = (a, b) => a.toLowerCase().replace(/[^a-z]/g, '') === b.toLowerCase().replace(/[^a-z]/g, '');
  let ausSpielerseiten = 0;
  for (const [id, nrs] of nrsVon) {
    const originale = cdx.filter((o) => !/turnierid/.test(o) && nrs.some((nr) => new RegExp(`[?&;]id=${nr}(&|$)`).test(o)));
    const fassungen = [];
    for (const o of originale) { const t = await hole(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(o)}&output=json&fl=timestamp,original&filter=statuscode:200`); try { fassungen.push(...JSON.parse(t).slice(1)); } catch {} }
    fassungen.sort((a, b) => a[0].localeCompare(b[0]));
    if (!fassungen.length) continue;
    const zeilen = new Map();
    for (const [ts, o] of [...new Set([fassungen[fassungen.length - 1], fassungen[0], fassungen[Math.floor(fassungen.length / 2)]])]) {
      const z = spielerseite(await hole(`https://web.archive.org/web/${ts}id_/${o}`)); if (!z) continue;
      for (const r of z) { const k = `${r.turnier}|${r.disziplin}|${r.datum}`; if (!zeilen.has(k)) zeilen.set(k, { ...r, quelle: `https://web.archive.org/web/${ts}/${o}` }); }
    }
    for (const r of zeilen.values()) {
      if (r.rang > 3 || r.datum >= '2024-09-01' || !/^\d{4}-\d\d-\d\d$/.test(r.datum)) continue;
      if (STF_AUSGESCHLOSSEN.test(r.turnier) && !/Garlando Finals|Foos Finals/i.test(r.turnier)) continue;
      const e = { jahr: Number(r.datum.slice(0, 4)), datum: r.datum, turnier: r.turnier, serie: 'STF', disziplin: r.disziplin, rang: r.rang, personen: [id], quelle: r.quelle, abgerufen: datum };
      const da = schon(id);
      const b = dublette(e, id, da) || da.find((x) => x.rang === e.rang && art(x.disziplin) === art(e.disziplin) && nameGleich(x.turnier, e.turnier) && Math.abs(tage(x.datum) - tage(e.datum)) <= 60);
      if (b) continue;
      if (nichtZaehlen.has(id)) { nichtGezaehlt.push({ person: id, datum: e.datum, turnier: e.turnier, disziplin: e.disziplin, rang: e.rang, grund: nichtZaehlen.get(id) }); continue; }
      const gleich = eintraege.find((x) => x.quelle.includes('spieler_details') && x.datum === e.datum && x.turnier === e.turnier && x.disziplin === e.disziplin && x.rang === e.rang);
      if (gleich) gleich.personen = [...new Set([...gleich.personen, id])].sort(); else eintraege.push(e);
      plaetze++; ausSpielerseiten++;
    }
  }
  console.log(`Aus Spielerseiten: ${ausSpielerseiten} Plätze`);
  eintraege.sort((a, b) => b.datum.localeCompare(a.datum) || a.turnier.localeCompare(b.turnier) || a.disziplin.localeCompare(b.disziplin) || a.rang - b.rang);
  const neu = { ...alt, abgerufen: datum, eintraege, dubletten, nicht_gezaehlt: nichtGezaehlt, zurueckgestellt: [] };
  console.log(`Seiten ${seiten.length}, Einträge ${eintraege.length}, Plätze ${plaetze}, Dubletten ${dubletten.length}, nicht gezählt ${nichtGezaehlt.length}`);
  for (const r of [1, 2, 3]) console.log(`Rang ${r}: ${eintraege.filter((e) => e.rang === r).reduce((n, e) => n + e.personen.length, 0)}`);
  if (!trocken) schreibeJson(datei, neu);
}
