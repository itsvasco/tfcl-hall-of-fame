#!/usr/bin/env node
// Test ohne Netz mit festen Eingaben: Zuordnung, Zählung je Bereich, Abbruch bei fremdem Format, Gegenprobe, nicht_nennen.
// Aufruf: node tools/erneuern-test.mjs   (Exit 0 = alles bestanden)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { personen, kurzwert, smAbleiten, ranglisteCms, archivLesen, ranglisteArchiv, natiAbleiten, pdfLesen, ligaAbleiten, raengeVon, fordereAbleiten, bauen, haupt, vorNach } from './erneuern.mjs';
import { anzeigeName, schluessel } from './gemeinsam.mjs';
import { lizenzen, alsDatei } from './spieler.mjs';
import { pruefeText } from './datenschutz-pruefen.mjs';
import { coralAbleiten, championsAbleiten, doppelte, turnierName, turnierDatum } from './turniere.mjs';
import { galerie, platzierungen, ergebnis } from './p4p.mjs';
import { ergebnisseite, art, dublette } from './stf-archiv.mjs';
import * as R from '../site/js/rendern.js';

let ok = 0; const fehler = [];
async function test(name, fn) { try { await fn(); ok++; } catch (f) { fehler.push(`${name}: ${f.message}`); } }
const wirft = async (fn, teil) => { let e = null; try { await fn(); } catch (f) { e = f; } assert.ok(e, 'sollte abbrechen'); if (teil) assert.match(e.message, teil); };

// ---------- feste Eingaben ----------
const SPIELER = { club: 'XYZC', spieler: [
  { id: 'anna-muster', name: 'Anna Muster', schreibweisen: ['MUSTER Anna'] },
  { id: 'beat-beispiel', name: 'Beat Beispiel', schreibweisen: ['BEISPIEL Beat'] },
  { id: 'carla-von-test', name: 'Carla Von Test', schreibweisen: ['VON TEST Carla'] },
  { id: 'dario-drei', name: 'Dario Drei', schreibweisen: ['DREI Dario'] },
] };
const FREMD = 'Fremd Franz'; // hat keine Lizenz des Clubs
const P = personen(SPIELER);
const DATUM = '2026-01-02';

const SM = {
  'Men Singles': { '2025': { 1: { rank: 1, players: [{ name: 'Beispiel Beat' }] }, 2: { rank: 2, players: [{ name: FREMD }] }, 3: { rank: 3, players: [{ name: 'Dritter Dirk' }] } },
                   '2016-1': { 1: { rank: 1, players: [{ name: 'Fremd Franz' }] }, 2: { rank: 2, players: [{ name: 'Beispiel Beat H.' }] }, 3: { rank: 3, players: [{ name: 'Nobody Nina' }] } } },
  'Men Doubles': { '2024': { 1: { rank: 1, players: [{ name: 'Muster Anna' }, { name: 'Partner Peter' }] }, 2: { rank: 2, players: [{ name: 'Beispiel Beat' }, { name: 'Muster Anna' }] } } },
};
const cmsLeer = () => ({ standings: [{ rank: 1, team: [{ player: 'FREMD Franz' }] }, { rank: 2, team: [{ player: 'ANDERER Alex' }] }, { rank: 3, team: [{ player: 'NOBODY Nina' }] }, { rank: 4, team: [{ player: 'MUSTER Anna' }] }], pages: 1 });
const cmsHolen = async (nr, kat) => (Number(kat) === 308
  ? { standings: [{ rank: 1, team: [{ player: 'MUSTER Anna' }] }, { rank: 2, team: [{ player: 'FREMD Franz' }] }, { rank: 3, team: [{ player: 'DREI Dario' }] }], pages: 1 }
  : cmsLeer());
const archivHtml = (jahr, a = 'Anna Muster') => {
  const kat = ['Open Doubles', 'Open Single', 'Woman Doubles', 'Woman Single', 'Mixed'];
  return `<html><script>x</script><body><h1>Ranking SwissTablesoccer ${jahr}</h1>` + kat.map((k, i) => `<div><h4>${k} ${jahr}</h4><p>1. ${i === 0 ? a : 'Fremd Franz'}</p><p>1000 Punkte</p><p>2. Nobody Nina</p><p>3. Dritter Dirk</p><p>Gesamte Rangliste anzeigen</p></div>`).join('') + '</body></html>';
};
const kopf = (liga, y) => [
  { seite: 1, x: 200, y: y + 14, str: liga }, { seite: 1, x: 50, y, str: 'Rank' }, { seite: 1, x: 79, y, str: 'Club' }, { seite: 1, x: 250, y, str: 'Team' }];
const zeile = (y, rang, club, team) => [{ seite: 1, x: 50, y, str: String(rang) }, { seite: 1, x: 79, y, str: club }, { seite: 1, x: 250, y, str: team }];
const PDF_NEU = [
  ...kopf('Super League', 900), ...zeile(886, 1, 'TFC Beispielstadt', 'TFC Beispielstadt 1'), ...zeile(872, 2, 'TFC Andere', 'Andere 1'), ...zeile(858, 3, 'TFC Dritte', 'Dritte 1'),
  ...kopf('Challenge League', 800), ...zeile(786, 1, 'TFC Andere', 'Andere 2'), ...zeile(772, 2, 'TFC Dritte', 'Dritte 2'), ...zeile(758, 3, 'Club Xyzc', 'XYZC 2'),
  ...kopf('Promotion League', 700), ...zeile(686, 1, 'A', 'A'), ...zeile(672, 2, 'B', 'B'), ...zeile(658, 3, 'C', 'C'),
  ...kopf('Swiss Tablesoccer Cup', 600), ...zeile(586, 1, 'Club Xyzc', 'Xyzc Cup'),
];
const PDF_ALT = [
  { seite: 1, x: 100, y: 950, str: 'SCHLUSS-RANGLISTE 2019' },
  { seite: 1, x: 150, y: 930, str: 'Super League' }, { seite: 1, x: 50, y: 915, str: 'Rang' }, { seite: 1, x: 120, y: 915, str: 'Club / Team' }, { seite: 1, x: 400, y: 915, str: 'Heimtisch' },
  ...[['1', 'TFC Fremd 1'], ['2', 'XYZC 1'], ['3', 'Dritter']].flatMap(([r, t], i) => [{ seite: 1, x: 50, y: 900 - i * 14, str: r }, { seite: 1, x: 120, y: 900 - i * 14, str: t }, { seite: 1, x: 400, y: 900 - i * 14, str: 'Garlando' }]),
  { seite: 1, x: 150, y: 830, str: 'Challenge Leauge' }, { seite: 1, x: 50, y: 815, str: 'Rang' }, { seite: 1, x: 120, y: 815, str: 'Club / Team' },
  ...[['1', 'Eins'], ['2', 'Zwei'], ['3', 'Drei']].flatMap(([r, t], i) => [{ seite: 1, x: 50, y: 800 - i * 14, str: r }, { seite: 1, x: 120, y: 800 - i * 14, str: t }]),
  { seite: 2, x: 50, y: 900, str: '4' }, { seite: 2, x: 120, y: 900, str: 'Vier' },
  { seite: 1, x: 150, y: 730, str: 'Women League' }, { seite: 1, x: 50, y: 715, str: 'Rang' }, { seite: 1, x: 120, y: 715, str: 'Club / Team' },
  ...[['1', 'Eins'], ['2', 'Zwei'], ['3', 'Drei']].flatMap(([r, t], i) => [{ seite: 1, x: 50, y: 700 - i * 14, str: r }, { seite: 1, x: 120, y: 700 - i * 14, str: t }]),
];
const spiel = (id, h, hp, g, gp, hs, gs, extra = {}) => ({ id, roundOf: null, homeName: h, homePlayers: hp, guestName: g, guestPlayers: gp, homeScore: hs, guestScore: gs, playDate: `2024-05-0${id}`, ...extra });
const FINALTAG = { competitions: [
  { id: 1, name: '1. Liga Garlando - KO', tableType: 'Garlando Deluxe', mode: 'single_ko', matches: [
    spiel(1, 'Alpha', ['Anna Muster', 'Fremd Franz'], 'Beta', ['X Y', 'Z W'], 2, 0), spiel(2, 'Gamma', ['G H', 'I J'], 'Delta', ['K L', 'Dario Drei'], 2, 1),
    spiel(3, 'Alpha', ['Anna Muster', 'Fremd Franz'], 'Gamma', ['G H', 'I J'], 2, 1), spiel(4, 'Beta', ['X Y', 'Z W'], 'Delta', ['K L', 'Dario Drei'], 2, 0)] },
  { id: 2, name: 'Vorrunde', tableType: 'Garlando', mode: 'group', matches: [spiel(9, 'A', [], 'B', [], 1, 0)] },
] };
const store = (nameJahr, rang3Land = 'CH') => ({
  tournament: { name: nameJahr, start_at: '2025-05-01 10:00', address: null, status: 'finished' },
  competitions: { 1: { id: 1, name: 'Men National Team', status: 'finished', team_category: { short_name: 'MN42', player_count: 4 }, standings: { 1: 10, 2: 11, 3: 12 } },
                  2: { id: 2, name: 'ITSF League', status: 'finished', team_category: { short_name: 'MT36', player_count: 3 }, standings: { 1: 12 } } },
  teams: { 10: { id: 10, rename: 'Germany', land: 'DE' }, 11: { id: 11, rename: 'France', land: 'FR' }, 12: { id: 12, rename: 'Switzerland', land: rang3Land } },
  players: { 1: { first_name: 'Anna', last_name: 'Muster' }, 2: { first_name: 'Franz', last_name: 'Fremd' }, 3: { first_name: 'Dario', last_name: 'Drei' } },
  competition_players: { a: { team_id: 12, player_id: 3, status: 'confirmed' }, b: { team_id: 12, player_id: 2, status: 'removed' } },
  team_players_index: { 12: [1, 2] },
});
const PFLEGE = { club: 'XYZC', clubname: 'TFC Beispielstadt', nicht_nennen: [],
  ranglisten: { cms: [{ nr: 191, saison: 2025, status: 'Schlussstand' }], archiv: [{ saison: 2024, status: 'stabil', staende: ['1', '2'] }], offen: ['Test offen'] },
  nati_turniere: ['t-2025'], clubliga_muster: 'xyzc', clubliga_jahre: [2026, 2019], fordere: { luzern: { 7: { saison: '2023/24', jahr: 2024 } } } };
const holen = (ueberschreib = {}) => ({
  sm: async () => SM, rangliste: cmsHolen, archiv: async () => archivHtml(2024),
  coral: async () => ({ 't-2025': store('World Series Test 2025') }),
  pdf: async (j) => (j === 2019 ? PDF_ALT : PDF_NEU), fordere: async () => FINALTAG, ...ueberschreib,
});
const alsText = (x) => JSON.stringify(x);

// ---------- Zuordnung ----------
await test('Schlüssel: Reihenfolge und Grossschreibung egal', () => { assert.equal(schluessel('VON TEST Carla'), schluessel('Carla von Test')); assert.equal(P.finde('von Test Carla').id, 'carla-von-test'); assert.equal(P.finde(FREMD), null); });
await test('Anzeigename aus Verbandsschreibweise', () => { assert.equal(anzeigeName('VAN STOKKUM Rayan'), 'Rayan Van Stokkum'); assert.equal(anzeigeName('FLÜELER Daniel'), 'Daniel Flüeler'); assert.equal(vorNach('van Stokkum Rayan'), 'Rayan van Stokkum'); assert.equal(vorNach('Felder Martin H.'), 'Martin H. Felder'); });
await test('Spielerliste: nur memberships mit Clubkürzel, Abbruch wenn der Filter nicht greift', async () => {
  const hole = async (url) => (url.includes('category=') && !url.includes('season=') ? { seasons: [{ id: 5 }, { id: 4 }, { id: 3 }] }
    : { member: 'XYZC', pages: 1, standings: [{ team: [{ player: 'MUSTER Anna', memberships: ['STF', 'XYZC'] }, { player: 'FREMD Franz', memberships: ['STF', 'ANDERS'] }] }] });
  const l = await lizenzen('XYZC', hole);
  assert.deepEqual([...l.spieler.values()].map((e) => e.name), ['Anna Muster']);
  assert.deepEqual(l.saisons, [5, 4]);
  const d = alsDatei('XYZC', l, DATUM); assert.equal(d.spieler.length, 1); assert.ok(!alsText(d).includes('Fremd'));
  await wirft(() => lizenzen('XYZC', async (u) => (u.includes('season=') ? { member: 'ANDERS', standings: [] } : { seasons: [{ id: 5 }] })), /Filter/);
});

// ---------- Zählung je Bereich ----------
await test('SM: Zählung, Partner mit Namen, Fremde nie als Eintrag', () => {
  const r = smAbleiten(SM, P, DATUM);
  const a = r.eintraege.get('anna-muster'); const b = r.eintraege.get('beat-beispiel');
  assert.equal(a.length, 2); assert.equal(b.length, 2); // Anna: 2024 Doppel Rang 1 und 2; Beat: 2025 Einzel Rang 1, 2024 Doppel Rang 2
  const doppel1 = a.find((e) => e.rang === 1); assert.deepEqual(doppel1.partner, [{ name: 'Partner', id: null }]); // Partner ohne Lizenz nie mit Namen
  const doppel2 = b.find((e) => e.kategorie === 'Herren Doppel'); assert.deepEqual(doppel2.partner, [{ name: 'Anna Muster', id: 'anna-muster' }]);
  assert.ok([...r.eintraege.keys()].every((k) => ['anna-muster', 'beat-beispiel'].includes(k)));
  assert.ok(a.every((e) => e.quelle.startsWith('https://') && e.abgerufen === DATUM));
  assert.equal(b.find((e) => e.jahr === 2025).event, null);
});
await test('SM: Name mit Zusatz wird als offen gemeldet, nicht gezählt', () => {
  const r = smAbleiten(SM, P, DATUM);
  assert.ok(r.offen.some((o) => o.includes('Beat Beispiel') && !o.includes('Beispiel Beat H.'))); // nennt nur die Lizenz, nie den Rohnamen
  assert.ok(!r.eintraege.get('beat-beispiel').some((e) => e.jahr === 2016));
});
await test('Jahresrangliste cms: Rang 1 bis 3, Fremde und Rang 4 nie', () => {
  const seiten = Object.fromEntries([312, 308, 314, 310, 316, 315, 311, 313, 309].map((k) => [k, [k === 308 ? { standings: [{ rank: 1, team: [{ player: 'MUSTER Anna' }] }, { rank: 2, team: [{ player: 'FREMD Franz' }] }, { rank: 3, team: [{ player: 'DREI Dario' }] }, { rank: 4, team: [{ player: 'BEISPIEL Beat' }] }] } : cmsLeer()]]));
  const r = ranglisteCms(seiten, 191, 2025, 'Schlussstand', P, DATUM);
  assert.deepEqual(r.map((x) => `${x.person}:${x.kategorie}:${x.rang}`).sort(), ['anna-muster:Open Einzel:1', 'dario-drei:Open Einzel:3']);
});
await test('Jahresrangliste Archiv: lesen, stabil, abweichender Stand bricht ab', async () => {
  assert.equal(archivLesen(archivHtml(2024), 2024).length, 15);
  const gut = ranglisteArchiv([{ zeitstempel: '1', html: archivHtml(2024) }, { zeitstempel: '2', html: archivHtml(2024) }], 2024, 'stabil', P, DATUM);
  assert.deepEqual(gut.map((x) => [x.person, x.kategorie, x.rang]), [['anna-muster', 'Open Doppel', 1]]);
  assert.match(gut[0].quelle, /^https:\/\/web\.archive\.org\/web\/2\//);
  await wirft(() => ranglisteArchiv([{ zeitstempel: '1', html: archivHtml(2024) }, { zeitstempel: '2', html: archivHtml(2024, 'Beat Beispiel') }], 2024, 'stabil', P, DATUM), /nicht stabil/);
  await wirft(() => ranglisteArchiv([{ zeitstempel: '1', html: archivHtml(2024) }], 2024, 'stabil', P, DATUM), /zwei/);
  await wirft(() => archivLesen(archivHtml(2023), 2024), /gehört nicht zur Saison/);
  await wirft(() => archivLesen('<html><body>Wartung</body></html>', 2024), /Seitenaufbau/);
});
await test('Nati: nur Schweizer Nationalteam auf dem Podest, je Person im Kader, Fremde nie', () => {
  const r = natiAbleiten({ 't-2025': store('World Series Test 2025') }, P, DATUM);
  assert.equal(r.eintraege.length, 1);
  const e = r.eintraege[0];
  assert.deepEqual([e.jahr, e.turnier, e.team, e.rang, e.kader], [2025, 'World Series Test', 'Herren', 3, 3]);
  assert.deepEqual(e.personen, ['anna-muster', 'dario-drei']);
  assert.ok(!alsText(r).includes('Fremd'));
  assert.equal(natiAbleiten({ 't-2025': store('X 2025', 'DE') }, P, DATUM).eintraege.length, 0);
  assert.ok(natiAbleiten({ leer: null }, P, DATUM).offen[0].includes('leer'));
});
await test('Clubliga: Teams mit Clubkürzel, Cup zählt nicht, alte und neue Spalten', () => {
  const neu = ligaAbleiten(PDF_NEU, 2026, DATUM, 'xyzc');
  assert.deepEqual(neu.eintraege.map((e) => [e.liga, e.team, e.rang]), [['Challenge League', 'XYZC 2', 3]].map((x) => x));
  assert.equal(neu.offen.length, 0);
  assert.ok(ligaAbleiten(PDF_NEU, 2026, DATUM, 'beispielstadt').eintraege.length === 1 && ligaAbleiten(PDF_NEU, 2026, DATUM, 'beispielstadt').eintraege[0].rang === 1);
  const alt = ligaAbleiten(PDF_ALT, 2019, DATUM, 'xyzc');
  assert.deepEqual(alt.eintraege.map((e) => [e.liga, e.team, e.rang]), [['Super League', 'XYZC 1', 2]]);
  assert.equal(pdfLesen(PDF_ALT).tabellen.find((t) => t.liga === 'Women League').zeilen.length, 4); // Fortsetzung auf Seite 2 gehört zur letzten Tabelle der Vorseite
});
await test('Clubliga: Titeljahr und Aufbau werden geprüft', async () => {
  await wirft(() => ligaAbleiten(PDF_ALT, 2018, DATUM, 'xyzc'), /Jahreszahl/);
  await wirft(() => ligaAbleiten([{ seite: 1, x: 1, y: 1, str: 'Wartung' }], 2026, DATUM), /nicht lesbar/);
});
await test('Fordere: Ableitung Rang 1 bis 3, nur Lizenz-Spieler, nur KO', () => {
  const r = raengeVon(FINALTAG.competitions[0]);
  assert.deepEqual(r.raenge.map((x) => [x.rang, x.name]), [[1, 'Alpha'], [2, 'Gamma'], [3, 'Beta']]);
  const f = fordereAbleiten({ 7: FINALTAG }, PFLEGE.fordere.luzern, P, DATUM);
  assert.deepEqual([...f.eintraege.keys()].sort(), ['anna-muster']); // Dario steht in Delta auf Rang 4, Fremd Franz hat keine Lizenz
  assert.deepEqual([f.eintraege.get('anna-muster')[0].liga, f.eintraege.get('anna-muster')[0].tischart, f.eintraege.get('anna-muster')[0].rang, f.eintraege.get('anna-muster')[0].rang_quelle], ['1. Liga', 'Garlando', 1, 'abgeleitet']);
  assert.equal(f.eintraege.get('anna-muster')[0].quelle, 'https://fordere.ch/api/seasons/7/final-day');
});

// ---------- Zusammenbau ----------
await test('Zählung im Schnappschuss: je Bereich und gesamt', async () => {
  const s = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  const b = Object.fromEntries(s.bereiche.map((x) => [x.schluessel, x.summe]));
  assert.deepEqual([b.sm.podestplaetze, b.sm.gold, b.sm.silber, b.sm.bronze, b.sm.personen], [4, 2, 2, 0, 2]);
  assert.deepEqual([b.nati.podestplaetze, b.nati.bronze, b.nati.personen], [2, 2, 2]);
  assert.deepEqual([b.ranglisten.podestplaetze, b.ranglisten.gold, b.ranglisten.bronze, b.ranglisten.personen], [3, 2, 1, 2]); // Anna Einzel 1 und Archiv Doppel 1, Dario Einzel 3
  assert.deepEqual([b.liga.podestplaetze, b.liga.silber, b.liga.bronze], [2, 1, 1]);
  assert.deepEqual([b.fordere.podestplaetze, b.fordere.gold], [1, 1]);
  assert.equal(s.gesamt.podestplaetze, 12);
  assert.equal(s.gesamt.gold + s.gesamt.silber + s.gesamt.bronze, 12);
  assert.ok(s.offen.includes('Test offen'));
  for (const e of [...s.nati.eintraege, ...s.liga.eintraege, ...s.sm.personen.flatMap((p) => p.platzierungen), ...s.ranglisten.personen.flatMap((p) => p.platzierungen), ...s.fordere.personen.flatMap((p) => p.platzierungen)]) {
    assert.match(e.quelle, /^https:\/\//); assert.match(e.abgerufen, /^\d{4}-\d{2}-\d{2}$/);
  }
});
await test('Gegenprobe: Name ohne Lizenz taucht nie auf (auch nicht als Partner in der SM)', async () => {
  const s = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  const ohneSm = alsText({ ...s, sm: null });
  for (const n of ['Fremd', 'Nobody', 'Dritter', 'Andere']) assert.ok(!ohneSm.includes(n), `${n} ausserhalb der SM`);
  assert.ok(!alsText(s.verzeichnis).includes('Fremd'));
  assert.ok(!alsText(s.sm).includes('Fremd')); // auch in der SM nur als Einzelplatz, nie als Partner (Franz steht allein)
  assert.ok(!alsText(s.sm).includes('Peter') && !alsText(s.sm).includes('Partner Peter')); // Partner ohne Lizenz steht nie mit Namen
});
await test('Gegenprobe: bekannte Fremdnamen in Spalten und Kadern ändern die Zahlen nicht', async () => {
  const mehr = { ...holen(), sm: async () => ({ ...SM, 'Men Singles': { ...SM['Men Singles'], '2020': { 1: { rank: 1, players: [{ name: 'Gast Gabi' }] } } } }) };
  const a = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM }); const b = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: mehr, datum: DATUM });
  assert.equal(alsText(a), alsText(b));
});
await test('nicht_nennen entfernt eine Person überall, Partner wird «Partner»', async () => {
  const s = await bauen({ spielerDatei: SPIELER, pflege: { ...PFLEGE, nicht_nennen: ['MUSTER Anna'] }, holen: holen(), datum: DATUM });
  const t = alsText(s);
  assert.ok(!t.includes('Anna') && !t.includes('Muster') && !t.includes('anna-muster'), 'Anna fehlt überall');
  const beat = s.sm.personen.find((p) => p.id === 'beat-beispiel');
  assert.ok(beat.platzierungen.some((e) => e.partner.some((x) => x.name === 'Partner' && x.id === null)));
  assert.equal(s.nati.eintraege[0].personen.join(), 'dario-drei');
  const mitId = await bauen({ spielerDatei: SPIELER, pflege: { ...PFLEGE, nicht_nennen: ['dario-drei'] }, holen: holen(), datum: DATUM });
  assert.ok(!alsText(mitId).includes('Dario'));
});
await test('Lauf ist wiederholbar: gleiche Eingaben, gleicher Schnappschuss', async () => {
  const a = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM }); const b = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  assert.equal(alsText(a), alsText(b));
});


// ---------- Turniere, Champions League, Ehrenmitglied, feste Plätze ----------
const TU = { eintraege: [
  { jahr: 2025, datum: '2025-06-23', turnier: 'ITSF World Cup 2025', serie: 'ITSF', disziplin: 'Men Classic', rang: 1, ort: 'Zaragoza, Spain', personen: ['anna-muster'], quelle: 'https://app.tablesoccer.org/p/AAA111', abgerufen: DATUM },
  { jahr: 2024, datum: '2024-05-04', turnier: 'STRT Beispiel', serie: 'STF', disziplin: 'Open Doubles', rang: 3, personen: ['beat-beispiel', 'anna-muster'], quelle: 'https://app.tablesoccer.org/p/BBB222', abgerufen: DATUM },
  { jahr: 2023, datum: '2023-09-02', turnier: 'Swiss Open 2023', serie: 'P4P', disziplin: 'Amateur Einzel', rang: 2, personen: ['erika-ehre'], quelle: 'https://www.players4players.de/index.php/de/p4presults/9', abgerufen: DATUM },
] };
const CL = { teilnahmen: [
  { jahr: 2024, datum: '2024-11-15', wettbewerb: 'European Champions League 2024', klasse: 'Men', ort: 'Genova, Italy', rang: 14, teams: 24, kader: ['anna-muster', 'dario-drei'], quelle: 'https://app.tablesoccer.org/p/CCC333', abgerufen: DATUM },
  { jahr: 2023, datum: '2023-11-18', wettbewerb: 'European Champions League 2023', klasse: 'Men', ort: 'Roma, Italy', rang: 2, teams: 23, kader: ['anna-muster'], quelle: 'https://app.tablesoccer.org/p/DDD444', abgerufen: DATUM },
] };
const PFLEGE_T = { ...PFLEGE, ehrenmitglieder: ['Erika Ehre'], feste_plaetze: [{ name: 'Erika Ehre', spruch: 'Erste, weil sie es kann.' }, { name: 'Dario Drei', spruch: 'Zweiter, weil jemand muss.' }], fotos: { 'Erika Ehre': { datei: 'bilder/erika.webp', alt: 'Erika Ehre, lächelnd' } } };
const mitT = (o = {}) => holen({ turniere: async () => TU, champions: async () => CL, ...o });
const bauT = (pflege = PFLEGE_T, h = mitT()) => bauen({ spielerDatei: SPIELER, pflege, holen: h, datum: DATUM });

await test('Turniere: Zählung je Person, Weltmeister, Ort auf Deutsch, Quelle je Eintrag', async () => {
  const s = await bauT({ ...PFLEGE_T, ehrenmitglieder: [], feste_plaetze: [], fotos: {} }, mitT({ turniere: async () => ({ eintraege: TU.eintraege.slice(0, 2) }) }));
  const b = s.bereiche.find((x) => x.schluessel === 'turniere');
  assert.deepEqual([b.summe.podestplaetze, b.summe.gold, b.summe.bronze, b.summe.personen], [3, 1, 2, 2]); // Doppel zählt für beide
  const anna = s.turniere.personen.find((p) => p.id === 'anna-muster');
  const wm = anna.platzierungen.find((e) => e.titel === 'Weltmeister');
  assert.equal(wm.ort, 'Zaragoza, Spanien'); assert.match(wm.quelle, /^https:\/\//);
  assert.equal(s.gesamt.podestplaetze, 12 + 3);
});
await test('Turniere: Fremde Serie, Rang 4, unbekannte Person, ohne Quelle brechen ab', async () => {
  const eine = (x) => mitT({ turniere: async () => ({ eintraege: [{ ...TU.eintraege[1], ...x }] }) });
  await wirft(() => bauT(PFLEGE_T, eine({ serie: 'Fantasie' })), /fremde Serie/);
  await wirft(() => bauT(PFLEGE_T, eine({ rang: 4 })), /Rang 4/);
  await wirft(() => bauT(PFLEGE_T, eine({ personen: ['wer-auch-immer'] })), /nicht in der Spielerliste/);
  await wirft(() => bauT(PFLEGE_T, eine({ quelle: 'http://unsicher.example' })), /Quelle/);
});
await test('Turniere aus FAST: ITSF-Tour nur mit Wettbewerbsseite, nie mit Spieler-ID', async () => {
  const fast = 'https://extranet.fast4foos.org/fast/tournament/players_station/players_station_competition.jsp?tournamentId=0&originalTournamentId=652277322&lang=de&competitionId=0&originalCompetitionId=652277329&playerId=0&barCode=null&screenIndex=-1&view=final_ranking';
  const eine = (x) => mitT({ turniere: async () => ({ eintraege: [{ ...TU.eintraege[1], ...x }] }) });
  const s = await bauT(PFLEGE_T, eine({ serie: 'ITSF-Tour', quelle: fast }));
  assert.equal(s.bereiche.find((x) => x.schluessel === 'turniere').summe.podestplaetze, TU.eintraege[1].personen.length);
  // seit 2026-11-21 auch die Coral-Turnierseite (ITSF-Turniere 2025 ohne FAST), nie eine andere Adresse
  const coral = await bauT(PFLEGE_T, eine({ serie: 'ITSF-Tour', quelle: 'https://app.tablesoccer.org/p/Z8PRGZ/' }));
  assert.equal(coral.bereiche.find((x) => x.schluessel === 'turniere').summe.podestplaetze, TU.eintraege[1].personen.length);
  await wirft(() => bauT(PFLEGE_T, eine({ serie: 'ITSF-Tour', quelle: 'https://www.tablesoccer.org/page/player?numlic=75600107' })), /ITSF-Tour ohne FAST/);
  await wirft(() => bauT(PFLEGE_T, eine({ serie: 'WS', quelle: fast.replace('playerId=0', 'playerId=4890425') })), /FAST-Quelle nicht in der Form/);
});
await test('Turniere aus dem Web-Archiv des Verbands: Ergebnisseite, News oder archivierte Spielerseite, nie die Live-Seite', async () => {
  const erg = 'https://web.archive.org/web/20250320214545/https://swisstablesoccer.ch/index.php/fr/competitions/resultats?view=sportsmanager&task=turnierdisziplinen&turnierid=263';
  const news = 'https://web.archive.org/web/20171201162901/http://www.stf-tischfussball.ch/index.php/stf-news/90-garlando-finals-in-oey';
  const eine = (x) => mitT({ turniere: async () => ({ eintraege: [{ ...TU.eintraege[1], serie: 'STF', ...x }] }) });
  for (const quelle of [erg, news]) {
    const s = await bauT(PFLEGE_T, eine({ quelle }));
    assert.equal(s.bereiche.find((x) => x.schluessel === 'turniere').summe.podestplaetze, TU.eintraege[1].personen.length);
  }
  const spieler = 'https://web.archive.org/web/20251116183207/https://stf-tischfussball.ch/index.php/de/spielbetrieb/ranglisten?view=sportsmanager&task=' + 'spieler_details&id=1&ua=1';
  assert.equal((await bauT(PFLEGE_T, eine({ quelle: spieler }))).bereiche.find((x) => x.schluessel === 'turniere').summe.podestplaetze, TU.eintraege[1].personen.length);
  await wirft(() => bauT(PFLEGE_T, eine({ quelle: spieler.replace(/^https:\/\/web\.archive\.org\/web\/\d+\//, '') })), /weder Coral noch/);
  await wirft(() => bauT(PFLEGE_T, eine({ quelle: 'https://example.org/irgendwas' })), /weder Coral noch/);
});
await test('STF-Archiv: Ergebnisseite lesen und Dubletten über Disziplinart und ±2 Tage', async () => {
  const h = '<h2 class="stf-page-subtitle-1">STRT Test</h2><h2 class="stf-page-subtitle-2">Rookie Doubles</h2> Beginn: 08.01.22 '
    + '<div class="stf-tournamentresult-detail-result-item"> <span><a href="?id=1">1. Anna Muster</a> <a href="?id=2">Bert Beispiel</a></span> </div>'
    + '<div class="stf-tournamentresult-detail-result-item"> <span><a href="?id=3">4. Carl Vier</a></span> </div>';
  const s = ergebnisseite(h);
  assert.equal(s.name, 'STRT Test');
  assert.deepEqual(s.disz[0], { titel: 'Rookie Doubles', beginn: '2022-01-08', plaetze: [{ rang: 1, namen: ['Anna Muster', 'Bert Beispiel'], nrn: ['1', '2'] }, { rang: 4, namen: ['Carl Vier'], nrn: ['3'] }] });
  assert.equal(art('Rookie Doubles'), art('Neulinge Doppel'));
  assert.notEqual(art('Open Doubles'), art('Open Singles'));
  const bestand = [{ datum: '2022-01-09', rang: 1, disziplin: 'Neuling Doppel', personen: ['anna-muster'], serie: 'ITSF-Tour', turnier: 'X' }];
  assert.ok(dublette({ datum: '2022-01-08', rang: 1, disziplin: 'Rookie Doubles' }, 'anna-muster', bestand));
  assert.equal(dublette({ datum: '2022-01-12', rang: 1, disziplin: 'Rookie Doubles' }, 'anna-muster', bestand), null, 'mehr als 2 Tage');
  assert.equal(dublette({ datum: '2022-01-08', rang: 2, disziplin: 'Rookie Doubles' }, 'anna-muster', bestand), null, 'anderer Rang');
  assert.equal(dublette({ datum: '2022-01-08', rang: 1, disziplin: 'Open Doubles' }, 'anna-muster', bestand), null, 'andere Klasse');
});
await test('Champions League: eigene Zahl, nicht in den Podestplätzen, Kader nur mit Lizenz', async () => {
  const s = await bauT();
  assert.equal(s.champions.summe.teilnahmen, 2); assert.equal(s.champions.summe.podest, 1);
  assert.equal(s.champions.teilnahmen[0].jahr, 2024);
  assert.deepEqual(s.champions.teilnahmen[0].spieler, ['Anna Muster', 'Dario Drei']);
  assert.equal(s.champions.teilnahmen[1].podest, true);
  const ohne = await bauT(PFLEGE_T, mitT({ champions: async () => ({ teilnahmen: [] }) }));
  assert.equal(ohne.gesamt.podestplaetze, s.gesamt.podestplaetze, 'Teilnahmen ändern die Summe nicht');
});
await test('Champions League Gegenprobe: Spieler ohne Lizenz und Ehrenmitglied stehen nie im Kader, Quelle und Rang werden geprüft', async () => {
  const s = await bauT(PFLEGE_T, mitT({ champions: async () => ({ teilnahmen: [{ ...CL.teilnahmen[0], kader: ['anna-muster', 'erika-ehre'] }] }) }));
  assert.deepEqual(s.champions.teilnahmen[0].spieler, ['Anna Muster']);
  const cd = (x) => mitT({ champions: async () => ({ teilnahmen: [{ ...CL.teilnahmen[0], ...x }] }) });
  await wirft(() => bauT(PFLEGE_T, cd({ rang: 30 })), /Rang oder Feldgrösse/);
  await wirft(() => bauT(PFLEGE_T, cd({ kader: ['wilson-saq'] })), /nicht in der Spielerliste/);
  // Coral-Ableitung: nur bestätigte Meldungen des Wettbewerbs, Fremde (Wilson Saq) nie
  const v = { tournament: { name: 'European Champions League 2025', start_at: '2025-11-14 09:00', address: { meta: { locality: { name: 'Genova' }, country: { name: 'Italy' } } } },
    competitions: { 1: { id: 1, name: 'Men', status: 'finished', standings: { 1: 10, 2: 77 } } }, teams: { 77: { id: 77, name: 'TFC Lucerne 1', rename: '' }, 10: { id: 10, name: 'Anderer Club' } },
    players: { 1: { first_name: 'Anna', last_name: 'Muster' }, 2: { first_name: 'Wilson', last_name: 'Saq' }, 3: { first_name: 'Dario', last_name: 'Drei' } },
    competition_players: { a: { competition_id: 1, team_id: 77, player_id: 1, status: 'confirmed' }, b: { competition_id: 1, team_id: 77, player_id: 2, status: 'confirmed' }, c: { competition_id: 1, team_id: 77, player_id: 3, status: 'removed' }, d: { competition_id: 2, team_id: 77, player_id: 3, status: 'confirmed' } } };
  const t = championsAbleiten(v, { code: 'XXX999' }, P, /luz|lucern|tfcl/i, DATUM);
  assert.equal(t.length, 1); assert.deepEqual(t[0].kader, ['anna-muster']); assert.equal(t[0].rang, 2); assert.equal(t[0].teams, 2);
});
await test('Coral-Ableitung: Doppel in geteiltem Team, Weltmeister, Nati und Fremde nie', () => {
  const v = { tournament: { name: 'World Cup 2025', start_at: '2025-06-23 07:30', address: { meta: { locality: { name: 'Zaragoza' }, country: { name: 'Spain' } } } },
    competitions: { 1: { id: 1, name: 'Men Classic', status: 'finished', team_category: { short_name: 'MD', player_count: 2 }, standings: { 1: 5, 2: 6 } },
      2: { id: 2, name: 'Men Doubles', status: 'finished', team_category: { short_name: 'MD', player_count: 2 }, standings: { 1: 6, 2: 5 } },
      3: { id: 3, name: 'Men National Team', status: 'finished', team_category: { short_name: 'MN42', player_count: 4 }, standings: { 1: 5 } } },
    players: { 1: { first_name: 'Anna', last_name: 'Muster' }, 2: { first_name: 'Fremd', last_name: 'Franz' } },
    competition_players: { a: { competition_id: 1, team_id: 5, player_id: 1, status: 'confirmed' }, b: { competition_id: 1, team_id: 5, player_id: 2, status: 'confirmed' }, c: { competition_id: 2, team_id: 5, player_id: 2, status: 'confirmed' }, d: { competition_id: 3, team_id: 5, player_id: 1, status: 'confirmed' } } };
  const e = coralAbleiten(v, { code: 'WWW111', name: 'World Cup 2025', start_on: '2025-06-23', serie: 'ITSF' }, P, DATUM);
  assert.equal(e.length, 1, 'nur Men Classic (Doppel 2 ohne Mitglied, Nati zählt nicht)'); assert.equal(e[0].rang, 1); assert.equal(e[0].disziplin, 'Men Classic');
  assert.deepEqual(e[0].personen, ['anna-muster']); assert.equal(e[0].ort, 'Zaragoza, Spain');
  assert.equal(turnierName('[Imported] STRT Bern - 2024-12-29'), 'STRT Bern'); assert.equal(turnierDatum({ start_on: '2025-01-01' }, '[Imported] STRT Bern - 2024-12-29'), '2024-12-29');
  const d = doppelte([{ serie: 'P4P', datum: '2026-10-10', rang: 1, personen: ['a'], disziplin: 'Neulinge Einzel' }, { serie: 'STF', datum: '2026-10-11', rang: 1, personen: ['a'], disziplin: 'Neulinge Einzel' }]);
  assert.equal(d.length, 1);
});
await test('P4P: Galerie, Platzierungen und Ergebnisseite werden gelesen, ein Umbau bricht ab', () => {
  const zeilen = Array.from({ length: 1100 }, (_, i) => `<tr><td>${i}</td><td><a href="/de/p4pplayer/${100 + i}">${100 + i}</a></td><td>Nach${i}</td><td>Vor${i}</td><td>Ort</td><td>CH</td><td>N</td><td>N</td></tr>`).join('');
  assert.equal(galerie(zeilen).length, 1100);
  assert.throws(() => galerie('<html>neu</html>'), /Galerie/);
  const pl = platzierungen('<th data-sortable="true" data-field="OE">OE</th><th data-sortable="true" data-field="AE">AE</th><tbody><tr><td>Swiss Open 2024</td><td>1</td><td>7</td></tr></tbody>');
  assert.deepEqual(pl, [{ turnier: 'Swiss Open 2024', code: 'OE', rang: 1 }]);
  const html = 'block-p4p-content<h2>Swiss Open 2024 &ndash; 05.10.2024</h2><h5><a name="OE">Offenes Einzel</a></h5><table><tr><td>1</td><td>Anna Muster</td></tr></table>';
  const e = ergebnis(html); assert.equal(e.datum, '2024-10-05'); assert.equal(e.disziplinen.OE.zeilen[0].namen[0], 'Anna Muster');
});
await test('Ehrenmitglied: erscheint mit Podestplätzen, zählt in keine Summe, Fremde nie', async () => {
  const s = await bauT();
  const e = s.verzeichnis.find((p) => p.id === 'erika-ehre');
  assert.ok(e && e.ehrenmitglied && e.summe === 1 && e.foto === 'bilder/erika.webp');
  const b = s.bereiche.find((x) => x.schluessel === 'turniere');
  assert.equal(b.summe.podestplaetze, 3); // Erikas Podestplatz zählt nicht
  assert.equal(s.gesamt.personen, s.verzeichnis.filter((p) => !p.ehrenmitglied && p.summe > 0).length);
  assert.equal(s.spieler_mit_lizenz, 4);
  assert.ok(!alsText(s).includes('Franz') && !alsText(s).includes('Nobody'));
  const ohne = await bauT({ ...PFLEGE_T, ehrenmitglieder: [], feste_plaetze: [], fotos: {} }, mitT({ turniere: async () => ({ eintraege: TU.eintraege.slice(0, 2) }) }));
  assert.ok(!ohne.verzeichnis.some((p) => p.id === 'erika-ehre'), 'ohne Eintrag in pflege kein Ehrenmitglied');
  assert.equal(ohne.gesamt.podestplaetze, s.gesamt.podestplaetze, 'das Ehrenmitglied ändert keine Summe');
  assert.ok(!alsText(s.verzeichnis.filter((p) => p.foto)).includes('anna'), 'nur Erika hat ein Foto');
});
await test('Feste Plätze: Ehrenmitglied Platz 1, Dario Platz 2 auch ohne Podest, alle anderen danach unverändert', async () => {
  const s = await bauT();
  assert.deepEqual(s.verzeichnis.slice(0, 2).map((p) => p.id), ['erika-ehre', 'dario-drei']);
  assert.equal(s.verzeichnis[0].spruch, 'Erste, weil sie es kann.');
  const rest = s.verzeichnis.slice(2).map((p) => p.id);
  const normal = (await bauT({ ...PFLEGE_T, ehrenmitglieder: [], feste_plaetze: [], fotos: {} }, mitT({ turniere: async () => ({ eintraege: TU.eintraege.slice(0, 2) }) }))).verzeichnis.map((p) => p.id).filter((i) => i !== 'dario-drei');
  assert.deepEqual(rest, normal.filter((i) => i !== 'erika-ehre'), 'Reihenfolge der anderen bleibt');
  // Seite: Rang 1 und 2 sind fest
  const m = R.modell(s); const rs = R.zeilen(m, { bereich: 'alle', q: '' });
  assert.deepEqual(rs.slice(0, 2).map((r) => [r.p.id, r.rang]), [['erika-ehre', 1], ['dario-drei', 2]]);
  assert.ok(rs[2].rang === 3); assert.match(R.zeileHtml(rs[0]), /Erste, weil sie es kann\./); assert.match(R.zeileHtml(rs[0]), /Ehrenmitglied/);
  const nurSm = R.zeilen(m, { bereich: 'sm', q: '' }); assert.ok(nurSm.every((r) => r.rang >= 1) && !nurSm.some((r) => r.p.fest && !r.e.length));
});
await test('nicht_nennen gewinnt gegen Ehrenmitglied, feste Plätze und Foto', async () => {
  const s = await bauT({ ...PFLEGE_T, nicht_nennen: ['Erika Ehre', 'dario-drei'] });
  const t = alsText(s);
  assert.ok(!t.includes('Erika') && !t.includes('erika') && !t.includes('Erste, weil') && !t.includes('Zweiter, weil') && !t.includes('dario'), 'beide fehlen überall');
});
await test('Champions League und Titel auf der Seite: Weltmeister steht direkt nach Nati-Gold', async () => {
  const s = await bauT(); const m = R.modell(s);
  const lead = R.championsLead(m); assert.match(lead, /2 Teilnahmen/); assert.ok(!/—|–/.test(lead));
  assert.match(R.championsHtml(m), /Genova, Italien|Genova, Italy/); assert.match(R.championsHtml(m), /Rang 14 von 24/);
  const nati = { bereich: 'nati', rang: 1, team: 'Herren', jahr: 2025 }; const sm = { bereich: 'sm', rang: 1, kategorie: 'Herren Doppel', jahr: 2025 }; const wmE = { bereich: 'turniere', rang: 1, kategorie: 'Men Classic', jahr: 2025, wm: true };
  assert.match(R.hoechsterTitel([sm, wmE]), /^Weltmeister Men Classic 2025/); assert.match(R.hoechsterTitel([wmE, nati, sm]), /^Nati-Gold/);
});

// ---------- Datenschutzprüfung ----------
await test('Datenschutzprüfung findet IDs, Punkte, Kennungen, fremde Mails, Schlüssel (und lässt den Schnappschuss durch)', async () => {
  const q = (...a) => a.join('');
  const bose = [`{ ${q('"i', 'd"')}: 4711 }`, `{ ${q('"po', 'ints"')}: 5911 }`, `"5911 ${q('Pun', 'kte')}"`, `{ ${q('"co', 'de"')}: "7K4MGP" }`, `"7K4MGP"`, `{ ${q('"member', 'ships"')}: ["X"] }`, `mail ${q('jemand', '@', 'beispiel.ch')}`, `${q('s', 'k-')}${'a'.repeat(24)}`, `https://x/index.php?${q('task=spieler', '_details')}&id=5`];
  for (const b of bose) assert.ok(pruefeText(b, 'daten/x.json').length >= 1, `nicht gefunden: ${b}`);
  assert.equal(pruefeText(`Co-Authored-By: Claude <${q('noreply', '@', 'anthropic.com')}>`, 'Nachricht').length, 0);
  const s = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  assert.deepEqual(pruefeText(JSON.stringify(s, null, 2), 'daten/hall-of-fame.json'), []);
});

// ---------- Abbruch bei fremdem Format ----------
const bricht = (name, ueber, teil) => test(`Abbruch: ${name}`, () => wirft(() => bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(ueber), datum: DATUM }), teil));
await bricht('SM mit fremder Kategorie', { sm: async () => ({ 'Kids Singles': {} }) }, /fremde Kategorie/);
await bricht('SM mit fremdem Jahresschlüssel', { sm: async () => ({ 'Men Singles': { 'Herbst 2025': {} } }) }, /Jahresschlüssel/);
await bricht('SM kein Objekt', { sm: async () => [] }, /kein Objekt/);
await bricht('Rangliste ohne standings', { rangliste: async () => ({ neu: 1 }) }, /standings/);
await bricht('Archivseite umgebaut', { archiv: async () => '<html>neu</html>' }, /Seitenaufbau/);
await bricht('Coral ohne erwartete Teile', { coral: async () => ({ x: { tournament: { name: 'a' } } }) }, /Store/);
await bricht('PDF nicht lesbar', { pdf: async () => [] }, /nicht lesbar/);
await bricht('Fordere ohne competitions', { fordere: async () => ({ saison: 7 }) }, /competitions/);
await bricht('Quelle nicht erreichbar', { sm: async () => { throw new Error('Quelle nicht erreichbar'); } }, /nicht erreichbar/);
await test('Abbruch: Exit 1, bestehender Schnappschuss bleibt unverändert', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfcl-'));
  fs.writeFileSync(path.join(dir, 'spieler.json'), JSON.stringify(SPIELER)); fs.writeFileSync(path.join(dir, 'pflege.json'), JSON.stringify(PFLEGE));
  fs.writeFileSync(path.join(dir, 'hall-of-fame.json'), 'ALT');
  const stumm = console.error; console.error = () => {};
  try {
    assert.equal(await haupt([], { daten: dir, holen: holen({ sm: async () => ({ 'Kids Singles': {} }) }), datum: DATUM }), 1);
    assert.equal(fs.readFileSync(path.join(dir, 'hall-of-fame.json'), 'utf8'), 'ALT');
    assert.equal(await haupt([], { daten: dir, holen: holen(), datum: DATUM }), 0);
    assert.notEqual(fs.readFileSync(path.join(dir, 'hall-of-fame.json'), 'utf8'), 'ALT');
    assert.equal(await haupt(['--falsch'], { daten: dir, holen: holen() }), 2);
  } finally { console.error = stumm; fs.rmSync(dir, { recursive: true, force: true }); }
});


// ---------- Entscheide 2026-11-20 (Bugfix Runde 1) ----------
await test('Partner ohne Lizenz steht nie mit Namen; Ehrenmitglied als Partner schon; offen nennt nie einen fremden Namen', async () => {
  const s = await bauT({ ...PFLEGE_T, ehrenmitglieder: ['Peter Partner'], feste_plaetze: [], fotos: {} }, mitT({ turniere: async () => ({ eintraege: TU.eintraege.slice(0, 2) }) }));
  assert.ok(s.sm.personen.flatMap((p) => p.platzierungen).some((e) => e.partner.some((x) => x.name === 'Peter Partner')), 'Ehrenmitglied bleibt benannt');
  const o = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  assert.ok(!alsText(o).includes('Peter') && !alsText(o).includes('Fremd'), 'kein Name ohne Lizenz im ganzen Schnappschuss');
  const mitZusatz = o.offen.filter((x) => /ähnelt/.test(x));
  assert.ok(mitZusatz.length && mitZusatz.every((x) => !/Beispiel Beat H\./.test(x) && /Beat Beispiel/.test(x)), 'die Zeile nennt nur den Namen mit Lizenz');
});
await test('nicht_gleich wird gelesen: der Name mit Zusatz steht nicht in offen, ohne Eintrag schon', async () => {
  const mit = await bauen({ spielerDatei: SPIELER, pflege: { ...PFLEGE, nicht_gleich: { [kurzwert('Beispiel Beat H.')]: 'Vasco: nein' } }, holen: holen(), datum: DATUM });
  const ohne = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  assert.equal(ohne.offen.filter((x) => /ähnelt/.test(x)).length, 1);
  assert.equal(mit.offen.filter((x) => /ähnelt/.test(x)).length, 0);
  assert.equal(kurzwert('Beispiel Beat H.'), kurzwert('H. Beat Beispiel'));
  assert.equal(mit.gesamt.podestplaetze, ohne.gesamt.podestplaetze, 'zählt in beiden Fällen nicht');
});
await test('Lizenzierter mit festem Platz (wie Jorge) zählt mit seinen Podestplätzen in Gesamtzahl und Bereichssummen; nur das Ehrenmitglied nicht', async () => {
  const mit = await bauT(); const ohneFest = await bauT({ ...PFLEGE_T, feste_plaetze: [], fotos: {} });
  const dario = mit.verzeichnis.find((p) => p.id === 'dario-drei');
  assert.ok(dario.summe > 0 && dario.fest === 2 && !dario.ehrenmitglied);
  assert.deepEqual(mit.gesamt, ohneFest.gesamt, 'feste Plätze ändern keine Summe');
  assert.deepEqual(mit.bereiche.map((b) => b.summe), ohneFest.bereiche.map((b) => b.summe));
  const ohneDario = await bauT({ ...PFLEGE_T, nicht_nennen: ['dario-drei'] });
  assert.equal(mit.gesamt.podestplaetze - ohneDario.gesamt.podestplaetze, dario.summe, 'Darios Podestplätze stecken in der Gesamtzahl');
  assert.equal(mit.gesamt.personen - ohneDario.gesamt.personen, 1);
  const erika = mit.verzeichnis.find((p) => p.id === 'erika-ehre'); assert.ok(erika.ehrenmitglied && erika.summe > 0);
  const ohneErika = await bauT({ ...PFLEGE_T, ehrenmitglieder: [], fotos: {} }, mitT({ turniere: async () => ({ eintraege: TU.eintraege.slice(0, 2) }) }));
  assert.deepEqual(mit.gesamt, ohneErika.gesamt, 'das Ehrenmitglied ändert keine Summe');
});
await test('Datenschutzprüfung: Spielerprofil als Quelle zählt in daten/ und site/, nicht in tools/; die übrigen Verbote gelten überall', () => {
  const q = (...a) => a.join('');
  const profil = `https://x.example/index.php?${q('task=spieler', '_details')}&id=1`;
  assert.equal(pruefeText(profil, 'tools/x.mjs').length, 0, 'Code unter tools/ darf die Adresse nennen');
  assert.equal(pruefeText(q('const k = "p4p', 'placements";'), 'tools/p4p.mjs').length, 0);
  assert.ok(pruefeText(profil, 'daten/x.json').length >= 1, 'Daten');
  assert.ok(pruefeText(`<a href="${profil}">Quelle</a>`, 'site/x.html').length >= 1, 'Seite');
  assert.ok(pruefeText(`<a href="https://x.example/${q('spieler', '/4711')}">`, 'site/js/x.js').length >= 1, 'Text unter site/');
  assert.ok(pruefeText(`{ ${q('"i', 'd"')}: 4711 }`, 'tools/x.mjs').length >= 1, 'andere Verbote gelten in tools/');
  assert.ok(pruefeText(`mail ${q('jemand', '@', 'beispiel.ch')}`, 'tools/x.mjs').length >= 1);
});

await test('Seite: jede id steht genau einmal, Suche mit Filter nennt den Bereich, Rohdaten-Links sagen es, Podest statt Zusatzzeile', async () => {
  const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], 'doppelte id (die Champions-League-Liste überschrieb die Sektion)');
  const s = await bauT(); const m = R.modell(s);
  const mitFilter = R.satzText(m, { bereich: 'turniere', q: 'Anna' }, 0); const ohneTreffer = R.satzText(m, { bereich: 'turniere', q: 'Zzzz' }, 0);
  assert.match(R.satzText(m, { bereich: 'liga', q: 'Anna' }, 0), /Bereich Clubliga steht keine Person/);
  assert.match(R.satzText(m, { bereich: 'nati', q: 'Erika' }, 0), /Bereich Nati steht keine Person.*Über alle Bereiche findet die Suche 1 Person/);
  assert.match(ohneTreffer, /Die Suche kennt Vor- und Nachnamen/); assert.ok(mitFilter);
  assert.match(R.satzText(m, { bereich: 'alle', q: '' }, 7), /^7 Personen stehen in der Rangliste/);
  const roh = R.teamsHtml({ teams: [{ saison: '2025/26', liga: 'X', team: 'Y', rang: 1, quelle: 'https://fordere.ch/api/seasons/9/final-day' }] });
  assert.match(roh, />Rohdaten fordere\.ch \(JSON\)</);
  const leit = R.leitHtml(m); assert.ok(!/Stand \d/.test(leit.split('podest')[1]), 'der Stand steht nur in der Quellenzeile'); assert.match(leit, /podest__stufe--gold/);
  assert.match(R.zeileHtml(R.zeilen(m, { bereich: 'alle', q: '' })[2]), /marke metall metall--(gold|silber|bronze)/);
});

// ---------- Clubliga je Person ----------
// Testdaten: 2026 Challenge League «XYZC 2» Rang 3, 2019 Super League «XYZC 1» Rang 2 (beide je Team ohne Kader).
const KADER = { kader: [{ saison: '2019', liga: 'Super League', team: 'XYZC 1', personen: ['anna-muster', 'dario-drei', 'erika-ehre'], ohne_lizenz: 1, quelle: 'https://web.archive.org/web/20190101000000/https://swisstablesoccer.ch/x', abgerufen: DATUM }], offen: ['Kader 2026 fehlt'] };
const mitK = (k = KADER, pflege = { ...PFLEGE, ehrenmitglieder: ['Erika Ehre'] }) => bauen({ spielerDatei: SPIELER, pflege, holen: holen({ clubligaKader: async () => k }), datum: DATUM });
await test('Clubliga: mit belegtem Kader zählt der Platz je Person mit Lizenz, ohne Kader je Team', async () => {
  const ohne = await bauen({ spielerDatei: SPIELER, pflege: { ...PFLEGE, ehrenmitglieder: ['Erika Ehre'] }, holen: holen(), datum: DATUM });
  const s = await mitK();
  const b = s.bereiche.find((x) => x.schluessel === 'liga').summe;
  assert.deepEqual([b.podestplaetze, b.personen, b.teams, b.silber, b.bronze], [3, 2, 1, 2, 1], '2 Personen Silber 2019, 1 Team Bronze 2026');
  assert.equal(s.gesamt.podestplaetze, ohne.gesamt.podestplaetze - 1 + 2, 'der Teamplatz 2019 wird zu zwei Personenplätzen');
  const e19 = s.liga.eintraege.find((e) => e.saison === '2019');
  assert.equal(e19.zaehlt_je, 'Person'); assert.deepEqual(e19.spieler, ['Anna Muster', 'Dario Drei']); assert.match(e19.kader_quelle, /^https:\/\/web\.archive\.org\//);
  assert.equal(s.liga.eintraege.find((e) => e.saison === '2026').zaehlt_je, 'Team');
  const anna = s.liga.personen.find((p) => p.id === 'anna-muster').platzierungen[0];
  assert.deepEqual([anna.liga, anna.team, anna.rang, anna.rang_quelle], ['Super League', 'XYZC 1', 2, s.liga.eintraege.find((e) => e.saison === '2019').quelle]);
  assert.equal(s.verzeichnis.find((p) => p.id === 'anna-muster').bereiche.liga, 1);
  assert.ok(!s.liga.personen.some((p) => p.id === 'erika-ehre'), 'Ehrenmitglieder nie im Kader');
  assert.ok(s.offen.includes('Kader 2026 fehlt'));
  const m = R.modell(s);
  assert.equal(R.zeilen(m, { bereich: 'liga', q: '' }).length, 2, 'der Filter Clubliga zeigt die Personen');
  assert.match(R.teamsHtml(m), /Im Kader standen Anna Muster, Dario Drei/); assert.match(R.teamsHtml(m), /Kader nicht belegt, zählt je Team/);
  assert.match(R.satzText(m, { bereich: 'liga', q: '' }, 2), /2 Personen aus belegten Kadern zusammen 2-mal.*Für 1 Podestplatz nennt keine Quelle den Kader, er zählt je Team/);
});
await test('Clubliga-Kader: nicht_nennen fällt weg, ohne Person mit Lizenz zählt das Team', async () => {
  const s = await mitK(KADER, { ...PFLEGE, ehrenmitglieder: ['Erika Ehre'], nicht_nennen: ['MUSTER Anna', 'DREI Dario'] });
  const e19 = s.liga.eintraege.find((e) => e.saison === '2019');
  assert.equal(e19.zaehlt_je, 'Team'); assert.deepEqual(e19.spieler, []);
  assert.ok(!alsText(s).includes('Anna Muster') && !alsText(s).includes('anna-muster'));
});
await test('Clubliga-Kader: Abbruch bei fremdem Platz, doppeltem Platz, fehlender Quelle oder fremder Person', async () => {
  const k = (x) => ({ kader: [{ ...KADER.kader[0], ...x }] });
  await wirft(() => mitK(k({ team: 'XYZC 9' })), /kein Platz in der Rangliste/);
  await wirft(() => mitK({ kader: [KADER.kader[0], KADER.kader[0]] }), /doppelt/);
  await wirft(() => mitK(k({ quelle: 'http://x.example' })), /Quelle/);
  await wirft(() => mitK(k({ personen: ['franz-fremd'] })), /nicht in der Spielerliste/);
  await wirft(() => mitK(k({ personen: [] })), /ohne Personen/);
});
await test('Clubliga-Kader der Handdatei: jeder Platz trifft die Rangliste im Schnappschuss, nur Personen mit Lizenz', () => {
  const k = JSON.parse(fs.readFileSync(new URL('../daten/clubliga-kader.json', import.meta.url), 'utf8'));
  const hof = JSON.parse(fs.readFileSync(new URL('../daten/hall-of-fame.json', import.meta.url), 'utf8'));
  const sp = new Set(JSON.parse(fs.readFileSync(new URL('../daten/spieler.json', import.meta.url), 'utf8')).spieler.map((x) => x.id));
  for (const x of k.kader) {
    assert.equal(hof.liga.eintraege.filter((e) => e.saison === x.saison && e.liga === x.liga && e.team === x.team).length, 1, `${x.saison} ${x.liga} ${x.team}`);
    for (const id of x.personen) assert.ok(sp.has(id), `${id} ohne Lizenz`);
  }
});

// ---------- Junioren ohne Lizenz (Vasco 2026-11-21) ----------
await test('Junior ohne Lizenz: zählt nur belegte Plätze, Name nur Vorname und Initial, Partner ohne Lizenz anonym', async () => {
  const SMJ = { ...SM, 'Junior Doubles': { '2023': { 1: { rank: 1, players: [{ name: 'Jung Jonas' }, { name: 'Fremd Franz' }] } }, '2019': { 2: { rank: 2, players: [{ name: 'Jung Jonas' }, { name: 'Muster Anna' }] } } } };
  const J = { id: 'jonas-j', name: 'Jonas J.', kurzwert: kurzwert('Jung Jonas'), verein: 'Club Xyzc', sm: [{ jahr: 2023, kategorie: 'Junioren Doppel', rang: 1, verein_beleg: 'https://web.archive.org/web/20240101000000/https://example.org/news' }] };
  const tuJ = { eintraege: [{ jahr: 2024, datum: '2024-03-24', turnier: 'STS Beispiel', serie: 'STF', disziplin: 'Junioren Singles U13', rang: 1, personen: ['jonas-j'], quelle: 'https://app.tablesoccer.org/p/EEE555', verein_beleg: 'https://example.org/beleg', abgerufen: DATUM }] };
  const ohne = await bauT({ ...PFLEGE_T, ehrenmitglieder: [], feste_plaetze: [], fotos: {} }, mitT({ sm: async () => SMJ, turniere: async () => ({ eintraege: [] }) }));
  const mit = await bauT({ ...PFLEGE_T, ehrenmitglieder: [], feste_plaetze: [], fotos: {}, junioren: [J] }, mitT({ sm: async () => SMJ, turniere: async () => tuJ }));
  const v = mit.verzeichnis.find((p) => p.id === 'jonas-j');
  assert.ok(v && v.junior && v.summe === 2, 'SM 2023 und Turnier, nicht SM 2019 (ohne Beleg)');
  assert.equal(mit.gesamt.podestplaetze, ohne.gesamt.podestplaetze + 2, 'Junioren zählen in die Gesamtzahl');
  const sm = mit.sm.personen.find((p) => p.id === 'jonas-j').platzierungen;
  assert.deepEqual(sm.map((e) => [e.jahr, e.rang, e.partner[0].name]), [[2023, 1, 'Partner']]);
  assert.ok(!alsText(mit).includes('Jung') && !alsText(mit).includes('Franz'), 'kein voller Name im Schnappschuss');
  await wirft(() => bauT({ ...PFLEGE_T, junioren: [{ ...J, name: 'Jonas Jung' }] }, mitT({ sm: async () => SMJ })), /Vorname X\./);
  await wirft(() => bauT({ ...PFLEGE_T, junioren: [{ ...J, sm: [{ ...J.sm[0], rang: 3 }] }] }, mitT({ sm: async () => SMJ })), /nicht in der SM-Antwort/);
  await wirft(() => bauT({ ...PFLEGE_T, junioren: [{ ...J, sm: [{ ...J.sm[0], verein_beleg: '' }] }] }, mitT({ sm: async () => SMJ })), /Beleg des Clubs/);
  await wirft(() => bauT({ ...PFLEGE_T, junioren: [J] }, mitT({ sm: async () => SMJ, turniere: async () => ({ eintraege: [{ ...tuJ.eintraege[0], verein_beleg: undefined }] }) })), /Junior ohne Beleg/);
});
await test('Junioren der Handdatei: Name nur Vorname und Initial, jeder Turnierplatz mit Beleg des Clubs', () => {
  const pf = JSON.parse(fs.readFileSync(new URL('../daten/pflege.json', import.meta.url), 'utf8'));
  const st = JSON.parse(fs.readFileSync(new URL('../daten/stf-archiv.json', import.meta.url), 'utf8'));
  for (const j of pf.junioren || []) {
    assert.match(j.name, /^\p{Lu}[\p{L}-]+ \p{Lu}\.$/u);
    for (const e of st.eintraege.filter((x) => x.personen.includes(j.id))) assert.match(e.verein_beleg || '', /^https:\/\//, `${e.turnier} ${e.disziplin}`);
  }
});

console.log(`${ok} Tests bestanden${fehler.length ? `, ${fehler.length} FEHLER:\n- ${fehler.join('\n- ')}` : ''}`);
process.exit(fehler.length ? 1 : 0);
