#!/usr/bin/env node
// Holt aus FAST (altes Turniersystem der ITSF) je Turnier der Liste alle Wettbewerbe und deren Ränge 1 bis 3, schonend (3 parallel).
// Kennungen, die FAST nicht mehr kennt (fast alle ITSF-Turniere 2005 bis 2014), ergeben eine Datei ohne Wettbewerbe.
//   node tools/fast-holen.mjs <liste.json> <ausgabeordner> [parallel]
import fs from 'node:fs';
import path from 'node:path';

const [liste, aus, par = '3'] = process.argv.slice(2);
fs.mkdirSync(aus, { recursive: true });
const B = 'https://extranet.fast4foos.org/fast/tournament/players_station';
const ENT = { nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>', apos: "'" };
const latin = { Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', auml: 'ä', ouml: 'ö', uuml: 'ü', szlig: 'ß', eacute: 'é', egrave: 'è', ecirc: 'ê', Eacute: 'É', agrave: 'à', aacute: 'á', acirc: 'â', ccedil: 'ç', Ccedil: 'Ç', iacute: 'í', icirc: 'î', iuml: 'ï', ocirc: 'ô', oacute: 'ó', ograve: 'ò', uacute: 'ú', ucirc: 'û', ugrave: 'ù', ntilde: 'ñ', Ntilde: 'Ñ', atilde: 'ã', otilde: 'õ', oslash: 'ø', Oslash: 'Ø', aring: 'å', Aring: 'Å', aelig: 'æ', yacute: 'ý', euml: 'ë', Scaron: 'Š', scaron: 'š', Zcaron: 'Ž', zcaron: 'ž' };
const dec = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&([a-zA-Z]+);/g, (m, n) => ENT[n] ?? latin[n] ?? m);
const text = (h) => dec(h.replace(/<[^>]*>/g, '|')).replace(/[ \t\r\n]+/g, ' ').replace(/(\s*\|\s*)+/g, '|');

async function hole(url, jar) {
  for (let v = 0; v < 4; v++) {
    try {
      const r = await fetch(url, { headers: { cookie: jar.c || '' }, signal: AbortSignal.timeout(45000) });
      const sc = r.headers.getSetCookie?.() || [];
      for (const c of sc) { const kv = c.split(';')[0]; if (kv.startsWith('JSESSIONID')) jar.c = kv; }
      const buf = Buffer.from(await r.arrayBuffer());
      return new TextDecoder('utf-8').decode(buf);
    } catch (e) { await new Promise((r) => setTimeout(r, 2000 * (v + 1))); }
  }
  throw new Error('fehlgeschlagen ' + url);
}

function raenge(h) {
  const t = text(h);
  const out = {};
  for (const art of ['Elimination rankings', 'Final rankings', 'Qualification rankings', 'Rankings']) {
    const i = t.indexOf(art);
    if (i < 0) continue;
    const s = t.slice(i, i + 6000);
    const re = /\|(\d+)\|([^|]+(?:\|[A-Z]{3}\|[^|]*)*)\|(\d+)?/g;
    const zeilen = [];
    // Zeilen: |Rang|Name (|LND|) - Name (|LND|) (TS n)|Punkte
    const teile = s.split(/\|(?=\d+\|[^0-9|])/);
    for (const z of teile.slice(1)) {
      const m = z.match(/^(\d+)\|(.*)$/);
      if (!m) continue;
      const rang = +m[1];
      if (rang > 3) break;
      let team = m[2].split(/\|\d+\|/)[0].replace(/\|/g, '').replace(/\s*\(TS \d+\)\s*/g, ' ').trim();
      zeilen.push({ rang, team });
    }
    out[art] = zeilen;
  }
  return out;
}

const L = JSON.parse(fs.readFileSync(liste, 'utf8'));
const seen = new Set();
const todo = L.filter((x) => x.id && !seen.has(x.id) && seen.add(x.id));
console.log('Turniere', todo.length);
let n = 0;
async function arbeiter() {
  while (todo.length) {
    const x = todo.shift();
    const f = path.join(aus, `${x.id}.json`);
    if (fs.existsSync(f)) continue;
    const jar = {};
    try {
      const h = await hole(`${B}/players_station_home.jsp?tournamentId=0&originalTournamentId=${x.id}&lang=en&noTimeout=true&screenIndex=-1&invalidateSession=true`, jar);
      const th = text(h);
      const kopf = h.match(/font-size:18px; color:gray;">([^<]*)<\/td>[\s\S]{0,400}?currentDateTD">\s*([\d/]+)\s*-\s*([\d/]+)/);
      const c = await hole(`${B}/get_competitions_html.jsp?tournamentId=0&originalTournamentId=${x.id}&lang=en&playerId=0&barCode=null`, jar);
      const comps = [...c.matchAll(/value="([^"]*)" onClick="goToCompetition\(0, (\d+)\)/g)].map((m) => ({ name: dec(m[1]), id: m[2] }));
      for (const k of comps) {
        const ch = await hole(`${B}/players_station_competition.jsp?tournamentId=0&originalTournamentId=${x.id}&lang=en&competitionId=0&originalCompetitionId=${k.id}&playerId=0&barCode=null&screenIndex=-1`, jar);
        k.raenge = raenge(ch);
      }
      fs.writeFileSync(f, JSON.stringify({ ...x, fast_name: kopf ? dec(kopf[1]).trim() : null, von: kopf?.[2] || null, bis: kopf?.[3] || null, fehler: comps.length ? null : (th.includes('Erreur') ? 'Erreur interne' : 'keine Wettbewerbe'), comps }));
    } catch (e) {
      fs.writeFileSync(f + '.fehler', String(e));
    }
    n++;
    if (n % 20 === 0) console.log(n, new Date().toISOString());
  }
}
await Promise.all(Array.from({ length: +par }, arbeiter));
console.log('fertig', n);
