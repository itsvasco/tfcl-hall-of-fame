#!/usr/bin/env node
// Test ohne Netz mit festen Eingaben: Zuordnung, Zählung je Bereich, Abbruch bei fremdem Format, Gegenprobe, nicht_nennen.
// Aufruf: node tools/erneuern-test.mjs   (Exit 0 = alles bestanden)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { personen, smAbleiten, ranglisteCms, archivLesen, ranglisteArchiv, natiAbleiten, pdfLesen, ligaAbleiten, raengeVon, fordereAbleiten, bauen, haupt, vorNach } from './erneuern.mjs';
import { anzeigeName, schluessel } from './gemeinsam.mjs';
import { lizenzen, alsDatei } from './spieler.mjs';
import { pruefeText } from './datenschutz-pruefen.mjs';

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
  const doppel1 = a.find((e) => e.rang === 1); assert.deepEqual(doppel1.partner, [{ name: 'Peter Partner', id: null }]);
  const doppel2 = b.find((e) => e.kategorie === 'Herren Doppel'); assert.deepEqual(doppel2.partner, [{ name: 'Anna Muster', id: 'anna-muster' }]);
  assert.ok([...r.eintraege.keys()].every((k) => ['anna-muster', 'beat-beispiel'].includes(k)));
  assert.ok(a.every((e) => e.quelle.startsWith('https://') && e.abgerufen === DATUM));
  assert.equal(b.find((e) => e.jahr === 2025).event, null);
});
await test('SM: Name mit Zusatz wird als offen gemeldet, nicht gezählt', () => {
  const r = smAbleiten(SM, P, DATUM);
  assert.ok(r.offen.some((o) => o.includes('Beispiel Beat H.')));
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
await test('Gegenprobe: Name ohne Lizenz taucht nie auf (ausser als Partner-Text in der SM)', async () => {
  const s = await bauen({ spielerDatei: SPIELER, pflege: PFLEGE, holen: holen(), datum: DATUM });
  const ohneSm = alsText({ ...s, sm: null });
  for (const n of ['Fremd', 'Nobody', 'Dritter', 'Andere']) assert.ok(!ohneSm.includes(n), `${n} ausserhalb der SM`);
  assert.ok(!alsText(s.verzeichnis).includes('Fremd'));
  assert.ok(!alsText(s.sm).includes('Fremd')); // auch in der SM nur als Einzelplatz, nie als Partner (Franz steht allein)
  assert.ok(alsText(s.sm).includes('Peter Partner')); // Partner ohne Lizenz steht mit Namen
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

console.log(`${ok} Tests bestanden${fehler.length ? `, ${fehler.length} FEHLER:\n- ${fehler.join('\n- ')}` : ''}`);
process.exit(fehler.length ? 1 : 0);
