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
  const personen = new Map(j.verzeichnis.map((p) => [p.id, { id: p.id, name: p.name, eintraege: [], soll: p.summe, fest: p.fest || 0, spruch: p.spruch || '', ehren: !!p.ehrenmitglied, foto: p.foto || null, fotoAlt: p.foto_alt || '' }]));
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
  for (const p of (j.liga.personen || [])) for (const x of p.platzierungen) hinzu(p.id, { bereich: 'liga', jahr: Number(x.saison), rang: x.rang, liga: x.liga, team: x.team, quelle: x.quelle });
  for (const p of (j.turniere ? j.turniere.personen : [])) for (const x of p.platzierungen) hinzu(p.id, { bereich: 'turniere', jahr: x.jahr, rang: x.rang, kategorie: x.disziplin, serie: x.serie, turnier: x.turnier, ort: x.ort || '', wm: x.titel === 'Weltmeister', quelle: x.quelle });
  for (const p of personen.values()) {
    if (p.eintraege.length !== p.soll) throw new Error(`${p.name}: ${p.eintraege.length} Einträge, Verzeichnis nennt ${p.soll}`);
    p.eintraege.sort((a, b) => b.jahr - a.jahr || a.rang - b.rang || a.bereich.localeCompare(b.bereich));
  }
  const teams = j.liga.eintraege.map((e) => ({ saison: e.saison, liga: e.liga, team: e.team, rang: e.rang, quelle: e.quelle, spieler: e.spieler || [], jePerson: e.zaehlt_je === 'Person' }))
    .sort((a, b) => b.saison - a.saison || a.rang - b.rang);
  const bereiche = j.bereiche.map((b) => ({ k: b.schluessel, titel: b.titel, summe: b.summe }));
  const cl = j.champions || { teilnahmen: [], summe: { teilnahmen: 0, podest: 0 } };
  const champions = { summe: cl.summe, teilnahmen: cl.teilnahmen.map((t) => ({ jahr: t.jahr, wettbewerb: t.wettbewerb, klasse: t.klasse, ort: t.ort, rang: t.rang, teams: t.teams, podest: !!t.podest, spieler: t.spieler || [], quelle: t.quelle })) };
  return { stand: j.erstellt, lizenzen: j.spieler_mit_lizenz, gesamt: j.gesamt, bereiche, personen: [...personen.values()], teams, champions };
}

export const zaehle = (liste) => {
  const z = { gold: 0, silber: 0, bronze: 0, summe: liste.length };
  for (const e of liste) z[METALL[e.rang].toLowerCase()]++;
  return z;
};

/* ---------- Höchster Titel unter dem Namen (Regel 13 der Hall of Fame des TFCZ) ---------- */

const BEREICH_REIHE = { sm: 0, ranglisten: 1, turniere: 2, liga: 3, fordere: 4, nati: 5 };
const klasse = (k = '') => /^(open|herren|offen)/i.test(k) ? 0 : /damen/i.test(k) ? 2 : /senioren/i.test(k) ? 3 : /mixed/i.test(k) ? 4 : /junior/i.test(k) ? 8 : 9;
/* Reihenfolge: Nati-Gold, Weltmeister (World Cup), Schweizer Meister, Nati-Silber, Nati-Bronze, alles andere. */
const stufe = (e) => e.bereich === 'nati' && e.rang === 1 ? 0 : e.wm ? 1 : e.bereich === 'sm' && e.rang === 1 ? 2 : e.bereich === 'nati' && e.rang === 2 ? 3 : e.bereich === 'nati' && e.rang === 3 ? 4 : 5;
const kennung = (e) => `${e.bereich}|${e.kategorie || e.liga || e.team || ''}|${e.rang}${e.wm ? '|wm' : ''}`;
const vergleich = (a, b) => stufe(a) - stufe(b) || a.rang - b.rang || BEREICH_REIHE[a.bereich] - BEREICH_REIHE[b.bereich] || klasse(a.kategorie) - klasse(b.kategorie);

function titelWort(e) {
  const k = e.kategorie || '';
  switch (e.bereich) {
    case 'nati': return `Nati-${METALL[e.rang]} ${e.team}`;
    case 'sm': return e.rang === 1 ? `Schweizer Meister ${k}` : `${e.rang}. Rang Schweizermeisterschaft ${k}`;
    case 'ranglisten': return e.rang === 1 ? `Jahresbester ${k}` : `${e.rang}. Rang Jahresrangliste ${k}`;
    case 'fordere': return e.rang === 1 ? 'Fordere-Sieg' : `${e.rang}. Rang Fordere-Liga`;
    case 'liga': return e.rang === 1 ? `Clubliga-Meister ${e.liga}` : `${e.rang}. Rang Clubliga ${e.liga}`;
    case 'turniere': return e.wm ? `Weltmeister ${k} ${e.jahr}` : e.rang === 1 ? `Turniersieg ${k}` : `${e.rang}. Rang an Turnieren ${k}`;
    default: return `${e.rang}. Rang`;
  }
}

export function hoechsterTitel(liste) {
  if (!liste.length) return '';
  const gruppen = new Map();
  for (const e of liste) { const k = kennung(e); gruppen.set(k, { e, n: (gruppen.get(k)?.n || 0) + 1 }); }
  const beste = [...gruppen.values()].sort((a, b) => vergleich(a.e, b.e) || b.n - a.n || titelWort(a.e).localeCompare(titelWort(b.e), 'de'))[0];
  return `${titelWort(beste.e)}${beste.n > 1 ? `, ${beste.n}×` : ''}`;
}

/* ---------- Auswahl ---------- */

const glatt = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function zeilen(m, auswahl = { bereich: 'alle', q: '' }) {
  const q = glatt((auswahl.q || '').trim());
  const aus = [];
  for (const p of m.personen) {
    const e = auswahl.bereich === 'alle' ? p.eintraege : p.eintraege.filter((x) => x.bereich === auswahl.bereich);
    if ((!e.length && !(auswahl.bereich === 'alle' && p.fest)) || (q && !glatt(p.name).includes(q))) continue;
    aus.push({ p, e, z: zaehle(e) });
  }
  /* Feste Plätze (daten/pflege.json, feste_plaetze) stehen in der Rangliste aller Bereiche zuerst, in ihrer Reihenfolge. */
  const feste = auswahl.bereich === 'alle' ? aus.filter((r) => r.p.fest).sort((a, b) => a.p.fest - b.p.fest) : [];
  const rest = aus.filter((r) => !feste.includes(r));
  rest.sort((a, b) => b.z.summe - a.z.summe || b.z.gold - a.z.gold || b.z.silber - a.z.silber || b.z.bronze - a.z.bronze || a.p.name.localeCompare(b.p.name, 'de'));
  /* Gleiche Zahlen teilen sich den Rang. */
  const gleich = (a, b) => a.z.summe === b.z.summe && a.z.gold === b.z.gold && a.z.silber === b.z.silber && a.z.bronze === b.z.bronze;
  feste.forEach((r, i) => { r.rang = i + 1; });
  rest.forEach((r, i) => { r.rang = i && gleich(rest[i - 1], r) ? rest[i - 1].rang : feste.length + i + 1; });
  return [...feste, ...rest];
}

/* ---------- Sätze ---------- */

const pl = (n, ein, mehr) => `${fmt(n)} ${n === 1 ? ein : mehr}`;

export function leadText() {
  return 'Alle Podestplätze der Spieler, die heute eine Lizenz beim TFC Luzern haben. Such deinen Namen und sieh nach, was du geholt hast.';
}

export function satzText(m, auswahl, anzahl) {
  const q = (auswahl.q || '').trim();
  const b = m.bereiche.find((x) => x.k === auswahl.bereich);
  if (q) {
    if (anzahl) return `${pl(anzahl, 'Person', 'Personen')} gefunden.`;
    /* Mit Filter: nennen, dass der Bereich leer ist und wie viele Personen die Suche über alle Bereiche findet. */
    if (b) {
      const ueberall = zeilen(m, { bereich: 'alle', q }).length;
      const hier = `Im Bereich ${b.titel} steht keine Person mit diesem Namen.`;
      return ueberall ? `${hier} Über alle Bereiche findet die Suche ${pl(ueberall, 'Person', 'Personen')}. Wähle «Alle Bereiche».` : `${hier} Die Suche kennt Vor- und Nachnamen, auch einzelne Buchstaben.`;
    }
    return 'Keine Person gefunden. Die Suche kennt Vor- und Nachnamen, auch einzelne Buchstaben.';
  }
  if (auswahl.bereich === 'alle') {
    return `${pl(anzahl, 'Person steht', 'Personen stehen')} in der Rangliste, geordnet nach Podestplätzen, bei Gleichstand nach Gold. Oben stehen die festen Plätze. Das Ehrenmitglied zählt in keine Summe. Die Clubliga zählt je Person, wenn der Kader belegt ist, sonst je Team. Alle Teams stehen darunter.`;
  }
  const s = b.summe;
  switch (auswahl.bereich) {
    case 'sm': return `An der Schweizermeisterschaft holten ${pl(s.personen, 'Person', 'Personen')} zusammen ${pl(s.podestplaetze, 'Medaille', 'Medaillen')}. Ein Doppel zählt für jeden Partner mit Lizenz.`;
    case 'nati': return `Im Kader der Schweizer Nati holten ${pl(s.personen, 'Person', 'Personen')} zusammen ${pl(s.podestplaetze, 'Medaille', 'Medaillen')}. Coral nennt nicht, wer gespielt hat; gezählt ist jede Person im gemeldeten Kader.`;
    case 'ranglisten': return `Auf den Jahresranglisten des Verbands standen ${pl(s.personen, 'Person', 'Personen')} zusammen ${fmt(s.podestplaetze)}-mal auf dem Podest. Gezählt sind nur Schlussstände.`;
    case 'fordere': return `Am Finaltag der Fordere-Liga Luzern standen ${pl(s.personen, 'Person', 'Personen')} zusammen ${fmt(s.podestplaetze)}-mal auf dem Podest.`;
    case 'turniere': return `An Turnieren von P4P, vom Verband, der ITSF, der World Series und am World Cup standen ${pl(s.personen, 'Person', 'Personen')} zusammen ${fmt(s.podestplaetze)}-mal auf dem Podest. Ein Doppel zählt für jeden Partner mit Lizenz.`;
    case 'liga': return `In der Clubliga standen ${pl(s.personen || 0, 'Person', 'Personen')} aus belegten Kadern zusammen ${fmt(s.podestplaetze - (s.teams || 0))}-mal auf dem Podest.${s.teams ? ` Für ${pl(s.teams, 'Podestplatz', 'Podestplätze')} nennt keine Quelle den Kader, ${s.teams === 1 ? 'er zählt' : 'sie zählen'} je Team.` : ''}`;
    default: return '';
  }
}

/* ---------- Markup ---------- */

const quelleText = (u) => {
  const h = new URL(u).hostname;
  /* Schnittstellen zeigen nur Rohdaten (JSON). Der Link sagt das, damit niemand eine Seite erwartet. */
  return h === 'tournaments.swisstablesoccer.ch' || h === 'api.swisstablesoccer.ch' ? 'Quelle beim Verband'
    : h === 'app.tablesoccer.org' ? 'Quelle auf Coral' : h === 'api.tablesoccer.org' ? 'Rohdaten tablesoccer.org (JSON)'
    : h === 'fordere.ch' ? 'Rohdaten fordere.ch (JSON)' : h === 'extranet.fast4foos.org' ? 'Quelle in FAST (ITSF)' : 'Quelle';
};
const link = (u, wofuer) => `<a href="${esc(u)}" rel="noopener" aria-label="${esc(`${quelleText(u)}: ${wofuer}`)}">${esc(quelleText(u))}</a>`;

function eintragText(e) {
  switch (e.bereich) {
    case 'sm': return `Schweizermeisterschaft, ${e.kategorie}${e.event ? ` (${e.event})` : ''}${e.partner.length ? `, mit ${e.partner.join(' und ')}` : ''}`;
    case 'nati': return `Nati ${e.team}, ${e.turnier}`;
    case 'ranglisten': return `Jahresrangliste, ${e.kategorie}`;
    case 'fordere': return `Fordere-Liga Luzern, ${e.liga} ${e.tischart}`;
    case 'liga': return `Clubliga, ${e.liga}, ${e.team}`;
    case 'turniere': return `${e.serie === 'P4P' ? 'P4P' : e.serie === 'STF' ? 'Verbandsturnier' : e.serie === 'WS' ? 'World Series' : e.serie === 'ITSF' ? 'ITSF' : e.serie === 'ITSF-Tour' ? 'ITSF-Turnier' : e.serie}, ${e.turnier}, ${e.kategorie}${e.wm ? `, Weltmeister${e.ort ? ` in ${e.ort}` : ''}` : ''}`;
    default: return '';
  }
}
const jahrAnzeige = (e) => e.bereich === 'fordere' ? e.saison : String(e.jahr);

function eintragHtml(e) {
  const t = eintragText(e);
  return `<li><span class="rang__jahr t-data">${esc(jahrAnzeige(e))}</span><span class="rang__was">${esc(t)}</span><b class="rang__metall">${METALL[e.rang]}</b>${link(e.quelle, `${t} ${jahrAnzeige(e)}`)}</li>`;
}

const chips = (z) => [['Gold', z.gold], ['Silber', z.silber], ['Bronze', z.bronze]].filter(([, n]) => n).map(([w, n]) => `<span class="marke metall metall--${w.toLowerCase()}">${w} ${fmt(n)}</span>`).join('');

export function zeileHtml(r) {
  const n = r.z.summe;
  const foto = r.p.foto ? `<img class="rang__foto" src="${esc(r.p.foto)}" alt="${esc(r.p.fotoAlt)}" width="160" height="160" loading="lazy" decoding="async">` : '';
  const ehren = r.p.ehren ? '<span class="marke">Ehrenmitglied, zählt in keine Summe</span>' : '';
  const titel = r.p.spruch || hoechsterTitel(r.e);
  const aufklapp = n ? `<details class="aufklapp"><summary>${pl(n, 'Podestplatz', 'Podestplätze')} ansehen${PFEIL}</summary><ul class="rang__eintraege">${r.e.map(eintragHtml).join('')}</ul></details>` : '';
  const zahl = `<b>${fmt(n)}</b><small>${n === 1 ? 'Podestplatz' : 'Podestplätze'}</small>`;
  return `<li class="rang"><span class="rang__nr" aria-label="Rang ${r.rang}">${r.rang}</span><div class="rang__text"><div class="rang__kopf">${foto}<h3>${esc(r.p.name)}</h3>${ehren}</div><p class="rang__titel">${esc(titel)}</p><div class="rang__chips">${chips(r.z)}</div>`
    + `${aufklapp}</div>`
    + `<div class="rang__zahl">${zahl}</div></li>`;
}

export const listeHtml = (rs) => rs.map(zeileHtml).join('');

export function teamsHtml(m) {
  const kader = (t) => t.spieler && t.spieler.length ? `. Im Kader ${t.spieler.length === 1 ? 'stand' : 'standen'} ${t.spieler.join(', ')}` : '. Kader nicht belegt, zählt je Team';
  return m.teams.map((t) => `<li><span class="rang__jahr t-data">${esc(t.saison)}</span><span class="rang__was">${esc(t.liga)}, ${esc(t.team)}${esc(kader(t))}</span><b class="rang__metall">${METALL[t.rang]}</b>${link(t.quelle, `${t.liga} ${t.saison}, ${t.team}`)}</li>`).join('');
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
    + `<p class="leitzahl__lead">Gezählt sind die Schweizermeisterschaft, die Nati, die Jahresranglisten, die Clubliga, die Fordere-Liga Luzern und die Turniere je Person. Clubliga-Plätze ohne belegten Kader zählen je Team. ${pl(g.personen, 'Person steht', 'Personen stehen')} auf dem Podest, von ${fmt(m.lizenzen)} Spielern mit Lizenz.</p>`
    + (m.champions.summe.teilnahmen ? `<p class="leitzahl__lead">Dazu kommen ${pl(m.champions.summe.teilnahmen, 'Teilnahme', 'Teilnahmen')} an der Champions League. Sie stehen weiter unten und zählen in keine Summe.</p>` : '')
    + `<p class="leitzahl__quelle">Quelle: Schweizer Verband, Coral, tablesoccer.org, FAST (ITSF), players4players.de und fordere.ch, abgerufen am ${stand}.</p></div>`
    + `<dl class="podest">`
    + `<div class="podest__stufe podest__stufe--gold"><dt>Gold</dt><dd>${fmt(g.gold)}</dd><small>Rang 1</small></div>`
    + `<div class="podest__stufe podest__stufe--silber"><dt>Silber</dt><dd>${fmt(g.silber)}</dd><small>Rang 2</small></div>`
    + `<div class="podest__stufe podest__stufe--bronze"><dt>Bronze</dt><dd>${fmt(g.bronze)}</dd><small>Rang 3</small></div>`
    + `</dl></div>`;
}

/* ---------- Champions League ---------- */

export function championsLead(m) {
  const t = m.champions.teilnahmen;
  const orte = [...new Set(t.map((x) => String(x.ort).split(',')[0]).filter(Boolean))];
  const reise = orte.length > 1 ? `${orte.slice(0, -1).join(', ')} und ${orte.at(-1)}` : orte[0] || '';
  const podest = m.champions.summe.podest;
  return `Der TFC Luzern tritt an, wenn Clubs aus ganz Europa um die Krone spielen. ${pl(t.length, 'Teilnahme ist', 'Teilnahmen sind')} belegt. ${podest ? `${pl(podest, 'Podestplatz ist', 'Podestplätze sind')} dabei.` : 'Ein Pokal fehlt noch im Regal.'} Die Reisen nach ${reise} nimmt uns trotzdem keiner mehr. Darum zählt hier das Dabeisein, und es steht in keiner Summe der Podestplätze.`;
}

export const championsZahl = (m) => `<b>${fmt(m.champions.summe.teilnahmen)}</b><small>${m.champions.summe.teilnahmen === 1 ? 'Teilnahme' : 'Teilnahmen'}</small>`;

export function championsHtml(m) {
  return m.champions.teilnahmen.map((t) => {
    const was = `${t.wettbewerb}, ${t.klasse}${t.ort ? `, ${t.ort}` : ''}. Rang ${t.rang} von ${t.teams} Teams${t.podest ? ', Podest' : ''}.${t.spieler.length ? ` Im Kader ${t.spieler.length === 1 ? 'stand' : 'standen'} ${t.spieler.join(', ')}.` : ''}`;
    return `<li><span class="rang__jahr t-data">${esc(t.jahr)}</span><span class="rang__was">${esc(was)}</span>${link(t.quelle, `${t.wettbewerb} ${t.jahr}`)}</li>`;
  }).join('');
}
