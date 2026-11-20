// P4P (Players4Players): Podestplätze der Spieler mit Lizenz LUZE (und Ehrenmitglieder) aus der öffentlichen Seite
// players4players.de, nach dem Vorbild des TFCZ (p4p-raenge.mjs, dort nur gelesen). Ablauf:
//   1. Spielergalerie (Nr., Name, Ort, Land) holen, Namen gegen spieler.json suchen. Gleichnamige sind mehrdeutig: dann
//      entscheidet WAHL in daten/pflege.json (p4p_wahl, Name -> Nr.), sonst bleibt der Name offen.
//   2. Je Spielernummer die Platzierungen lesen (nur zum Finden), Rang 1 bis 3 behalten.
//   3. Jeden Treffer auf der Ergebnisseite des Turniers gegenprüfen (Name, Disziplin, Rang). Nur diese Seite ist die Quelle.
// Schreibt nichts, gibt { eintraege, offen, mehrdeutig, gegenprobe_fehlt } zurück. Aufruf siehe turniere-sammeln.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { schluessel } from './gemeinsam.mjs';

export const BASIS = 'https://www.players4players.de/index.php/de';
const ent = (s) => s.replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').trim();

export async function holeText(url, cache, datei) {
  const f = cache ? path.join(cache, datei) : null;
  if (f && fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  let r;
  for (let v = 0; v < 3; v++) {
    try { r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Hall of Fame TFCL, nur lesend)' }, signal: AbortSignal.timeout(60000) }); if (r.ok) break; } catch { r = null; }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  if (!r || !r.ok) throw new Error(`${url} nicht erreichbar (${r ? r.status : 'Netz'})`);
  const t = await r.text();
  if (f) fs.writeFileSync(f, t);
  await new Promise((ok) => setTimeout(ok, 300));
  return t;
}

export function galerie(html) {
  const aus = [];
  const re = /<tr>\s*<td>\d+<\/td>\s*<td><a href="\/(?:index\.php\/)?de\/p4pplayer\/(\d+)">\d+<\/a><\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/gs;
  for (const m of html.matchAll(re)) aus.push({ nr: +m[1], nachname: ent(m[2]), vorname: ent(m[3]), ort: ent(m[4]), land: ent(m[5]) });
  if (aus.length < 1000) throw new Error(`P4P-Galerie hat nur ${aus.length} Spieler (Aufbau verändert)`);
  return aus;
}

export function platzierungen(html) {
  const kopf = [...html.matchAll(/<th data-sortable="true" data-field="([^"]+)">/g)].map((m) => m[1]);
  if (!kopf.length) throw new Error('P4P-Platzierungsseite ohne Spalten (Aufbau verändert)');
  const body = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
  const aus = [];
  for (const zeile of body.split('<tr>').slice(1)) {
    const zellen = [...zeile.matchAll(/<td>(.*?)<\/td>/gs)].map((m) => ent(m[1]));
    if (zellen.length !== kopf.length + 1) throw new Error(`P4P-Platzierungszeile mit ${zellen.length} statt ${kopf.length + 1} Zellen`);
    zellen.slice(1).forEach((z, i) => { if (/^\d+$/.test(z) && +z <= 3) aus.push({ turnier: zellen[0], code: kopf[i], rang: +z }); });
  }
  return aus;
}

export function ergebnis(html) {
  const h2 = /<h2>(.*?)<\/h2>/s.exec(html.slice(Math.max(0, html.indexOf('block-p4p-content'))));
  if (!h2) return null;
  const kopf = ent(h2[1]);
  const m = /^(.*?)\s*–\s*(.*)$/.exec(kopf);
  const titel = m ? m[1].trim() : kopf;
  const d = m && /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(m[2]);
  const datum = d ? `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null;
  const disziplinen = {};
  for (const t of html.split(/<h5><a name="/).slice(1)) {
    const k = /^([^"]+)">(.*?)<\/a><\/h5>/s.exec(t);
    if (!k) continue;
    const zeilen = [];
    for (const z of t.slice(0, t.indexOf('</table>')).split('<tr>').slice(1)) {
      const zellen = [...z.matchAll(/<td>(.*?)<\/td>/gs)].map((x) => ent(x[1]));
      if (zellen.length >= 2 && /^\d+$/.test(zellen[0])) zeilen.push({ rang: +zellen[0], namen: zellen.slice(1).filter(Boolean) });
    }
    disziplinen[k[1]] = { name: ent(k[2]), zeilen };
  }
  return { titel, datum, disziplinen };
}

// personen: [{ id, namen: [..] }]; wahl: { schluessel: Nr. }; kein: Set Schlüssel gesperrter Namen
export async function p4pSammeln({ personen, wahl = {}, cache, datum, max = 400, holen = holeText }) {
  const jeName = new Map();
  for (const p of personen) for (const n of p.namen) jeName.set(schluessel(n), p);
  const gal = galerie(await holen(`${BASIS}/p4pgallery`, cache, 'galerie.html'));
  const treffer = new Map();
  for (const g of gal) {
    const k = schluessel(`${g.vorname} ${g.nachname}`);
    if (!jeName.has(k)) continue;
    if (!treffer.has(k)) treffer.set(k, []);
    treffer.get(k).push(g);
  }
  const spieler = []; const mehrdeutig = []; const offen = [];
  for (const [k, l] of treffer) {
    let g = l;
    if (l.length > 1) { g = l.filter((x) => x.nr === wahl[k]); if (g.length !== 1) { mehrdeutig.push({ name: jeName.get(k).namen[0], kandidaten: l.map((x) => `${x.ort} ${x.land}`) }); continue; } }
    spieler.push({ ...g[0], person: jeName.get(k), schl: k });
  }
  const turniere = new Map();
  for (let n = 1, leer = 0; n <= max && leer < 3; n++) {
    const e = ergebnis(await holen(`${BASIS}/p4presults/${n}`, cache, `ergebnis-${n}.html`));
    if (!e || !Object.keys(e.disziplinen).length) { leer++; continue; }
    leer = 0;
    if (!turniere.has(e.titel)) turniere.set(e.titel, []);
    turniere.get(e.titel).push({ n, ...e });
  }
  const rohe = []; const fehlt = [];
  for (const s of spieler) {
    for (const x of platzierungen(await holen(`${BASIS}/p4pplacements/${s.nr}`, cache, `spieler-${s.nr}.html`))) {
      const kand = turniere.get(x.turnier) || [];
      const t = kand.filter((tt) => tt.disziplinen[x.code] && tt.disziplinen[x.code].zeilen.some((r) => r.rang === x.rang && r.namen.some((nm) => schluessel(nm) === s.schl)));
      if (t.length !== 1) { fehlt.push({ name: s.person.namen[0], turnier: x.turnier, disziplin: x.code, rang: x.rang }); continue; }
      rohe.push({ person: s.person.id, t: t[0], code: x.code, rang: x.rang });
    }
  }
  // Ein Doppel mit mehreren Mitgliedern ist ein Eintrag mit allen ids
  const zusammen = new Map();
  for (const r of rohe) {
    const d = r.t.disziplinen[r.code];
    const zeile = d.zeilen.find((z) => z.rang === r.rang && z.namen.some((nm) => jeName.get(schluessel(nm))?.id === r.person));
    const k = [r.t.n, r.code, r.rang, zeile.namen.join('|')].join('#');
    if (!zusammen.has(k)) zusammen.set(k, { jahr: r.t.datum ? +r.t.datum.slice(0, 4) : null, datum: r.t.datum, turnier: r.t.titel, serie: 'P4P', disziplin: d.name, rang: r.rang, personen: [], quelle: `${BASIS}/p4presults/${r.t.n}`, abgerufen: datum });
    const e = zusammen.get(k); if (!e.personen.includes(r.person)) e.personen.push(r.person);
  }
  const eintraege = [...zusammen.values()].filter((e) => e.datum).sort((a, b) => b.datum.localeCompare(a.datum) || a.turnier.localeCompare(b.turnier) || a.disziplin.localeCompare(b.disziplin) || a.rang - b.rang);
  for (const e of zusammen.values()) if (!e.datum) offen.push(`P4P ${e.turnier} ${e.disziplin}: kein Datum auf der Ergebnisseite`);
  return { eintraege, offen, mehrdeutig, gegenprobe_fehlt: fehlt };
}
