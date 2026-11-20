#!/usr/bin/env node
// Baut daten/hall-of-fame.json: Podestplätze der Spieler mit heutiger Lizenz (daten/spieler.json) in fünf Bereichen.
// Aufruf:  node tools/erneuern.mjs            (holt alle Quellen, schreibt den Schnappschuss)
//          node tools/erneuern.mjs --trocken  (rechnet, schreibt nichts, gibt die Zahlen aus)
// Pflegedatei: daten/pflege.json (Feld nicht_nennen, Saisons, Turniere). Regeln: README.md.
// Exit 0 = geschrieben, 1 = eine Quelle ist nicht erreichbar oder hat ihr Format verändert (nichts geschrieben), 2 = falscher Aufruf.
// Mitglied heisst hier nur: heutige Lizenz beim Club (spieler.json). Keine Spieler-IDs, keine Punkte, keine Coral-Kennungen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuelleVeraendert, schluessel, anzeigeName, heute as heuteDatum, liesJson, schreibeJson } from './gemeinsam.mjs';
import { echt, URL_ARCHIV, URL_PDF } from './holen.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEN = path.join(HIER, '..', 'daten');

const hart = (bedingung, text) => { if (!bedingung) throw new QuelleVeraendert(text); };
const MEDAILLE = { 1: 'gold', 2: 'silber', 3: 'bronze' };

// ---------- Personen ----------
// Baut die Namenssuche aus spieler.json. nicht_nennen (Namen oder ids) nimmt Personen heraus.
export function personen(spielerDatei, nichtNennen = []) {
  const sperre = new Set(nichtNennen.map((x) => schluessel(x)));
  const sperreIds = new Set(nichtNennen);
  const nachSchluessel = new Map();
  const gesperrt = new Set();
  for (const s of spielerDatei.spieler) {
    const namen = [s.name, ...(s.schreibweisen || [])];
    if (sperreIds.has(s.id) || namen.some((n) => sperre.has(schluessel(n)))) { for (const n of namen) gesperrt.add(schluessel(n)); continue; }
    for (const n of namen) nachSchluessel.set(schluessel(n), s);
  }
  return {
    finde: (name) => nachSchluessel.get(schluessel(name)) || null,
    gesperrt: (name) => gesperrt.has(schluessel(name)) || sperre.has(schluessel(name)),
    alle: [...new Set(nachSchluessel.values())],
  };
}

// «Nachname Vorname» (Verband) in «Vorname Nachname»: der letzte Teil ist der Vorname, ein Zusatz wie «H.» zählt dazu.
export function vorNach(name) {
  const t = String(name).trim().split(/\s+/);
  if (t.length < 2) return String(name).trim();
  let n = 1;
  while (n < t.length - 1 && /^\p{Lu}\.$/u.test(t[t.length - n])) n++;
  return `${t.slice(t.length - n).join(' ')} ${t.slice(0, t.length - n).join(' ')}`;
}

// ---------- Schweizermeisterschaft ----------
const SM_KATEGORIEN = {
  'Men Doubles': 'Herren Doppel', 'Men Singles': 'Herren Einzel', 'Women Doubles': 'Damen Doppel', 'Women Singles': 'Damen Einzel',
  'Open Mixed': 'Mixed', 'Senior Over 50 Doubles': 'Senioren Doppel', 'Senior Over 50 Singles': 'Senioren Einzel',
  'Junior Doubles': 'Junioren Doppel', 'Junior Singles': 'Junioren Einzel',
};
export const SM_QUELLE = 'https://tournaments.swisstablesoccer.ch/hall-of-fame/';

export function smAbleiten(antwort, P, datum) {
  hart(antwort && typeof antwort === 'object' && !Array.isArray(antwort), 'SM: Antwort ist kein Objekt');
  const eintraege = new Map(); // id -> platzierungen
  const offen = [];
  for (const [kat, jahre] of Object.entries(antwort)) {
    hart(SM_KATEGORIEN[kat], `SM: fremde Kategorie «${kat}»`);
    hart(jahre && typeof jahre === 'object', `SM: ${kat} ohne Jahre`);
    for (const [jahrKey, raenge] of Object.entries(jahre)) {
      const m = /^(\d{4})(?:-(\d)| \(Event (\d)\))?$/.exec(jahrKey);
      hart(m, `SM: fremder Jahresschlüssel «${jahrKey}»`);
      const jahr = Number(m[1]); const event = m[2] || m[3] ? `Event ${m[2] || m[3]}` : null;
      for (const [rk, e] of Object.entries(raenge || {})) {
        hart(e && [1, 2, 3].includes(Number(e.rank)) && Array.isArray(e.players) && e.players.every((p) => typeof p.name === 'string'), `SM: fremder Eintrag ${kat} ${jahrKey} ${rk}`);
        const spieler = e.players.map((p) => ({ roh: p.name, person: P.finde(p.name) }));
        for (const s of spieler) if (!s.person && !P.gesperrt(s.roh)) {
          const ohneInitial = schluessel(s.roh.replace(/\b\p{Lu}\.(?=\s|$)/gu, ''));
          const nahe = P.alle.find((x) => schluessel(x.name) === ohneInitial && schluessel(x.name) !== schluessel(s.roh));
          if (nahe) offen.push(`SM ${jahr} ${SM_KATEGORIEN[kat]} Rang ${e.rank}: «${s.roh}» ähnelt der Lizenz «${nahe.name}» (Zusatz im Namen), nicht gezählt`);
        }
        for (const s of spieler.filter((x) => x.person)) {
          const partner = spieler.filter((x) => x !== s).map((x) => (x.person
            ? { name: x.person.name, id: x.person.id }
            : { name: P.gesperrt(x.roh) ? 'Partner' : vorNach(x.roh), id: null }));
          const l = eintraege.get(s.person.id) || []; eintraege.set(s.person.id, l);
          l.push({ jahr, event, kategorie: SM_KATEGORIEN[kat], rang: Number(e.rank), partner, quelle: SM_QUELLE, abgerufen: datum });
        }
      }
    }
  }
  for (const l of eintraege.values()) l.sort((a, b) => b.jahr - a.jahr || a.rang - b.rang || a.kategorie.localeCompare(b.kategorie, 'de'));
  return { eintraege, offen };
}

// ---------- Jahresrangliste ----------
const CMS_KATEGORIEN = { 312: 'Open Doppel', 308: 'Open Einzel', 314: 'Damen Doppel', 310: 'Damen Einzel', 316: 'Mixed', 315: 'Senioren Doppel', 311: 'Senioren Einzel', 313: 'Junior Doppel', 309: 'Junior Einzel' };
export const CMS_URL = (saison, kat) => `https://api.tablesoccer.org/cms.rankings?tour=78&season=${saison}&rule=1&category=${kat}`;

// seiten: { kategorieNr: [antwortSeite1, ...] } mit standings[] { rank, team:[{player}] }
export function ranglisteCms(seiten, saison, jahr, status, P, datum) {
  const aus = [];
  for (const [kat, name] of Object.entries(CMS_KATEGORIEN)) {
    const liste = seiten[kat];
    hart(Array.isArray(liste) && liste.length && liste.every((s) => Array.isArray(s.standings)), `Jahresrangliste ${saison}: Kategorie ${kat} ohne standings (Antwort verändert)`);
    for (const s of liste.flatMap((x) => x.standings)) {
      hart(Number.isFinite(s.rank) && Array.isArray(s.team), `Jahresrangliste ${saison}: Zeile ohne rank oder team`);
      if (s.rank > 3) continue;
      for (const t of s.team) {
        hart(typeof t.player === 'string', `Jahresrangliste ${saison}: Spieler ohne Namen`);
        const p = P.finde(t.player);
        if (p) aus.push({ person: p.id, saison: jahr, status, kategorie: name, rang: s.rank, quelle: CMS_URL(saison, kat), abgerufen: datum });
      }
    }
  }
  return aus;
}

const ARCHIV_KATEGORIEN = {
  'Open Doubles': 'Open Doppel', 'Open Single': 'Open Einzel', 'Open Singles': 'Open Einzel', 'Woman Doubles': 'Damen Doppel', 'Women Doubles': 'Damen Doppel',
  'Woman Single': 'Damen Einzel', 'Women Singles': 'Damen Einzel', 'Woman Singles': 'Damen Einzel', 'Mixed': 'Mixed', 'Mixed Doubles': 'Mixed', 'Rookie Doubles': 'Neulinge Doppel',
};
// Liest den Übersichtsstand der alten Verbandsseite: je Kategorie die Plätze 1 bis 3. Gibt [{ kategorie, rang, name }].
export function archivLesen(html, jahr) {
  const rein = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '|').replace(/&nbsp;/g, ' ');
  const teile = rein.split('|').map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x && x !== '-->');
  const aus = []; let kat = null; let gefunden = 0;
  for (const t of teile) {
    const k = /^(.+?) (20\d\d)$/.exec(t);
    if (k && !/^Ranking/i.test(k[1])) {
      hart(Number(k[2]) === jahr, `Archivstand: Block «${t}» gehört nicht zur Saison ${jahr}`);
      kat = ARCHIV_KATEGORIEN[k[1]] || null; hart(kat, `Archivstand: fremde Kategorie «${k[1]}»`); gefunden++; continue;
    }
    if (/^Gesamte Rangliste/i.test(t)) { kat = null; continue; }
    const r = /^([1-9]\d?)\. (.+)$/.exec(t);
    if (kat && r && Number(r[1]) <= 3) aus.push({ kategorie: kat, rang: Number(r[1]), name: r[2].trim() });
  }
  hart(gefunden >= 4 && aus.length >= 12, `Archivstand ${jahr}: zu wenig Blöcke (${gefunden}) oder Plätze (${aus.length}), Seitenaufbau verändert`);
  return aus;
}

export function ranglisteArchiv(staende, jahr, status, P, datum) {
  // staende: [{ zeitstempel, html }]. Bei «stabil» müssen alle Stände dieselben Plätze zeigen.
  const gelesen = staende.map((s) => ({ ...s, plaetze: archivLesen(s.html, jahr) }));
  const ref = JSON.stringify(gelesen[0].plaetze);
  for (const g of gelesen) hart(JSON.stringify(g.plaetze) === ref, `Archivstand ${g.zeitstempel} weicht von ${gelesen[0].zeitstempel} ab (nicht stabil)`);
  if (status === 'stabil') hart(gelesen.length >= 2, `Saison ${jahr}: «stabil» braucht mindestens zwei gleiche Stände`);
  const letzter = gelesen[gelesen.length - 1];
  const aus = [];
  for (const p of letzter.plaetze) { const person = P.finde(p.name); if (person) aus.push({ person: person.id, saison: jahr, status, kategorie: p.kategorie, rang: p.rang, quelle: URL_ARCHIV(letzter.zeitstempel), abgerufen: datum }); }
  return aus;
}

// ---------- Nati ----------
const NATI_TEAMS = { M: 'Herren', W: 'Damen', S: 'Senioren', J: 'Junioren', D: 'Rollstuhl' };
// stores: { slug: store | null }. Nur Schweizer Nationalteams (Land CH, Wettbewerb «…N<Zahl>») auf Rang 1 bis 3.
export function natiAbleiten(stores, P, datum) {
  const eintraege = []; const offen = [];
  for (const [slug, v] of Object.entries(stores)) {
    if (!v) { offen.push(`Nati: ${slug} liefert keine Daten`); continue; }
    hart(v.tournament && v.competitions && v.teams && v.players && v.competition_players && v.team_players_index, `Nati ${slug}: Store ohne erwartete Teile (Coral verändert)`);
    const jahr = Number(String(v.tournament.start_at || '').slice(0, 4)); hart(jahr > 2000, `Nati ${slug}: kein Startdatum`);
    for (const c of Object.values(v.competitions)) {
      const kurz = (c.team_category && c.team_category.short_name) || '';
      const m = /^([A-Z])N\d+$/.exec(kurz); if (!m || c.status === 'removed') continue;
      hart(NATI_TEAMS[m[1]], `Nati ${slug}: fremde Teamart «${kurz}»`);
      if (!c.standings || Array.isArray(c.standings)) continue;
      for (const [rang, tid] of Object.entries(c.standings)) {
        if (Number(rang) > 3) continue;
        const t = v.teams[String(tid)]; if (!t || t.land !== 'CH') continue;
        const ids = new Set(v.team_players_index[String(tid)] || []);
        for (const cp of Object.values(v.competition_players)) if (cp.team_id === tid && cp.status !== 'removed') ids.add(cp.player_id);
        const mitglieder = [...ids].map((i) => v.players[String(i)]).filter(Boolean).map((sp) => P.finde(`${sp.first_name} ${sp.last_name}`)).filter(Boolean);
        const einzig = [...new Map(mitglieder.map((x) => [x.id, x])).values()];
        if (!einzig.length) continue;
        eintraege.push({ jahr, turnier: String(v.tournament.name).replace(/\s*\b20\d\d\b/, '').replace(/\s+/g, ' ').trim(), team: NATI_TEAMS[m[1]], rang: Number(rang), kader: ids.size, personen: einzig.map((x) => x.id).sort(), quelle: `https://app.tablesoccer.org/p/${slug}`, abgerufen: datum });
      }
    }
  }
  eintraege.sort((a, b) => b.jahr - a.jahr || a.rang - b.rang || a.team.localeCompare(b.team, 'de') || a.turnier.localeCompare(b.turnier, 'de'));
  return { eintraege, offen };
}

// ---------- Clubliga ----------
// items: Textstücke des PDF { seite, x, y, str }. Gibt { tabellen: [{ liga, zeilen: [{ rang, club, team }] }], titelJahr }.
export function pdfLesen(items) {
  const zeilen = [];
  const sortiert = [...items].sort((a, b) => a.seite - b.seite || b.y - a.y || a.x - b.x);
  for (const i of sortiert) {
    const z = zeilen[zeilen.length - 1];
    if (z && z.seite === i.seite && Math.abs(z.y - i.y) <= 3) z.teile.push(i); else zeilen.push({ seite: i.seite, y: i.y, teile: [i] });
  }
  const tabellen = []; let t = null; let teamX = null; let titelJahr = null;
  for (const z of zeilen) {
    const erste = z.teile[0].str;
    const titel = /RANGLISTE\s+(20\d\d)/i.exec(z.teile.map((x) => x.str).join(' ')); if (titel) { titelJahr = Number(titel[1]); continue; }
    if (z.teile.length === 1 && /(league|leauge|liga|cup)/i.test(erste) && !/champ?ions/i.test(erste) && !/^\d+$/.test(erste)) { t = { liga: erste.replace(/Leauge/g, 'League').replace(/\s+/g, ' ').trim(), zeilen: [] }; tabellen.push(t); teamX = null; continue; }
    if (/^(Rank|Rang)$/.test(erste)) { const th = z.teile.find((x) => /^(Team|Club \/ Team)$/.test(x.str)); teamX = th ? th.x : null; continue; }
    if (/^\d{1,2}$/.test(erste) && t && teamX !== null) {
      const rest = z.teile.slice(1);
      const team = rest.find((x) => Math.abs(x.x - teamX) <= 20);
      const club = rest.find((x) => x !== team && x.x < teamX - 20);
      hart(team, `Clubliga: Zeile ohne Team in «${t.liga}» (Rang ${erste})`);
      t.zeilen.push({ rang: Number(erste), club: club ? club.str : '', team: team.str });
    }
  }
  return { tabellen, titelJahr };
}
export function ligaAbleiten(items, jahr, datum, muster = 'luzern|tfcl|luze') {
  const LUZERN = new RegExp(muster, 'i');
  const { tabellen, titelJahr } = pdfLesen(items);
  hart(tabellen.length >= 3 && tabellen.every((t) => t.zeilen.length >= 2 || /cup/i.test(t.liga)), `Clubliga ${jahr}: Tabellen nicht lesbar (${tabellen.length} gefunden)`);
  if (titelJahr) hart(titelJahr === jahr, `Clubliga ${jahr}: PDF trägt die Jahreszahl ${titelJahr}`);
  const eintraege = []; const offen = [];
  for (const t of tabellen) {
    if (/cup/i.test(t.liga)) continue; // der Cup ist kein Liga-Rang
    for (const z of t.zeilen.filter((x) => x.rang <= 3)) {
      if (LUZERN.test(z.team)) eintraege.push({ saison: String(jahr), liga: t.liga, team: z.team, rang: z.rang, quelle: URL_PDF(jahr), abgerufen: datum });
      else if (LUZERN.test(z.club)) offen.push(`Clubliga ${jahr} ${t.liga} Rang ${z.rang}: Club «${z.club}», Team «${z.team}» (Teamname ohne Luzern), nicht gezählt`);
    }
  }
  return { eintraege, offen };
}

// ---------- Fordere-Liga ----------
const norm = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
const spielt = (m) => norm(m.homeName) !== 'freilos' && norm(m.guestName) !== 'freilos';
const reihenfolge = (a, b) => String(a.playDate).localeCompare(String(b.playDate)) || a.id - b.id;
export function ligaVon(name) { if (/\d\s*\/\s*\d\s*\.\s*liga/i.test(name)) return null; const m = /(\d)\s*\.\s*liga/i.exec(name); return m ? `${m[1]}. Liga` : null; }
export function tischartVon(name, tableType) {
  if (/leonhart/i.test(name)) return 'Leonhart';
  if (/ullrich/i.test(name)) return 'Ullrich';
  if (/gar\w*ndo/i.test(name)) return 'Garlando';
  if (/^garlando( deluxe)?$/i.test(String(tableType || '').trim())) return 'Garlando';
  return null;
}
// Rang 1 bis 3 eines KO-Wettbewerbs: roundOf 2 und 3 nennen den Rang (Seite), sonst Ableitung aus den Spielen (README «Fordere-Liga»).
export function raengeVon(w) {
  const hinweise = [];
  const ergebnisse = w.matches.filter(spielt).sort(reihenfolge).map((m) => {
    if (m.homeScore === m.guestScore) return null;
    const heim = m.homeScore > m.guestScore;
    return { sieger: { name: heim ? m.homeName : m.guestName, spieler: (heim ? m.homePlayers : m.guestPlayers) || [] }, verlierer: { name: heim ? m.guestName : m.homeName, spieler: (heim ? m.guestPlayers : m.homePlayers) || [] }, m };
  });
  if (ergebnisse.some((x) => x === null)) return { raenge: [], quelle: null, hinweise: ['offen: Spiel ohne Sieger, Ränge nicht ableitbar'] };
  const niederlagen = new Map(); const siege = new Map(); const spielerVonTeam = new Map();
  for (const x of ergebnisse) {
    niederlagen.set(x.verlierer.name, [...(niederlagen.get(x.verlierer.name) || []), x]);
    siege.set(x.sieger.name, (siege.get(x.sieger.name) || 0) + 1);
    spielerVonTeam.set(x.sieger.name, x.sieger.spieler); spielerVonTeam.set(x.verlierer.name, x.verlierer.spieler);
  }
  const team = (name) => ({ name, spieler: spielerVonTeam.get(name) || [] });
  const unbesiegt = [...siege.keys()].filter((n) => !niederlagen.has(n));
  const zwei = [...niederlagen.entries()].filter(([, l]) => l.length === 2);
  const abgeleitet = {};
  if (unbesiegt.length !== 1) hinweise.push(`offen: ${unbesiegt.length} unbesiegte Teams statt 1`);
  else { abgeleitet[1] = team(unbesiegt[0]); abgeleitet[2] = team([...ergebnisse].reverse().find((x) => x.sieger.name === unbesiegt[0]).verlierer.name); }
  if (zwei.length !== 1) hinweise.push(`offen: ${zwei.length} Teams mit zwei Niederlagen statt 1`); else abgeleitet[3] = team(zwei[0][1][1].sieger.name);
  const finale = ergebnisse.filter((x) => x.m.roundOf === 2); const platz3 = ergebnisse.filter((x) => x.m.roundOf === 3);
  if (finale.length === 1 && platz3.length === 1) {
    const s = { 1: team(finale[0].sieger.name), 2: team(finale[0].verlierer.name), 3: team(platz3[0].sieger.name) };
    for (const r of [1, 2, 3]) if (abgeleitet[r] && abgeleitet[r].name !== s[r].name) hinweise.push(`Abweichung Rang ${r}: Seite «${s[r].name}», Ableitung «${abgeleitet[r].name}»`);
    return { raenge: [1, 2, 3].map((r) => ({ rang: r, ...s[r] })), quelle: 'seite', hinweise };
  }
  return { raenge: [1, 2, 3].filter((r) => abgeleitet[r]).map((r) => ({ rang: r, ...abgeleitet[r] })), quelle: 'abgeleitet', hinweise };
}

// antworten: { nr: final-day-Antwort }, saisons: { nr: { saison, jahr } }
export function fordereAbleiten(antworten, saisons, P, datum) {
  const eintraege = new Map(); const offen = []; const gezaehlteSaisons = [];
  for (const [nr, info] of Object.entries(saisons)) {
    const a = antworten[nr];
    hart(a && Array.isArray(a.competitions), `Fordere-Liga ${nr}: Antwort ohne competitions (Aufbau verändert)`);
    const quelle = `https://fordere.ch/api/seasons/${nr}/final-day`;
    let kos = 0;
    for (const w of a.competitions) {
      hart(typeof w.mode === 'string' && Array.isArray(w.matches), `Fordere-Liga ${nr}: Wettbewerb ohne mode oder matches`);
      if (w.mode !== 'single_ko') continue;
      kos++;
      const liga = ligaVon(w.name); const tischart = tischartVon(w.name, w.tableType);
      if (!w.matches.length) continue;
      if (!liga || !tischart) {
        const wer = raengeVon(w).raenge.flatMap((x) => x.spieler.map((sp) => ({ sp, rang: x.rang }))).map((x) => ({ p: P.finde(x.sp), rang: x.rang })).filter((x) => x.p);
        offen.push(`Fordere Luzern ${info.saison}: «${w.name}» ist ein KO, aber Liga oder Tischart nicht eindeutig, übersprungen${wer.length ? ` (Podest mit Lizenz: ${wer.map((x) => `${x.p.name} Rang ${x.rang}`).join(', ')})` : ''}`);
        continue;
      }
      const r = raengeVon(w);
      for (const h of r.hinweise) offen.push(`Fordere Luzern ${info.saison} «${w.name}»: ${h}`);
      for (const x of r.raenge) for (const sp of x.spieler) {
        const p = P.finde(sp); if (!p) continue;
        const l = eintraege.get(p.id) || []; eintraege.set(p.id, l);
        l.push({ saison: info.saison, jahr: info.jahr, division: 'Luzern', liga, tischart, rang: x.rang, rang_quelle: r.quelle, team: x.name, quelle, abgerufen: datum });
      }
    }
    if (kos) gezaehlteSaisons.push({ saison: info.saison, jahr: info.jahr });
  }
  for (const l of eintraege.values()) l.sort((a, b) => b.jahr - a.jahr || a.rang - b.rang || a.liga.localeCompare(b.liga, 'de'));
  return { eintraege, offen, saisons: gezaehlteSaisons.sort((a, b) => b.jahr - a.jahr) };
}

// ---------- Zusammenbau ----------
const zaehle = (liste) => { const s = { gold: 0, silber: 0, bronze: 0 }; for (const e of liste) s[MEDAILLE[e.rang]]++; return s; };

// Je Person: Platzierungen je Bereich. Gibt die Personen-Zusammenfassung.
function personenBlock(map, P) {
  return [...map.entries()].map(([id, plaetze]) => ({ id, ...zaehle(plaetze), summe: plaetze.length, platzierungen: plaetze }))
    .sort((a, b) => b.gold - a.gold || b.silber - a.silber || b.bronze - a.bronze || id2name(P, a.id).localeCompare(id2name(P, b.id), 'de'));
}
const id2name = (P, id) => (P.alle.find((x) => x.id === id) || { name: id }).name;
const sum = (liste) => ({ podestplaetze: liste.reduce((n, p) => n + p.summe, 0), gold: liste.reduce((n, p) => n + p.gold, 0), silber: liste.reduce((n, p) => n + p.silber, 0), bronze: liste.reduce((n, p) => n + p.bronze, 0), personen: liste.length });

export async function bauen({ spielerDatei, pflege, holen, datum }) {
  const P = personen(spielerDatei, pflege.nicht_nennen || []);
  hart(P.alle.length, 'spieler.json ohne Spieler');
  const offen = [];

  // 1. Schweizermeisterschaft
  const sm = smAbleiten(await holen.sm(), P, datum); offen.push(...sm.offen);

  // 2. Jahresrangliste
  const rl = new Map(); const rlSaisons = [];
  const nimm = (zeilen) => { for (const z of zeilen) { const { person, ...rest } = z; const l = rl.get(person) || []; rl.set(person, l); l.push(rest); } };
  for (const s of pflege.ranglisten.cms) {
    const seiten = {};
    for (const kat of Object.keys(CMS_KATEGORIEN)) {
      seiten[kat] = [await holen.rangliste(s.nr, kat, 1)];
      hart(Array.isArray(seiten[kat][0].standings), `Jahresrangliste ${s.nr}: Kategorie ${kat} ohne standings (Antwort verändert)`);
      while (seiten[kat].at(-1).standings.length && seiten[kat].at(-1).standings.at(-1).rank <= 3 && seiten[kat].length < (seiten[kat][0].pages || 1)) seiten[kat].push(await holen.rangliste(s.nr, kat, seiten[kat].length + 1));
    }
    nimm(ranglisteCms(seiten, s.nr, s.saison, s.status, P, datum)); rlSaisons.push({ saison: s.saison, status: s.status });
  }
  for (const s of pflege.ranglisten.archiv) {
    const staende = []; for (const z of s.staende) staende.push({ zeitstempel: z, html: await holen.archiv(z) });
    nimm(ranglisteArchiv(staende, s.saison, s.status, P, datum)); rlSaisons.push({ saison: s.saison, status: s.status });
  }
  for (const l of rl.values()) l.sort((a, b) => b.saison - a.saison || a.rang - b.rang || a.kategorie.localeCompare(b.kategorie, 'de'));
  offen.push(...(pflege.ranglisten.offen || []));

  // 3. Nati
  const nati = natiAbleiten(await holen.coral(pflege.nati_turniere), P, datum); offen.push(...nati.offen);
  const natiPersonen = new Map();
  for (const e of nati.eintraege) for (const id of e.personen) { const l = natiPersonen.get(id) || []; natiPersonen.set(id, l); l.push({ jahr: e.jahr, turnier: e.turnier, team: e.team, rang: e.rang, quelle: e.quelle, abgerufen: e.abgerufen }); }

  // 4. Clubliga
  const liga = { eintraege: [], offen: [] };
  for (const jahr of pflege.clubliga_jahre) { const l = ligaAbleiten(await holen.pdf(jahr), jahr, datum, pflege.clubliga_muster); liga.eintraege.push(...l.eintraege); offen.push(...l.offen); }
  liga.eintraege.sort((a, b) => Number(b.saison) - Number(a.saison) || a.rang - b.rang || a.liga.localeCompare(b.liga, 'de'));

  // 5. Fordere-Liga (Division Luzern)
  const fSaisons = pflege.fordere.luzern; const fAntworten = {};
  for (const nr of Object.keys(fSaisons)) fAntworten[nr] = await holen.fordere(nr);
  const fordere = fordereAbleiten(fAntworten, fSaisons, P, datum); offen.push(...fordere.offen);

  // Ergebnis
  const smB = personenBlock(sm.eintraege, P); const rlB = personenBlock(rl, P); const naB = personenBlock(natiPersonen, P); const foB = personenBlock(fordere.eintraege, P);
  const ligaSumme = { podestplaetze: liga.eintraege.length, ...zaehle(liga.eintraege) };
  const bereiche = [
    { schluessel: 'sm', titel: 'Schweizermeisterschaft', einheit: 'Medaillen je Person', anker: 'sm', daten: 'sm', summe: sum(smB) },
    { schluessel: 'nati', titel: 'Nati', einheit: 'Medaillen je Person', anker: 'nati', daten: 'nati', summe: sum(naB) },
    { schluessel: 'ranglisten', titel: 'Jahresrangliste', einheit: 'Podestplätze je Person', anker: 'ranglisten', daten: 'ranglisten', summe: sum(rlB) },
    { schluessel: 'liga', titel: 'Clubliga', einheit: 'Podestplätze je Team', anker: 'liga', daten: 'liga', summe: ligaSumme },
    { schluessel: 'fordere', titel: 'Fordere-Liga', untertitel: 'Bar-foos-League Luzern, Finaltag', einheit: 'Podestplätze je Person', anker: 'fordere', daten: 'fordere', summe: sum(foB) },
  ];
  // Personenverzeichnis mit Gesamtzahl (Liga zählt je Team, steht nicht darin)
  const proPerson = new Map();
  for (const [bereich, block] of [['sm', smB], ['nati', naB], ['ranglisten', rlB], ['fordere', foB]]) for (const p of block) {
    const e = proPerson.get(p.id) || { id: p.id, name: id2name(P, p.id), gold: 0, silber: 0, bronze: 0, summe: 0, bereiche: {} };
    proPerson.set(p.id, e); e.gold += p.gold; e.silber += p.silber; e.bronze += p.bronze; e.summe += p.summe; e.bereiche[bereich] = p.summe;
  }
  const verzeichnis = [...proPerson.values()].sort((a, b) => b.summe - a.summe || b.gold - a.gold || b.silber - a.silber || a.name.localeCompare(b.name, 'de'));
  const gesamt = { podestplaetze: verzeichnis.reduce((n, p) => n + p.summe, 0) + ligaSumme.podestplaetze, gold: verzeichnis.reduce((n, p) => n + p.gold, 0) + ligaSumme.gold, silber: verzeichnis.reduce((n, p) => n + p.silber, 0) + ligaSumme.silber, bronze: verzeichnis.reduce((n, p) => n + p.bronze, 0) + ligaSumme.bronze, personen: verzeichnis.length };
  const nur = (b) => b.map(({ id, gold, silber, bronze, summe, platzierungen }) => ({ id, gold, silber, bronze, summe, platzierungen }));
  return {
    club: spielerDatei.club, clubname: pflege.clubname, erstellt: datum,
    hinweis: 'Podestplätze der Spieler mit heutiger Lizenz beim Club. Jeder Eintrag trägt quelle und abgerufen. Keine Spieler-IDs, keine Punkte, keine Coral-Kennungen.',
    spieler_mit_lizenz: P.alle.length,
    gesamt, bereiche, verzeichnis,
    sm: { abgerufen: datum, quelle: SM_QUELLE, personen: nur(smB) },
    nati: { abgerufen: datum, eintraege: nati.eintraege },
    ranglisten: { abgerufen: datum, saisons: rlSaisons.sort((a, b) => b.saison - a.saison), personen: nur(rlB) },
    liga: { abgerufen: datum, eintraege: liga.eintraege },
    fordere: { abgerufen: datum, seite: 'https://fordere.ch', divisionen: ['Luzern'], saisons: fordere.saisons, personen: nur(foB) },
    offen,
  };
}

export async function haupt(argv, opt = {}) {
  const daten = opt.daten || DATEN; const holenFn = opt.holen || echt;
  const trocken = argv.includes('--trocken');
  for (const a of argv) if (a !== '--trocken') { console.error(`unbekannte Option ${a}`); return 2; }
  const datum = heuteDatum();
  try {
    const spielerDatei = liesJson(path.join(daten, 'spieler.json'));
    const pflege = liesJson(path.join(daten, 'pflege.json'));
    hart(Array.isArray(pflege.nicht_nennen), 'pflege.json: nicht_nennen fehlt');
    const s = await bauen({ spielerDatei, pflege, holen: holenFn, datum: opt.datum || datum });
    const g = s.gesamt;
    console.error(`Gold ${g.gold}, Silber ${g.silber}, Bronze ${g.bronze} (${g.podestplaetze} Podestplätze, ${g.personen} Personen)`);
    for (const b of s.bereiche) console.error(`  ${b.titel}: ${b.summe.podestplaetze} (${b.summe.gold}/${b.summe.silber}/${b.summe.bronze})${b.summe.personen !== undefined ? `, ${b.summe.personen} Personen` : ''}`);
    for (const o of s.offen) console.error(`  offen: ${o}`);
    if (trocken) return 0;
    schreibeJson(path.join(daten, 'hall-of-fame.json'), s);
    console.error('geschrieben: daten/hall-of-fame.json');
    return 0;
  } catch (f) {
    console.error(`Abbruch: ${f.message}. Nichts geschrieben.`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await haupt(process.argv.slice(2)));
