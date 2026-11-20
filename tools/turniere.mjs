// Turniere und Champions League aus Coral-Speicherständen (siehe coral.mjs). Reine Funktionen ohne Netz.
// Keine Spieler-IDs, keine Punkte, keine Coral-Kennungen von Spielern oder Teams: nur Turnier, Klasse, Rang, Quelle.
import { QuelleVeraendert } from './gemeinsam.mjs';

const hart = (b, t) => { if (!b) throw new QuelleVeraendert(t); };
export const CORAL_SEITE = (code) => `https://app.tablesoccer.org/p/${code}`;
// Kategorien der Verbandstour, die einen eigenen Bereich haben oder nicht zählen (TFCZ-README, Regel Turniere)
export const STF_AUSGESCHLOSSEN = /Finals|League|Cup/i;
const KURZ = { OD: 'Open Doubles', OS: 'Open Singles', OM: 'Open Mixed' };
const NATI = /^[A-Z]N\d+$|^ONT\d+$/;
const sauber = (s) => String(s).replace(/\s+/g, ' ').trim();

export function turnierName(name) {
  return sauber(String(name).replace(/^\[Imported\]\s*/i, '').replace(/\s*-\s*\d{4}-\d{2}-\d{2}\s*$/, ''));
}
export function turnierDatum(meta, name) {
  const imp = /(\d{4}-\d{2}-\d{2})\s*$/.exec(String(name));
  if (/^\[Imported\]/i.test(name) && imp) return imp[1];
  return String(meta.start_on || '').slice(0, 10);
}
export function disziplinName(c, turnier) {
  const kurz = (c.team_category && c.team_category.short_name) || '';
  let n = sauber(String(c.name).replace(/^STF\s*-\s*/i, '').replace(/\s*\(STF\)\s*$/i, ''));
  if (!n || sauber(n).toLowerCase().startsWith(sauber(turnier).toLowerCase().slice(0, 12))) n = KURZ[kurz] || n;
  return n;
}

// Spieler (Name) einer Mannschaft in einem Wettbewerb: nur bestätigte Meldungen dieses Wettbewerbs
function spielerVon(v, c, tid) {
  const ids = new Set();
  for (const cp of Object.values(v.competition_players)) if (cp.team_id === tid && cp.competition_id === c.id && cp.status !== 'removed') ids.add(cp.player_id);
  return [...ids].map((i) => v.players[String(i)]).filter(Boolean);
}

function pruefeStore(slug, v) {
  hart(v.tournament && v.competitions && v.players && v.competition_players, `Turnier ${slug}: Store ohne erwartete Teile (Coral verändert)`);
}

// meta: { code, name, start_on, serie, kategorie }. Gibt Einträge mit Rang 1 bis 3 der Einzel- und Doppelwettbewerbe.
export function coralAbleiten(v, meta, P, datum) {
  pruefeStore(meta.code, v);
  const turnier = turnierName(meta.name || v.tournament.name);
  const tag = turnierDatum({ start_on: meta.start_on || String(v.tournament.start_at).slice(0, 10) }, meta.name || '');
  hart(/^\d{4}-\d{2}-\d{2}$/.test(tag), `Turnier ${meta.code}: kein Datum`);
  const ort = v.tournament.address && v.tournament.address.meta && v.tournament.address.meta.country && v.tournament.address.meta.country.name;
  const stadt = v.tournament.address && v.tournament.address.meta && v.tournament.address.meta.locality && v.tournament.address.meta.locality.name;
  const eintraege = [];
  for (const c of Object.values(v.competitions)) {
    if (c.status !== 'finished') continue;
    const kurz = (c.team_category && c.team_category.short_name) || '';
    if (NATI.test(kurz) || /national team/i.test(c.name)) continue;
    if (!c.standings || Array.isArray(c.standings)) continue;
    for (const rang of [1, 2, 3]) {
      const tid = c.standings[String(rang)]; if (!tid) continue;
      const mitglieder = [...new Map(spielerVon(v, c, tid).map((sp) => P.finde(`${sp.first_name} ${sp.last_name}`)).filter(Boolean).map((x) => [x.id, x])).values()];
      if (!mitglieder.length) continue;
      const e = { jahr: Number(tag.slice(0, 4)), datum: tag, turnier, serie: meta.serie, disziplin: disziplinName(c, turnier), rang, personen: mitglieder.map((x) => x.id).sort(), quelle: CORAL_SEITE(meta.code), abgerufen: datum };
      if (meta.serie === 'ITSF') { e.ort = [stadt, ort].filter(Boolean).join(', '); }
      eintraege.push(e);
    }
  }
  return eintraege;
}

// Gleiches Turnier in zwei Quellen: Datum (±1 Tag), Rang und Personen gleich -> ein Eintrag (der erste bleibt)
export function doppelte(eintraege) {
  const tage = (d) => Math.round(Date.parse(d) / 864e5);
  const aus = [];
  for (const e of eintraege) {
    const gleich = aus.find((a) => a.serie !== e.serie && a.rang === e.rang && Math.abs(tage(a.datum) - tage(e.datum)) <= 1 && a.personen.join() === e.personen.join() && a.disziplin.toLowerCase().replace(/\W/g, '').slice(0, 6) === e.disziplin.toLowerCase().replace(/\W/g, '').slice(0, 6));
    if (!gleich) aus.push(e);
  }
  return aus;
}

// ---------- Champions League ----------
// Teilnahme des Clubs (Teamname passt auf muster) in einer Club-Meisterschaft (European Champions League, ITSF World Champions League).
export function championsAbleiten(v, meta, P, muster = /luz|lucern|tfcl/i, datum) {
  pruefeStore(meta.code, v);
  hart(v.teams, `Champions League ${meta.code}: Store ohne teams`);
  const tag = String(v.tournament.start_at || '').slice(0, 10);
  hart(/^\d{4}-\d{2}-\d{2}$/.test(tag), `Champions League ${meta.code}: kein Datum`);
  const ort = v.tournament.address && v.tournament.address.meta && v.tournament.address.meta.locality && v.tournament.address.meta.locality.name;
  const land = v.tournament.address && v.tournament.address.meta && v.tournament.address.meta.country && v.tournament.address.meta.country.name;
  const aus = [];
  for (const t of Object.values(v.teams)) {
    if (!muster.test(`${t.name || ''} ${t.rename || ''}`)) continue;
    for (const c of Object.values(v.competitions)) {
      if (c.status !== 'finished' || !c.standings || Array.isArray(c.standings)) continue;
      const eintrag = Object.entries(c.standings).find(([, tid]) => tid === t.id);
      if (!eintrag) continue;
      const kader = [...new Map(spielerVon(v, c, t.id).map((sp) => P.finde(`${sp.first_name} ${sp.last_name}`)).filter(Boolean).map((x) => [x.id, x])).values()];
      aus.push({ jahr: Number(tag.slice(0, 4)), datum: tag, wettbewerb: sauber(v.tournament.name), klasse: sauber(c.name), ort: [ort, land].filter(Boolean).join(', '), rang: Number(eintrag[0]), teams: Object.keys(c.standings).length, kader: kader.map((x) => x.id).sort(), quelle: CORAL_SEITE(meta.code), abgerufen: datum });
    }
  }
  return aus;
}
