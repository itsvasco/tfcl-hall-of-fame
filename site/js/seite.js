/* Hall of Fame TFC Luzern: lädt den Schnappschuss und macht Suche und Filter. Das HTML trägt den Anfangszustand
   schon fest (tools/fest.mjs, derselbe Code wie hier, js/rendern.js); beim Laden wird aus dem frischen Schnappschuss
   nachgezeichnet, damit ein neuerer Stand auch ohne neuen Bau erscheint. */
import { modell, zeilen, listeHtml, teamsHtml, satzText, filterHtml, leitHtml, datumLang, championsLead, championsZahl, championsHtml } from './rendern.js';

const DATEI = 'daten/hall-of-fame.json';
const el = (id) => document.getElementById(id);
const auswahl = { bereich: 'alle', q: '' };
let m = null;

function zeichneListe() {
  const rs = zeilen(m, auswahl);
  el('liste').innerHTML = listeHtml(rs);
  el('liste').hidden = auswahl.bereich === 'liga';
  el('satz').textContent = satzText(m, auswahl, rs.length);
  el('teams-block').hidden = !((auswahl.bereich === 'alle' || auswahl.bereich === 'liga') && !auswahl.q.trim());
}

function zeichneAlles() {
  el('leit').innerHTML = leitHtml(m);
  el('filter').innerHTML = filterHtml(m, auswahl.bereich);
  el('teams').innerHTML = teamsHtml(m);
  el('champions-lead').textContent = championsLead(m);
  el('champions-zahl').innerHTML = championsZahl(m);
  el('champions-liste').innerHTML = championsHtml(m);
  el('stand').textContent = datumLang(m.stand);
  zeichneListe();
}

el('suche').addEventListener('submit', (e) => e.preventDefault());
el('suche-feld').addEventListener('input', (e) => { auswahl.q = e.target.value; if (m) zeichneListe(); });
el('filter').addEventListener('click', (e) => {
  const knopf = e.target.closest('button[data-bereich]');
  if (!knopf) return;
  auswahl.bereich = knopf.dataset.bereich;
  for (const k of el('filter').querySelectorAll('button[data-bereich]')) k.setAttribute('aria-pressed', String(k === knopf));
  if (m) zeichneListe();
});

fetch(DATEI)
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((j) => { m = modell(j); zeichneAlles(); })
  .catch(() => { el('satz').textContent = 'Suche und Filter laden gerade nicht. Die Rangliste unten zeigt den Stand beim Bau der Seite.'; });
