/* Hall of Fame TFC Luzern: aus dem Schnappschuss (daten/hall-of-fame.json) wird Text und Markup.
   Reine Funktionen ohne DOM. Dieselbe Datei nutzen der Browser (seite.js) und tools/fest.mjs,
   das den Anfangszustand beim Bau fest ins HTML schreibt. Eine Zahl steht nie von Hand im HTML. */

const ZEICHEN = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ZEICHEN[c]);
export const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'");

const METALL = { 1: 'Gold', 2: 'Silber', 3: 'Bronze' };
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const datumLang = (iso) => { const [j, m, t] = iso.split('-').map(Number); return `${t}. ${MONATE[m - 1]} ${j}`; };

const PFEIL = '<svg class="symbol symbol--klein symbol--pfeil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

/* ---------- Modell ---------- */

export function modell(j) {
  if (!j || !Array.isArray(j.verzeichnis) || !j.gesamt || !Array.isArray(j.bereiche)) throw new Error('Schnappschuss hat ein fremdes Format');
  const personen = new Map(j.verzeichnis.map((p) => [p.id, { id: p.id, name: p.name, eintraege: [], soll: p.summe }]));
  const hinzu = (id, e) => {
    const p = personen.get(id);
    if (!p) throw new Error(`Person ${id} fehlt im Verzeichnis`);
    p.eintraege.push(e);
  };
  for (const p of j.sm.personen) for (const x of p.platzierungen) {
    hinzu(p.id, {
      bereich: 'sm', jahr: x.jahr, rang: x.rang, kategorie: x.kategorie, event: x.event || null, quelle: x.quelle,
      /* Partner ohne Lizenz stehen im Schnappschuss, die Freigabe des Briefings deckt nur Spieler mit Lizenz. */
      partner: (x.partner || []).filter((q) => q.id && personen.has(q.id)).map((q) => personen.get(q.id).name),
    });
  }
  for (const e of j.nati.eintraege) for (const id of e.personen) hinzu(id, { bereich: 'nati', jahr: e.jahr, rang: e.rang, team: e.team, turnier: e.turnier, quelle: e.quelle });
  for (const p of j.ranglisten.personen) for (const x of p.platzierungen) hinzu(p.id, { bereich: 'ranglisten', jahr: x.saison, rang: x.rang, kategorie: x.kategorie, quelle: x.quelle });
  for (const p of j.fordere.personen) for (const x of p.platzierungen) hinzu(p.id, { bereich: 'fordere', jahr: x.jahr, saison: x.saison, rang: x.rang, liga: x.liga, tischart: x.tischart, quelle: x.quelle });
  for (const p of personen.values()) {
    if (p.eintraege.length !== p.soll) throw new Error(`${p.name}: ${p.eintraege.length} Einträge, Verzeichnis nennt ${p.soll}`);
    p.eintraege.sort((a, b) => b.jahr - a.jahr || a.rang - b.rang || a.bereich.localeCompare(b.bereich));
  }
  const teams = j.liga.eintraege.map((e) => ({ saison: e.saison, liga: e.liga, team: e.team, rang: e.rang, quelle: e.quelle }))
    .sort((a, b) => b.saison - a.saison || a.rang - b.rang);
  const bereiche = j.bereiche.map((b) => ({ k: b.schluessel, titel: b.titel, summe: b.summe }));
  return { stand: j.erstellt, lizenzen: j.spieler_mit_lizenz, gesamt: j.gesamt, bereiche, personen: [...personen.values()], teams };
}

export const zaehle = (liste) => {
  const z = { gold: 0, silber: 0, bronze: 0, summe: liste.length };
  for (const e of liste) z[METALL[e.rang].toLowerCase()]++;
  return z;
};

/* ---------- Höchster Titel unter dem Namen (Regel 13 der Hall of Fame des TFCZ) ---------- */

const BEREICH_REIHE = { sm: 0, ranglisten: 1, liga: 3, fordere: 4, nati: 5 };
const klasse = (k = '') => /^(open|herren|offen)/i.test(k) ? 0 : /damen/i.test(k) ? 2 : /senioren/i.test(k) ? 3 : /mixed/i.test(k) ? 4 : /junior/i.test(k) ? 8 : 9;
const stufe = (e) => e.bereich === 'nati' && e.rang === 1 ? 0 : e.bereich === 'sm' && e.rang === 1 ? 1 : e.bereich === 'nati' && e.rang === 2 ? 2 : e.bereich === 'nati' && e.rang === 3 ? 3 : 4;
const kennung = (e) => `${e.bereich}|${e.kategorie || e.team || ''}|${e.rang}`;
const vergleich = (a, b) => stufe(a) - stufe(b) || a.rang - b.rang || BEREICH_REIHE[a.bereich] - BEREICH_REIHE[b.bereich] || klasse(a.kategorie) - klasse(b.kategorie);

function titelWort(e) {
  const k = e.kategorie || '';
  switch (e.bereich) {
    case 'nati': return `Nati-${METALL[e.rang]} ${e.team}`;
    case 'sm': return e.rang === 1 ? `Schweizer Meister ${k}` : `${e.rang}. Rang Schweizermeisterschaft ${k}`;
    case 'ranglisten': return e.rang === 1 ? `Jahresbester ${k}` : `${e.rang}. Rang Jahresrangliste ${k}`;
    case 'fordere': return e.rang === 1 ? 'Fordere-Sieg' : `${e.rang}. Rang Fordere-Liga`;
    default: return `${e.rang}. Rang`;
  }
}

export function hoechsterTitel(liste) {
  const gruppen = new Map();
  for (const e of liste) { const k = kennung(e); gruppen.set(k, { e, n: (gruppen.get(k)?.n || 0) + 1 }); }
  const beste = [...gruppen.values()].sort((a, b) => vergleich(a.e, b.e) || b.n - a.n || titelWort(a.e).localeCompare(titelWort(b.e), 'de'))[0];
  return `${titelWort(beste.e)}${beste.n > 1 ? `, ${beste.n}×` : ''}`;
}

/* ---------- Auswahl ---------- */

const glatt = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function zeilen(m, auswahl = { bereich: 'alle', q: '' }) {
  if (auswahl.bereich === 'liga') return [];
  const q = glatt((auswahl.q || '').trim());
  const aus = [];
  for (const p of m.personen) {
    const e = auswahl.bereich === 'alle' ? p.eintraege : p.eintraege.filter((x) => x.bereich === auswahl.bereich);
    if (!e.length || (q && !glatt(p.name).includes(q))) continue;
    aus.push({ p, e, z: zaehle(e) });
  }
  aus.sort((a, b) => b.z.summe - a.z.summe || b.z.gold - a.z.gold || b.z.silber - a.z.silber || b.z.bronze - a.z.bronze || a.p.name.localeCompare(b.p.name, 'de'));
  /* Gleiche Zahlen teilen sich den Rang. */
  const gleich = (a, b) => a.z.summe === b.z.summe && a.z.gold === b.z.gold && a.z.silber === b.z.silber && a.z.bronze === b.z.bronze;
  aus.forEach((r, i) => { r.rang = i && gleich(aus[i - 1], r) ? aus[i - 1].rang : i + 1; });
  return aus;
}

/* ---------- Sätze ---------- */

const pl = (n, ein, mehr) => `${fmt(n)} ${n === 1 ? ein : mehr}`;

export function leadText() {
  return 'Alle Podestplätze der Spieler, die heute eine Lizenz beim TFC Luzern haben. Such deinen Namen und sieh nach, was du geholt hast.';
}

export function satzText(m, auswahl, anzahl) {
  const q = (auswahl.q || '').trim();
  const b = m.bereiche.find((x) => x.k === auswahl.bereich);
  if (q) return anzahl ? `${pl(anzahl, 'Person', 'Personen')} gefunden.` : 'Keine Person gefunden. Die Suche kennt Vor- und Nachnamen, auch einzelne Buchstaben.';
  if (auswahl.bereich === 'alle') {
    return `${pl(m.gesamt.personen, 'Person steht', 'Personen stehen')} in der Rangliste, geordnet nach Podestplätzen, bei Gleichstand nach Gold. Die Clubliga zählt je Team und steht darum darunter.`;
  }
  const s = b.summe;
  switch (auswahl.bereich) {
    case 'sm': return `An der Schweizermeisterschaft holten ${pl(s.personen, 'Person', 'Personen')} zusammen ${pl(s.podestplaetze, 'Medaille', 'Medaillen')}. Ein Doppel zählt für jeden Partner mit Lizenz.`;
    case 'nati': return `Im Kader der Schweizer Nati holten ${pl(s.personen, 'Person', 'Personen')} zusammen ${pl(s.podestplaetze, 'Medaille', 'Medaillen')}. Coral nennt nicht, wer gespielt hat; gezählt ist jede Person im gemeldeten Kader.`;
    case 'ranglisten': return `Auf den Jahresranglisten des Verbands standen ${pl(s.personen, 'Person', 'Personen')} zusammen ${fmt(s.podestplaetze)}-mal auf dem Podest. Gezählt sind nur Schlussstände.`;
    case 'fordere': return `Am Finaltag der Fordere-Liga Luzern standen ${pl(s.personen, 'Person', 'Personen')} zusammen ${fmt(s.podestplaetze)}-mal auf dem Podest.`;
    case 'liga': return `In der Clubliga holten die Teams des TFC Luzern ${pl(s.podestplaetze, 'Podestplatz', 'Podestplätze')}. Der Verband nennt keine Spieler, darum stehen hier die Teams.`;
    default: return '';
  }
}

/* ---------- Markup ---------- */

const quelleText = (u) => {
  const h = new URL(u).hostname;
  return h === 'tournaments.swisstablesoccer.ch' || h === 'api.swisstablesoccer.ch' ? 'Quelle beim Verband'
    : h === 'app.tablesoccer.org' ? 'Quelle auf Coral' : h === 'api.tablesoccer.org' ? 'Quelle auf tablesoccer.org'
    : h === 'fordere.ch' ? 'Quelle auf fordere.ch' : 'Quelle';
};
const link = (u, wofuer) => `<a href="${esc(u)}" rel="noopener" aria-label="${esc(`${quelleText(u)}: ${wofuer}`)}">${esc(quelleText(u))}</a>`;

function eintragText(e) {
  switch (e.bereich) {
    case 'sm': return `Schweizermeisterschaft, ${e.kategorie}${e.event ? ` (${e.event})` : ''}${e.partner.length ? `, mit ${e.partner.join(' und ')}` : ''}`;
    case 'nati': return `Nati ${e.team}, ${e.turnier}`;
    case 'ranglisten': return `Jahresrangliste, ${e.kategorie}`;
    case 'fordere': return `Fordere-Liga Luzern, ${e.liga} ${e.tischart}`;
    default: return '';
  }
}
const jahrAnzeige = (e) => e.bereich === 'fordere' ? e.saison : String(e.jahr);

function eintragHtml(e) {
  const t = eintragText(e);
  return `<li><span class="rang__jahr t-data">${esc(jahrAnzeige(e))}</span><span class="rang__was">${esc(t)}</span><b class="rang__metall">${METALL[e.rang]}</b>${link(e.quelle, `${t} ${jahrAnzeige(e)}`)}</li>`;
}

const chips = (z) => [['Gold', z.gold], ['Silber', z.silber], ['Bronze', z.bronze]].filter(([, n]) => n).map(([w, n]) => `<span class="marke">${w} ${fmt(n)}</span>`).join('');

export function zeileHtml(r) {
  const n = r.z.summe;
  return `<li class="rang"><span class="rang__nr" aria-label="Rang ${r.rang}">${r.rang}</span><div class="rang__text"><h3>${esc(r.p.name)}</h3><p class="rang__titel">${esc(hoechsterTitel(r.e))}</p><div class="rang__chips">${chips(r.z)}</div>`
    + `<details class="aufklapp"><summary>${pl(n, 'Podestplatz', 'Podestplätze')} ansehen${PFEIL}</summary><ul class="rang__eintraege">${r.e.map(eintragHtml).join('')}</ul></details></div>`
    + `<div class="rang__zahl"><b>${fmt(n)}</b><small>${n === 1 ? 'Podestplatz' : 'Podestplätze'}</small></div></li>`;
}

export const listeHtml = (rs) => rs.map(zeileHtml).join('');

export function teamsHtml(m) {
  return m.teams.map((t) => `<li><span class="rang__jahr t-data">${esc(t.saison)}</span><span class="rang__was">${esc(t.liga)}, ${esc(t.team)}</span><b class="rang__metall">${METALL[t.rang]}</b>${link(t.quelle, `${t.liga} ${t.saison}, ${t.team}`)}</li>`).join('');
}

export function filterHtml(m, aktiv = 'alle') {
  const knopf = (k, text, n) => `<button class="btn btn--zwei btn--klein umschaltknopf" type="button" data-bereich="${k}" aria-pressed="${k === aktiv}">${esc(text)} <span class="t-data">${fmt(n)}</span></button>`;
  return knopf('alle', 'Alle Bereiche', m.gesamt.podestplaetze) + m.bereiche.map((b) => knopf(b.k, b.titel, b.summe.podestplaetze)).join('');
}

export function leitHtml(m) {
  const g = m.gesamt;
  const stand = datumLang(m.stand);
  return `<div class="leitzahl__aufbau"><div class="leitzahl__haupt">`
    + `<h2 class="leitzahl__titel"><span class="leitzahl__zahl">${fmt(g.podestplaetze)}</span>Podestplätze holten die Spieler des TFC Luzern</h2>`
    + `<p class="leitzahl__lead">Gezählt sind die Schweizermeisterschaft, die Nati, die Jahresranglisten und die Fordere-Liga Luzern je Person, dazu die Clubliga je Team. ${pl(g.personen, 'Person steht', 'Personen stehen')} auf dem Podest, von ${fmt(m.lizenzen)} Spielern mit Lizenz.</p>`
    + `<p class="leitzahl__quelle">Quelle: Schweizer Verband, Coral, tablesoccer.org und fordere.ch, abgerufen am ${stand}.</p></div>`
    + `<dl class="leitzahl__neben">`
    + `<div><dt>Gold</dt><dd>${fmt(g.gold)}</dd><small>Rang 1, Stand ${stand}</small></div>`
    + `<div><dt>Silber</dt><dd>${fmt(g.silber)}</dd><small>Rang 2, Stand ${stand}</small></div>`
    + `<div><dt>Bronze</dt><dd>${fmt(g.bronze)}</dd><small>Rang 3, Stand ${stand}</small></div>`
    + `</dl></div>`;
}
