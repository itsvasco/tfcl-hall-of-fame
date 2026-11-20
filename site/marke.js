/* marke.js · System 1.26.0 · erzeugt von PixelLens, nicht von Hand ändern */

/* system/anbindungen.js */
{ try {
(() => {
  const fertig = new WeakSet();
  function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.anbindungen') ? [wurzel] : []), ...wurzel.querySelectorAll('.anbindungen')];
  for (const verz of treffer) {
    if (fertig.has(verz)) continue;
    fertig.add(verz);
    const feld = verz.querySelector('input[type="search"]');
    if (!feld) continue;
    const zeilen = [...verz.querySelectorAll('[data-name]')];
    const zahl = verz.querySelector('[data-treffer]');
    const leer = verz.querySelector('[data-leer]');
    const filtern = () => {
      const q = feld.value.trim().toLowerCase();
      let n = 0;
      for (const z of zeilen) {
        const ok = !q || z.dataset.name.toLowerCase().includes(q) || z.textContent.toLowerCase().includes(q);
        z.hidden = !ok;
        if (ok) n++;
      }
      if (zahl) zahl.textContent = `${n} von ${zeilen.length} weiteren Anbindungen`;
      if (leer) leer.hidden = n > 0;
    };
    feld.addEventListener('input', filtern);
    verz.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/anbindungen.js", fehler); } }

/* system/feld-leeren.js */
{ try {
(() => {
const OHNE = new Set(['password', 'date', 'time', 'datetime-local', 'month', 'week',
  'number', 'range', 'color', 'checkbox', 'radio', 'file', 'submit', 'button', 'hidden']);
const KREUZ = '<svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" '
  + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function ruesteAus(wickel) {
  const gruppe = wickel.matches('.eingabegruppe');
  if (gruppe ? wickel.querySelector('.feld__leeren') : wickel.querySelector('button')) return;
  if (wickel.closest('.datumsfeld')) return;
  const eingabe = wickel.querySelector('input, textarea');
  if (!eingabe || eingabe.dataset.ohneLeeren !== undefined) return;
  if (eingabe.tagName === 'INPUT' && OHNE.has(eingabe.type)) return;
  if (!eingabe.hasAttribute('placeholder')) return;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'feld__leeren';
  const wie = wickel.querySelector('label')?.textContent.trim()
    || eingabe.getAttribute('aria-label');
  knopf.setAttribute('aria-label', wie ? `${wie} leeren` : 'Feld leeren');
  knopf.tabIndex = -1;
  knopf.innerHTML = KREUZ;
  if (gruppe) { eingabe.after(knopf); return; }
  wickel.append(knopf);
  if (eingabe.tagName === 'TEXTAREA') {
    knopf.classList.add('feld__leeren--oben');
    const setze = () => { knopf.style.top = `${eingabe.offsetTop + eingabe.clientTop}px`; };
    setze();
    new ResizeObserver(setze).observe(wickel);
  }
  wickel.closest('.feld')?.classList.add('feld--leerbar');
}

const WICKEL = '.feld__eingabe, [data-leerbar], .eingabegruppe';
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.(WICKEL) ? [wurzel] : []), ...wurzel.querySelectorAll(WICKEL)];
  for (const w of treffer) {
    if (fertig.has(w)) continue;
    fertig.add(w);
    ruesteAus(w);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
document.addEventListener('focusin', (e) => {
  const w = e.target.closest?.(WICKEL);
  if (w) ruesteAus(w);
});

document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.feld__leeren')) e.preventDefault();
});

document.addEventListener('click', (e) => {
  const knopf = e.target.closest('.feld__leeren');
  if (!knopf) return;

  const eingabe = knopf.closest(WICKEL)?.querySelector('input, textarea');
  if (!eingabe || eingabe.disabled || eingabe.readOnly) return;

  eingabe.value = '';
  eingabe.dispatchEvent(new Event('input', { bubbles: true }));
  eingabe.dispatchEvent(new Event('change', { bubbles: true }));
  eingabe.focus();
});
})();

} catch (fehler) { console.warn("marke.js · system/feld-leeren.js", fehler); } }

/* system/herunterladen.js */
{ try {
(() => {
'use strict';

const sichtbar = (a) => !a.closest('[hidden]');
const mb = (bytes) => {
  const wert = bytes / 1048576;
  return wert < 0.05 ? '< 0.1' : wert.toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (daten) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < daten.length; i++) c = TABELLE[(c ^ daten[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const dosZeit = (d) => ({
  zeit: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  datum: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

const zipBauen = (dateien) => {
  const teile = [];
  const verzeichnis = [];
  let lage = 0;
  const { zeit, datum } = dosZeit(new Date());
  const kodierer = new TextEncoder();
  for (const { name, daten } of dateien) {
    const n = kodierer.encode(name);
    const crc = crc32(daten);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034B50, true);
    kopf.setUint16(4, 20, true);
    kopf.setUint16(6, 0x0800, true);
    kopf.setUint16(8, 0, true);
    kopf.setUint16(10, zeit, true);
    kopf.setUint16(12, datum, true);
    kopf.setUint32(14, crc, true);
    kopf.setUint32(18, daten.length, true);
    kopf.setUint32(22, daten.length, true);
    kopf.setUint16(26, n.length, true);
    kopf.setUint16(28, 0, true);
    teile.push(kopf.buffer, n, daten);
    const eintrag = new DataView(new ArrayBuffer(46));
    eintrag.setUint32(0, 0x02014B50, true);
    eintrag.setUint16(4, 20, true);
    eintrag.setUint16(6, 20, true);
    eintrag.setUint16(8, 0x0800, true);
    eintrag.setUint16(12, zeit, true);
    eintrag.setUint16(14, datum, true);
    eintrag.setUint32(16, crc, true);
    eintrag.setUint32(20, daten.length, true);
    eintrag.setUint32(24, daten.length, true);
    eintrag.setUint16(28, n.length, true);
    eintrag.setUint32(42, lage, true);
    verzeichnis.push(eintrag.buffer, n);
    lage += 30 + n.length + daten.length;
  }
  const groesse = verzeichnis.reduce((s, t) => s + t.byteLength, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054B50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true);
  ende.setUint32(16, lage, true);
  return new Blob([...teile, ...verzeichnis, ende.buffer], { type: 'application/zip' });
};

const bilder = (behaelter) => [...behaelter.querySelectorAll('a[data-herunterladen]')].filter(sichtbar);

const aktualisieren = (behaelter) => {
  const knopf = behaelter.querySelector('[data-herunterladen-auswahl]');
  if (!knopf) return;
  const liste = bilder(behaelter);
  const bytes = liste.reduce((s, a) => s + (Number(a.dataset.bytes) || 0), 0);
  const text = knopf.querySelector('.herunterladen__text') ?? knopf;
  const satz = liste.length === 0
    ? 'Keine Fotos in der Auswahl'
    : `${liste.length} ${liste.length === 1 ? 'Foto' : 'Fotos'} herunterladen (${mb(bytes)} MB)`;
  if (text.textContent !== satz) text.textContent = satz;
  knopf.disabled = liste.length === 0;
  knopf.setAttribute('aria-label', satz);
};

const stand = (behaelter, satz) => {
  const ort = behaelter.querySelector('.herunterladen__stand');
  if (ort) ort.textContent = satz;
};

const speichern = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const eindeutig = (name, belegt) => {
  if (!belegt.has(name)) { belegt.add(name); return name; }
  const punkt = name.lastIndexOf('.');
  const kopf = punkt > 0 ? name.slice(0, punkt) : name;
  const fuss = punkt > 0 ? name.slice(punkt) : '';
  for (let i = 2; ; i++) {
    const kandidat = `${kopf}-${i}${fuss}`;
    if (!belegt.has(kandidat)) { belegt.add(kandidat); return kandidat; }
  }
};

const paketSchnueren = async (behaelter) => {
  const knopf = behaelter.querySelector('[data-herunterladen-auswahl]');
  const liste = bilder(behaelter);
  if (!liste.length || knopf.dataset.laeuft) return;
  knopf.dataset.laeuft = 'ja';
  knopf.setAttribute('aria-busy', 'true');
  const belegt = new Set(['bildnachweis.txt']);
  const dateien = [];
  const nachweise = [];
  try {
    for (const [i, a] of liste.entries()) {
      stand(behaelter, `Bild ${i + 1} von ${liste.length} wird geladen.`);
      const antwort = await fetch(a.href);
      if (!antwort.ok) throw new Error(`${antwort.status}`);
      const daten = new Uint8Array(await antwort.arrayBuffer());
      const name = eindeutig(a.getAttribute('download') || decodeURIComponent(new URL(a.href).pathname.split('/').pop()), belegt);
      dateien.push({ name, daten });
      if (a.dataset.nachweis) nachweise.push(`${name}: ${a.dataset.nachweis}`);
    }
    if (nachweise.length) dateien.push({ name: 'bildnachweis.txt', daten: new TextEncoder().encode(nachweise.join('\n') + '\n') });
    speichern(zipBauen(dateien), behaelter.dataset.paketName || 'fotos.zip');
    stand(behaelter, `${liste.length} ${liste.length === 1 ? 'Bild' : 'Bilder'} als ZIP-Datei bereit.`);
  } catch (fehler) {
    stand(behaelter, 'Das Paket konnte nicht erstellt werden. Bitte die Bilder einzeln laden.');
  } finally {
    delete knopf.dataset.laeuft;
    knopf.removeAttribute('aria-busy');
  }
};

const binden = (behaelter) => {
  if (behaelter.dataset.herunterladenBereit) return;
  behaelter.dataset.herunterladenBereit = 'ja';
  const knopf = behaelter.querySelector('[data-herunterladen-auswahl]');
  knopf?.addEventListener('click', () => paketSchnueren(behaelter));
  new MutationObserver(() => aktualisieren(behaelter))
    .observe(behaelter, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  aktualisieren(behaelter);
};

const alle = () => document.querySelectorAll('[data-herunterladen-paket]').forEach(binden);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alle);
else alle();

window.Herunterladen = { aktualisieren, binden };
})();

} catch (fehler) { console.warn("marke.js · system/herunterladen.js", fehler); } }

/* system/formular-anzahlwahl.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.anzahlwahl') ? [ort] : []), ...ort.querySelectorAll('.anzahlwahl')];
  for (const wahl of treffer) {
    if (fertig.has(wahl)) continue;
    fertig.add(wahl);
  const feld = wahl.querySelector('input[type="number"]');
  const stapel = wahl.querySelector('.anzahlwahl__stapel');
  const zahl = wahl.querySelector('.anzahlwahl__zahl');
  if (!feld || !stapel) continue;

  let namen = [];
  try { namen = JSON.parse(wahl.dataset.namen || '[]'); } catch { namen = []; }

  const kuerzel = (i) => {
    const name = namen[i];
    if (!name) return String(i + 1);
    return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const roll = document.createElement('span');
  roll.className = 'rollzahl anzahlwahl__roll';
  roll.setAttribute('aria-hidden', 'true');
  const neueStelle = () => {
    const stelle = document.createElement('span');
    stelle.className = 'rollzahl__stelle';
    const band = document.createElement('span');
    band.className = 'rollzahl__band';
    for (let z = 0; z <= 9; z++) {
      const ziffer = document.createElement('span');
      ziffer.textContent = String(z);
      band.append(ziffer);
    }
    stelle.append(band);
    return stelle;
  };
  const rolle = (wert) => {
    const text = String(wert);
    while (roll.children.length < text.length) roll.prepend(neueStelle());
    while (roll.children.length > text.length) roll.firstElementChild.remove();
    [...text].forEach((z, i) => { roll.children[i].dataset.d = z; });
  };

  const zeichne = () => {
    const min = Number(feld.min || 1);
    const max = Number(feld.max || 6);
    const wert = Math.min(max, Math.max(min, Number(feld.value) || min));

    stapel.replaceChildren();
    for (let i = 0; i < wert; i++) {
      const kopf = document.createElement('span');
      kopf.className = 'anzahlwahl__kopf';
      kopf.textContent = kuerzel(i);
      if (namen[i]) kopf.title = namen[i];
      stapel.append(kopf);
    }
    stapel.setAttribute('aria-hidden', 'true');
    rolle(wert);
    const was = wahl.dataset.was || '';
    if (zahl) zahl.textContent = (wert === 1 ? '1 Person' : `${wert} Personen`) + (was ? ' ' + was : '');
  };

  const bau = (richtung, zeichen, wort) => {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'btn btn--symbol btn--zwei anzahlwahl__schritt';
    knopf.setAttribute('aria-label', wort);
    knopf.innerHTML = `<svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">${zeichen}</svg>`;
    knopf.addEventListener('click', () => {
      richtung > 0 ? feld.stepUp() : feld.stepDown();
      feld.dispatchEvent(new Event('input', { bubbles: true }));
      grenzen();
    });
    return knopf;
  };

  const weniger = bau(-1, '<path d="M5 12h14"/>', 'Einer weniger');
  const mehr    = bau(+1, '<path d="M12 5v14"/><path d="M5 12h14"/>', 'Einer mehr');
  feld.insertAdjacentElement('beforebegin', weniger);
  feld.insertAdjacentElement('afterend', mehr);
  feld.insertAdjacentElement('afterend', roll);
  wahl.dataset.rollt = '';

  const grenzen = () => {
    const min = Number(feld.min || 1);
    const max = Number(feld.max || 6);
    const wert = Number(feld.value) || min;
    weniger.disabled = wert <= min;
    mehr.disabled = wert >= max;
  };

  feld.addEventListener('input', () => { zeichne(); grenzen(); });
  zeichne();
  grenzen();
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/formular-anzahlwahl.js", fehler); } }

/* system/aufziehen.js */
{ try {
(() => {
  const ruhe = matchMedia('(prefers-reduced-motion: reduce)');
  if (ruhe.matches) return;
  const klemme = (v, a, b) => (v < a ? a : v > b ? b : v);
  const glatt = (a, b, x) => { const t = klemme((x - a) / ((b - a) || 1e-6), 0, 1); return t * t * (3 - 2 * t); };
  const zoom = 1.35, glaettung = 0.1;

  function start(wurzel) {
    const bahn = wurzel.querySelector('.aufziehen__bahn');
    const buehne = wurzel.querySelector('.aufziehen__buehne');
    const rahmen = wurzel.querySelector('.aufziehen__rahmen');
    const bild = wurzel.querySelector('.aufziehen__bild');
    const titel = wurzel.querySelector('.aufziehen__titel');
    const lage = wurzel.querySelector('.aufziehen__ueberlage');
    const hinweis = wurzel.querySelector('.aufziehen__hinweis');
    if (!bahn || !buehne || !rahmen || !bild || !titel || !lage || !hinweis) return;

    let weg = 1.2, sB = 42, sH = 58, sR = 8, buehneH = 0, ziel = 0, jetzt = 0, laeuft = false, id = 0;

    function messen() {
      const cs = getComputedStyle(buehne);
      const ws = getComputedStyle(wurzel);
      sB = parseFloat(cs.getPropertyValue('--aufziehen-start-b')) || 42;
      sH = parseFloat(cs.getPropertyValue('--aufziehen-start-h')) || 58;
      weg = parseFloat(ws.getPropertyValue('--aufziehen-weg')) || 1.2;
      sR = parseFloat(ws.borderTopLeftRadius) || 0;
      buehneH = buehne.clientHeight;
    }
    function fortschritt() {
      return klemme(-bahn.getBoundingClientRect().top / ((buehneH * weg) || 1), 0, 1);
    }
    function anwenden(p) {
      const e = glatt(0, 1, p);
      const w = sB + (100 - sB) * e, h = sH + (100 - sH) * e;
      const ix = Math.max(0, (100 - w) / 2), iy = Math.max(0, (100 - h) / 2);
      rahmen.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${sR * (1 - e)}px)`;
      bild.style.transform = `scale(${zoom + (1 - zoom) * e})`;
      const aus = glatt(0.4, 0.88, p);
      titel.style.opacity = 1 - aus;
      titel.style.transform = `translate3d(0,${-28 * aus}px,0)`;
      hinweis.style.opacity = 1 - glatt(0, 0.12, p);
      const ein = glatt(0.68, 1, p);
      lage.style.opacity = ein;
      lage.style.transform = `translate3d(0,${18 * (1 - ein)}px,0)`;
      lage.style.pointerEvents = ein > 0.5 ? 'auto' : 'none';
    }
    function takt() {
      const k = 1 - Math.exp(-1 / (60 * glaettung));
      jetzt += (ziel - jetzt) * k;
      if (Math.abs(ziel - jetzt) < 0.0004) { jetzt = ziel; laeuft = false; }
      anwenden(jetzt);
      id = laeuft ? requestAnimationFrame(takt) : 0;
    }
    function rollen() {
      ziel = fortschritt();
      if (!laeuft) { laeuft = true; if (!id) id = requestAnimationFrame(takt); }
    }
    function neuMessen() { messen(); ziel = jetzt = fortschritt(); anwenden(jetzt); }

    wurzel.classList.add('ist-bereit');
    messen(); ziel = jetzt = fortschritt(); anwenden(jetzt);
    addEventListener('scroll', rollen, { passive: true });
    addEventListener('resize', neuMessen);
    new ResizeObserver(neuMessen).observe(wurzel);
  }

  const fertig = new WeakSet();
  function einrichten(wurzel) {
    const treffer = [...(wurzel.matches?.('.aufziehen') ? [wurzel] : []), ...wurzel.querySelectorAll('.aufziehen')];
    for (const el of treffer) {
      if (fertig.has(el)) continue;
      fertig.add(el);
      start(el);
    }
  }
  const los = () => einrichten(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
  ruhe.addEventListener('change', () => { if (ruhe.matches) location.reload(); });
})();

} catch (fehler) { console.warn("marke.js · system/aufziehen.js", fehler); } }

/* system/chart-diagramme.js */
{ try {
(function () {
  if (window.__diagramme) return;
  window.__diagramme = true;

  var NS = 'http://www.w3.org/2000/svg';
  var lauf = 0;
  var OB = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 640, H = 300;

  function el(tag, attrs, eltern) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (eltern) eltern.appendChild(e);
    return e;
  }

  function reihe(i) { return (i % 6) + 1; }
  function strich(i) { return (i % 4) + 1; }

  function zahl(v) { return (Math.round(v * 10) / 10).toLocaleString('de-CH'); }

  function rundesMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function sicher(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function dauer(fig, name, stil) {
    var roh = (stil || getComputedStyle(fig)).getPropertyValue('--dia-t-' + name).trim();
    var n = parseFloat(roh);
    if (!isFinite(n)) return 0;
    return /ms/.test(roh) ? n : n * 1000;
  }

  function beschleunigung(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function rechne(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function neigung(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0 || x >= 1) return x;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = neigung(t, x1, x2);
        if (!s) break;
        t -= (rechne(t, x1, x2) - x) / s;
      }
      return rechne(t, y1, y2);
    };
  }

  var REIN = beschleunigung(.85, 0, .15, 1), RAUS = beschleunigung(.22, 1, .36, 1);

  function blenden(ms, fn, kurve) {
    if (OB || !ms) { fn(1); return; }
    var t0 = null;
    kurve = kurve || REIN;
    function schritt(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / ms);
      fn(kurve(p));
      if (p < 1) requestAnimationFrame(schritt);
    }
    fn(0);
    requestAnimationFrame(schritt);
  }

  function versetzt(n, ms, abstand, fn) {
    if (OB || !ms) { for (var i = 0; i < n; i++) fn(i, 1); return; }
    var ganz = ms + abstand * (n - 1), t0 = null;
    function schritt(t) {
      if (t0 === null) t0 = t;
      var e = t - t0;
      for (var i = 0; i < n; i++) fn(i, RAUS(Math.max(0, Math.min(1, (e - i * abstand) / ms))));
      if (e < ganz) requestAnimationFrame(schritt);
    }
    for (var k = 0; k < n; k++) fn(k, 0);
    requestAnimationFrame(schritt);
  }

  function kurve(pkte) {
    if (pkte.length < 2) return '';
    var d = 'M' + pkte[0][0] + ',' + pkte[0][1];
    for (var i = 0; i < pkte.length - 1; i++) {
      var p0 = pkte[i - 1] || pkte[i], p1 = pkte[i], p2 = pkte[i + 1], p3 = pkte[i + 2] || p2, k = .18;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) * k) + ',' + (p1[1] + (p2[1] - p0[1]) * k) +
        ' ' + (p2[0] - (p3[0] - p1[0]) * k) + ',' + (p2[1] - (p3[1] - p1[1]) * k) +
        ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  function bogen(cx, cy, r0, r1, a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4;
    var gross = a1 - a0 > Math.PI ? 1 : 0;
    function pt(r, a) { return (cx + r * Math.sin(a)) + ',' + (cy - r * Math.cos(a)); }
    return 'M' + pt(r1, a0) + ' A' + r1 + ',' + r1 + ' 0 ' + gross + ' 1 ' + pt(r1, a1) +
      ' L' + pt(r0, a1) + ' A' + r0 + ',' + r0 + ' 0 ' + gross + ' 0 ' + pt(r0, a0) + ' Z';
  }

  function form(k, x, y, r) {
    switch (k % 4) {
      case 1: return 'M' + (x - r) + ',' + (y - r) + 'h' + 2 * r + 'v' + 2 * r + 'h' + -2 * r + 'Z';
      case 2: return 'M' + x + ',' + (y - r * 1.25) + 'L' + (x + r * 1.25) + ',' + y +
        'L' + x + ',' + (y + r * 1.25) + 'L' + (x - r * 1.25) + ',' + y + 'Z';
      case 3: return 'M' + x + ',' + (y - r * 1.2) + 'L' + (x + r * 1.15) + ',' + (y + r * .9) +
        'L' + (x - r * 1.15) + ',' + (y + r * .9) + 'Z';
      default: return 'M' + (x - r) + ',' + y + 'a' + r + ',' + r + ' 0 1 0 ' + 2 * r + ',0' +
        'a' + r + ',' + r + ' 0 1 0 ' + -2 * r + ',0Z';
    }
  }

  function musterblatt() {
    if (document.querySelector('.diagramm-muster')) return;
    var s = el('svg', { class: 'diagramm-muster', 'aria-hidden': 'true', focusable: 'false' });
    var defs = el('defs', {}, s);
    var striche = {
      1: '',
      2: 'M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2',
      3: 'M-1,5 l2,2 M0,0 l6,6 M5,-1 l2,2',
      4: '',
      5: 'M0,1.5 h6 M0,4.5 h6'
    };
    for (var i = 1; i <= 6; i++) {
      var p = el('pattern', {
        id: 'dia-muster-' + i, 'data-reihe': i,
        width: 6, height: 6, patternUnits: 'userSpaceOnUse'
      }, defs);
      el('rect', { class: 'dia-grund', width: 6, height: 6 }, p);
      if (i === 4) {
        el('circle', { class: 'dia-tupf', cx: 1.5, cy: 1.5, r: 1 }, p);
        el('circle', { class: 'dia-tupf', cx: 4.5, cy: 4.5, r: 1 }, p);
      } else if (i === 6) {
        el('path', { class: 'dia-strich', d: striche[2] }, p);
        el('path', { class: 'dia-strich', d: striche[3] }, p);
      } else if (striche[i]) {
        el('path', { class: 'dia-strich', d: striche[i] }, p);
      }
    }
    var v = el('pattern', {
      id: 'dia-muster-verlust', width: 6, height: 6, patternUnits: 'userSpaceOnUse'
    }, defs);
    el('rect', { class: 'dia-grund-verlust', width: 6, height: 6 }, v);
    el('path', { class: 'dia-strich dia-verlust', d: striche[3] }, v);
    document.body.appendChild(s);
  }

  function blatt(fig, h, beschriftung) {
    var s = el('svg', {
      viewBox: '0 0 ' + W + ' ' + (h || H),
      class: 'diagramm__bild', role: 'img', 'aria-label': beschriftung || ''
    });
    fig.querySelector('.diagramm__feld').appendChild(s);
    return s;
  }

  function legende(fig, stuecke) {
    var l = fig.querySelector('.diagramm__legende');
    if (!l) return;
    var schaltbar = stuecke.length > 1;
    l.innerHTML = stuecke.map(function (it, i) {
      var wert = it.zustand || String(it.reihe || reihe(i));
      var merkmal = it.zustand ? ' data-zustand="' + it.zustand + '"'
        : ' data-reihe="' + (it.reihe || reihe(i)) + '"';
      var inhalt = '<i' + merkmal + '></i>' + sicher(it.name);
      return schaltbar
        ? '<button type="button" aria-pressed="true" data-schalte="' + wert + '">' + inhalt + '</button>'
        : '<span>' + inhalt + '</span>';
    }).join('');
    if (schaltbar) legendeSchalten(fig, l);
    legendeAusrichten(fig);
  }

  function legendeSchalten(fig, l) {
    l.addEventListener('click', function (e) {
      var k = e.target.closest('button[data-schalte]');
      if (!k) return;
      var aus = (fig.dataset.aus || '').split(' ').filter(Boolean);
      var wert = k.getAttribute('data-schalte');
      var drin = aus.indexOf(wert);
      if (drin >= 0) {
        aus.splice(drin, 1);
      } else {
        var alle = l.querySelectorAll('button[data-schalte]').length;
        if (aus.length >= alle - 1) return;
        aus.push(wert);
      }
      fig.dataset.aus = aus.join(' ');
      l.querySelectorAll('button[data-schalte]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(aus.indexOf(b.getAttribute('data-schalte')) < 0));
      });
    });
  }

  function legendeAusrichten(fig) {
    requestAnimationFrame(function () {
      var feld = fig.querySelector('.diagramm__feld');
      var achse = fig.querySelector('.diagramm__achse');
      var wert = '0px';
      if (feld && achse) {
        var versatz = achse.getBoundingClientRect().left - feld.getBoundingClientRect().left;
        wert = Math.max(0, Math.round(versatz)) + 'px';
      }
      if (fig.style.getPropertyValue('--dia-achse') !== wert) {
        fig.style.setProperty('--dia-achse', wert);
      }
    });
    if (!fig.__legendeBeobachtet && 'ResizeObserver' in window) {
      fig.__legendeBeobachtet = true;
      var erster = true;
      new ResizeObserver(function () {
        if (erster) { erster = false; return; }   // die Erstmeldung hat rAF schon erledigt
        legendeAusrichten(fig);
      }).observe(fig);
      if (document.fonts) document.fonts.addEventListener('loadingdone', function () { legendeAusrichten(fig); });
    }
  }

  function plaettchen(r, zustand) {
    return '<i' + (zustand ? ' data-zustand="' + zustand + '"' : ' data-reihe="' + r + '"') + '></i>';
  }

  function hinweis(fig) { return fig.querySelector('.diagramm__hinweis'); }

  var ABSTAND = 14;

  function zeigen(fig, ereignis, html) {
    var t = hinweis(fig), r = fig.querySelector('.diagramm__feld').getBoundingClientRect();
    t.innerHTML = html;
    t.hidden = false;
    var x = ereignis.clientX - r.left, y = ereignis.clientY - r.top;
    var b = t.offsetWidth, h = t.offsetHeight;

    var links = x + ABSTAND;
    if (links + b > r.width) links = x - ABSTAND - b;   // Seite wechseln
    if (links < 0) links = Math.min(x + ABSTAND, Math.max(0, r.width - b));

    var oben = y - h - ABSTAND;
    if (oben < 0) oben = y + ABSTAND;                   // nach unten kippen
    if (oben + h > r.height) oben = Math.max(0, r.height - h);

    t.style.left = Math.round(links) + 'px';
    t.style.top = Math.round(oben) + 'px';
  }

  function verbergen(fig) { hinweis(fig).hidden = true; }

  function hinweisziele(fig, s) {
    s.addEventListener('mousemove', function (e) {
      var z = e.target.closest('[data-tip]');
      if (z) zeigen(fig, e, z.getAttribute('data-tip')); else verbergen(fig);
    });
    s.addEventListener('mouseleave', function () { verbergen(fig); });
  }

  function hochachse(s, m, max, teile, fmt) {
    var g = el('g', { class: 'diagramm__netz' }, s);
    for (var i = 0; i <= teile; i++) {
      var v = max * i / teile, y = m.t + (H - m.t - m.b) * (1 - i / teile);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y }, g);
      el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', class: 'diagramm__achse' }, g)
        .textContent = (fmt || zahl)(v);
    }
  }

  function querachse(s, m, marken, xVon, jede) {
    marken.forEach(function (l, i) {
      if (i % (jede || 1)) return;
      el('text', { x: xVon(i), y: H - m.b + 18, 'text-anchor': 'middle', class: 'diagramm__achse' }, s)
        .textContent = l;
    });
  }

  function wischen(s) {
    var id = 'dia-schnitt' + (++lauf);
    var cp = el('clipPath', { id: id }, el('defs', {}, s));
    var r = el('rect', { x: 0, y: 0, width: 0, height: H }, cp);
    return {
      id: id,
      ab: function (ms) { blenden(ms, function (p) { r.setAttribute('width', W * p); }); }
    };
  }

  function verlauf(s, r, oben, art) {
    var id = 'dia-verlauf' + (++lauf);
    var attrs = { id: id, x1: 0, y1: 0, x2: 0, y2: 1 };
    if (art) attrs['data-verlauf'] = art; else attrs['data-reihe'] = r;
    var g = el('linearGradient', attrs, el('defs', {}, s));
    el('stop', { offset: '0%', 'stop-opacity': oben == null ? .4 : oben }, g);
    el('stop', { offset: '100%', 'stop-opacity': 0 }, g);
    return 'url(#' + id + ')';
  }

  function hilfslinie(fig, s, m, n, xVon, zeilen) {
    var g = el('g', { class: 'diagramm__hilfslinie' }, s);
    var ln = el('line', { y1: m.t, y2: H - m.b }, g);
    var punkte = zeilen.map(function (z) {
      return el('circle', { r: 4.5, 'data-reihe': z.reihe }, g);
    });
    var feld = el('rect', {
      x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent'
    }, s);
    feld.addEventListener('mousemove', function (e) {
      var r = s.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, best = 0, bd = 1e9;
      for (var i = 0; i < n; i++) {
        var d = Math.abs(xVon(i) - x);
        if (d < bd) { bd = d; best = i; }
      }
      var X = xVon(best);
      ln.setAttribute('x1', X); ln.setAttribute('x2', X);
      g.style.opacity = 1;
      zeilen.forEach(function (z, k) {
        punkte[k].setAttribute('cx', X);
        punkte[k].setAttribute('cy', z.y(best));
      });
      zeigen(fig, e, '<b>' + sicher(zeilen.marke(best)) + '</b>' + zeilen.map(function (z) {
        return '<span>' + plaettchen(z.reihe, z.zustand) + sicher(z.name) +
          ' <em>' + z.text(best) + '</em></span>';
      }).join(''));
    });
    feld.addEventListener('mouseleave', function () {
      g.style.opacity = 0;
      verbergen(fig);
    });
  }

  function werteTabelle(fig, d, art) {
    var kopf = [], zeilen = [];

    function reiheAus(name, werte) { zeilen.push([name].concat(werte)); }

    if (art === 'flaeche' || art === 'linie') {
      kopf = [''].concat(d.x);
      d.series.forEach(function (s) { reiheAus(s.name, s.values.map(zahl)); });
    } else if (art === 'balken') {
      kopf = ['', d.series[0].name];
      var hoch = Math.max.apply(null, d.series[0].values);
      d.x.forEach(function (l, i) {
        var v = d.series[0].values[i];
        zeilen.push([l, zahl(v) + (v === hoch ? ' (Höchstwert)' : '')]);
      });
    } else if (art === 'kerze') {
      kopf = ['', 'Start', 'Hoch', 'Tief', 'Ende', 'Richtung'];
      d.ohlc.forEach(function (o, i) {
        zeilen.push([d.x[i], zahl(o[0]), zahl(o[1]), zahl(o[2]), zahl(o[3]),
          o[3] >= o[0] ? 'gestiegen' : 'gesunken']);
      });
    } else if (art === 'karte') {
      kopf = ['Gebiet', 'Wert'];
      d.tiles.forEach(function (t) { zeilen.push([t.label, zahl(t.value)]); });
    } else if (art === 'verbund') {
      kopf = [''].concat(d.x);
      reiheAus(d.bars.name, d.bars.values.map(zahl));
      reiheAus(d.line.name, d.line.values.map(zahl));
    } else if (art === 'trichter') {
      kopf = ['Stufe', 'Wert', 'Anteil der Stufe davor'];
      d.items.forEach(function (it, i) {
        zeilen.push([it.label, zahl(it.value),
          i ? Math.round(it.value / d.items[i - 1].value * 100) + ' %' : '—']);
      });
    } else if (art === 'messuhr') {
      kopf = ['Wert', 'Höchstwert', 'Anteil'];
      zeilen.push([zahl(d.value), zahl(d.max), Math.round(d.value / d.max * 100) + ' %']);
    } else if (art === 'waerme') {
      kopf = [''].concat(d.cols);
      d.rows.forEach(function (r, i) { reiheAus(r, d.values[i].map(zahl)); });
    } else if (art === 'laufend') {
      kopf = ['Reihe', 'Beobachtet'];
      zeilen.push([d.name, 'laufend, ' + zahl(d.min) + ' bis ' + zahl(d.max)]);
    } else if (art === 'kreis') {
      var summe = d.items.reduce(function (a, it) { return a + it.value; }, 0);
      kopf = ['Teil', 'Wert', 'Anteil'];
      d.items.forEach(function (it) {
        zeilen.push([it.label, zahl(it.value), Math.round(it.value / summe * 100) + ' %']);
      });
      zeilen.push(['Summe', zahl(summe), '100 %']);
    } else if (art === 'bilanz') {
      kopf = ['', d.name, 'Richtung'];
      d.x.forEach(function (l, i) {
        var v = d.values[i];
        zeilen.push([l, (v > 0 ? '+' : '') + zahl(v), v >= 0 ? 'Gewinn' : 'Verlust']);
      });
    } else if (art === 'netz') {
      kopf = [''].concat(d.axes);
      d.series.forEach(function (s) { reiheAus(s.name, s.values.map(zahl)); });
    } else if (art === 'ring') {
      kopf = ['Ziel', 'Stand', 'Ziel', 'Anteil'];
      d.items.forEach(function (it) {
        zeilen.push([it.label, zahl(it.value), zahl(it.max),
          Math.round(it.value / it.max * 100) + ' %']);
      });
    } else if (art === 'strom') {
      kopf = ['Von', 'Nach', 'Menge'];
      var nach = {};
      d.nodes.forEach(function (n) { nach[n.id] = n.label; });
      d.links.forEach(function (l) { zeilen.push([nach[l.from], nach[l.to], zahl(l.value)]); });
    } else if (art === 'punkte') {
      kopf = ['', d.xLabel, d.yLabel];
      d.points.forEach(function (p) { zeilen.push([p.label, zahl(p.x), zahl(p.y)]); });
    } else if (art === 'strahlen') {
      kopf = ['Gruppe', 'Teil', 'Wert'];
      d.children.forEach(function (g) {
        g.children.forEach(function (x) { zeilen.push([g.label, x.label, zahl(x.value)]); });
      });
    }

    if (!zeilen.length) return;
    var wickel = document.createElement('div');
    wickel.className = 'visually-hidden';
    var t = document.createElement('table');
    t.innerHTML = '<caption>Werte zu: ' + sicher(d.title || '') + '</caption>' +
      '<thead><tr>' + kopf.map(function (k) {
        return '<th scope="col">' + sicher(k) + '</th>';
      }).join('') + '</tr></thead><tbody>' + zeilen.map(function (z) {
        return '<tr>' + z.map(function (c, i) {
          return i ? '<td>' + sicher(c) + '</td>' : '<th scope="row">' + sicher(c) + '</th>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
    wickel.appendChild(t);
    fig.appendChild(wickel);
  }

  var D = {};

  D.linie = function (fig, d, t, art) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 16, b: 30, l: 46 }, n = d.x.length;
    var max = rundesMax(Math.max.apply(null, d.series.map(function (r) {
      return Math.max.apply(null, r.values);
    })));
    hochachse(s, m, max, 4);
    var xVon = function (i) { return m.l + (W - m.l - m.r) * i / (n - 1); };
    var yVon = function (v) { return m.t + (H - m.t - m.b) * (1 - v / max); };
    querachse(s, m, d.x, xVon, Math.ceil(n / 6));
    var schnitt = wischen(s);
    var g = el('g', { 'clip-path': 'url(#' + schnitt.id + ')' }, s);
    var zeilen = d.series.map(function (r, k) {
      var st = strich(k), pkte = r.values.map(function (v, i) { return [xVon(i), yVon(v)]; });
      if (art === 'flaeche') {
        el('path', {
          class: 'diagramm__flaeche', 'data-reihe': st,
          d: kurve(pkte) + ' L' + xVon(n - 1) + ',' + (H - m.b) + ' L' + m.l + ',' + (H - m.b) + ' Z',
          fill: verlauf(s, st)
        }, g);
      }
      el('path', { d: kurve(pkte), class: 'diagramm__linie', 'data-reihe': st }, g);
      return {
        name: r.name, reihe: st,
        y: function (i) { return yVon(r.values[i]); },
        text: function (i) { return zahl(r.values[i]) + (d.unit || ''); }
      };
    });
    zeilen.marke = function (i) { return d.x[i]; };
    hilfslinie(fig, s, m, n, xVon, zeilen);
    legende(fig, d.series.map(function (r, k) { return { name: r.name, reihe: strich(k) }; }));
    return function () { schnitt.ab(t.wisch); };
  };

  D.flaeche = function (fig, d, t) { return D.linie(fig, d, t, 'flaeche'); };

  D.balken = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 16, b: 30, l: 46 };
    var n = d.x.length, r = d.series[0];
    var max = rundesMax(Math.max.apply(null, r.values));
    hochachse(s, m, max, 4);
    var bw = (W - m.l - m.r) / n, xVon = function (i) { return m.l + bw * (i + .5); };
    querachse(s, m, d.x, xVon);
    var hoch = r.values.indexOf(Math.max.apply(null, r.values));
    var balken = r.values.map(function (v, i) {
      var attrs = {
        x: xVon(i) - bw * .32, width: bw * .64, class: 'diagramm__balken',
        'data-reihe': i === hoch ? 1 : 4,
        'data-tip': '<b>' + sicher(d.x[i]) + '</b><span>' + sicher(r.name) +
          ' <em>' + zahl(v) + (d.unit || '') + '</em></span>'
      };
      if (i === hoch) attrs['data-hoch'] = '';
      return el('rect', attrs, s);
    });
    hinweisziele(fig, s);
    legende(fig, [{ name: r.name, reihe: 4 }, { name: 'Höchstwert, doppelte Kante', reihe: 1 }]);
    return function () {
      versetzt(n, t.wachs, t.versatz, function (i, p) {
        var h = (H - m.t - m.b) * r.values[i] / max * p;
        balken[i].setAttribute('y', H - m.b - h);
        balken[i].setAttribute('height', h);
      });
    };
  };

  D.verbund = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 46, b: 30, l: 46 }, n = d.x.length;
    var maxB = rundesMax(Math.max.apply(null, d.bars.values));
    var maxL = rundesMax(Math.max.apply(null, d.line.values));
    hochachse(s, m, maxB, 4);
    for (var i = 0; i <= 4; i++) {
      el('text', {
        x: W - m.r + 8, y: m.t + (H - m.t - m.b) * (1 - i / 4) + 4, class: 'diagramm__achse'
      }, s).textContent = zahl(maxL * i / 4);
    }
    var bw = (W - m.l - m.r) / n, xVon = function (k) { return m.l + bw * (k + .5); };
    querachse(s, m, d.x, xVon);
    var balken = d.bars.values.map(function (v, k) {
      return el('rect', {
        x: xVon(k) - bw * .3, width: bw * .6, class: 'diagramm__balken diagramm__muster',
        'data-reihe': 3
      }, s);
    });
    var yL = function (v) { return m.t + (H - m.t - m.b) * (1 - v / maxL); };
    var schnitt = wischen(s);
    el('path', {
      d: kurve(d.line.values.map(function (v, k) { return [xVon(k), yL(v)]; })),
      class: 'diagramm__linie', 'data-reihe': 1, 'clip-path': 'url(#' + schnitt.id + ')'
    }, s);
    var zeilen = [
      {
        name: d.bars.name, reihe: 3,
        y: function (k) { return H - m.b - (H - m.t - m.b) * d.bars.values[k] / maxB; },
        text: function (k) { return zahl(d.bars.values[k]); }
      },
      {
        name: d.line.name, reihe: 1,
        y: function (k) { return yL(d.line.values[k]); },
        text: function (k) { return zahl(d.line.values[k]); }
      }
    ];
    zeilen.marke = function (k) { return d.x[k]; };
    hilfslinie(fig, s, m, n, xVon, zeilen);
    legende(fig, [{ name: d.bars.name + ' (links)', reihe: 3 }, { name: d.line.name + ' (rechts)', reihe: 1 }]);
    return function () {
      versetzt(n, t.wachs, t.versatz, function (k, p) {
        var h = (H - m.t - m.b) * d.bars.values[k] / maxB * p;
        balken[k].setAttribute('y', H - m.b - h);
        balken[k].setAttribute('height', h);
      });
      schnitt.ab(t.wisch);
    };
  };

  D.kerze = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 16, b: 30, l: 46 }, n = d.x.length;
    var tief = Math.min.apply(null, d.ohlc.map(function (o) { return o[2]; }));
    var hoch = Math.max.apply(null, d.ohlc.map(function (o) { return o[1]; }));
    tief = Math.floor(tief / 10) * 10;
    hoch = Math.ceil(hoch / 10) * 10;
    var yVon = function (v) { return m.t + (H - m.t - m.b) * (1 - (v - tief) / (hoch - tief)); };
    var g = el('g', { class: 'diagramm__netz' }, s);
    for (var i = 0; i <= 4; i++) {
      var v = tief + (hoch - tief) * i / 4, y = yVon(v);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y }, g);
      el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', class: 'diagramm__achse' }, g)
        .textContent = zahl(v);
    }
    var bw = (W - m.l - m.r) / n, xVon = function (k) { return m.l + bw * (k + .5); };
    querachse(s, m, d.x, xVon, Math.ceil(n / 8));
    var kerzen = d.ohlc.map(function (o, k) {
      var auf = o[3] >= o[0];
      var gg = el('g', {
        'data-zustand': auf ? 'steigt' : 'faellt',
        'data-tip': '<b>' + sicher(d.x[k]) + '</b>' +
          '<span>Start <em>' + zahl(o[0]) + '</em></span>' +
          '<span>Hoch <em>' + zahl(o[1]) + '</em></span>' +
          '<span>Tief <em>' + zahl(o[2]) + '</em></span>' +
          '<span>Ende <em>' + zahl(o[3]) + '</em></span>' +
          '<span>Richtung <em>' + (auf ? 'gestiegen' : 'gesunken') + '</em></span>'
      }, s);
      return {
        docht: el('line', { x1: xVon(k), x2: xVon(k), class: 'diagramm__docht' }, gg),
        koerper: el('rect', { x: xVon(k) - bw * .3, width: bw * .6, class: 'diagramm__kerze' }, gg),
        o: o
      };
    });
    hinweisziele(fig, s);
    legende(fig, [
      { name: 'gestiegen (hohl)', zustand: 'steigt' },
      { name: 'gesunken (gefüllt)', zustand: 'faellt' }
    ]);
    return function () {
      versetzt(n, t.punkt, t.versatz, function (k, p) {
        var e = kerzen[k], o = e.o, mitte = yVon((o[0] + o[3]) / 2);
        var oben = yVon(Math.max(o[0], o[3])), unten = yVon(Math.min(o[0], o[3]));
        var h = Math.max(2, unten - oben) * p;
        e.koerper.setAttribute('y', mitte - h / 2);
        e.koerper.setAttribute('height', h);
        e.docht.setAttribute('y1', mitte + (yVon(o[1]) - mitte) * p);
        e.docht.setAttribute('y2', mitte + (yVon(o[2]) - mitte) * p);
      });
    };
  };

  D.bilanz = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 16, b: 30, l: 52 }, n = d.x.length;
    var mx = rundesMax(Math.max.apply(null, d.values.map(Math.abs)));
    var yVon = function (v) { return m.t + (H - m.t - m.b) * (1 - (v + mx) / (2 * mx)); };
    var xVon = function (i) { return m.l + (W - m.l - m.r) * i / (n - 1); };
    var g = el('g', { class: 'diagramm__netz' }, s);
    [-mx, -mx / 2, 0, mx / 2, mx].forEach(function (v) {
      var y = yVon(v);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: v === 0 ? 'null' : '' }, g);
      el('text', { x: m.l - 8, y: y + 4, 'text-anchor': 'end', class: 'diagramm__achse' }, g)
        .textContent = (v > 0 ? '+' : '') + zahl(v);
    });
    querachse(s, m, d.x, xVon, Math.ceil(n / 6));
    var z = yVon(0), pkte = d.values.map(function (v, i) { return [xVon(i), yVon(v)]; });
    var p = kurve(pkte);
    var defs = el('defs', {}, s), oben = 'dia-oben' + (++lauf), unten = 'dia-unten' + lauf;
    el('rect', { x: 0, y: 0, width: W, height: z }, el('clipPath', { id: oben }, defs));
    el('rect', { x: 0, y: z, width: W, height: H - z }, el('clipPath', { id: unten }, defs));
    var schnitt = wischen(s);
    var gg = el('g', { 'clip-path': 'url(#' + schnitt.id + ')' }, s);
    var flaeche = p + ' L' + xVon(n - 1) + ',' + z + ' L' + m.l + ',' + z + ' Z';
    el('path', {
      d: flaeche, 'clip-path': 'url(#' + oben + ')', fill: verlauf(s, 0, .45, 'gewinn')
    }, gg);
    el('path', {
      d: flaeche, 'clip-path': 'url(#' + unten + ')', class: 'diagramm__flaeche--verlust'
    }, gg);
    el('path', {
      d: p, class: 'diagramm__linie diagramm__linie--gewinn', 'clip-path': 'url(#' + oben + ')'
    }, gg);
    el('path', {
      d: p, class: 'diagramm__linie diagramm__linie--verlust', 'clip-path': 'url(#' + unten + ')'
    }, gg);
    var zeilen = [{
      name: d.name, reihe: 1,
      y: function (i) { return yVon(d.values[i]); },
      text: function (i) {
        var v = d.values[i];
        return (v > 0 ? '+' : '') + zahl(v) + (d.unit || '') + (v >= 0 ? ' · Gewinn' : ' · Verlust');
      }
    }];
    zeilen.marke = function (i) { return d.x[i]; };
    hilfslinie(fig, s, m, n, xVon, zeilen);
    legende(fig, [
      { name: 'Gewinn (über der Nulllinie, glatt)', zustand: 'steigt' },
      { name: 'Verlust (unter der Nulllinie, schraffiert)', zustand: 'faellt' }
    ]);
    return function () { schnitt.ab(t.wisch); };
  };

  D.laufend = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 16, b: 30, l: 46 };
    var N = 40, werte = [], v = d.start;
    for (var i = 0; i < N; i++) {
      v = Math.max(d.min, Math.min(d.max, v + (Math.random() - .5) * (d.max - d.min) * .12));
      werte.push(v);
    }
    var max = rundesMax(d.max);
    hochachse(s, m, max, 4);
    var breite = (W - m.l - m.r) / (N - 2);
    var yVon = function (x) { return m.t + (H - m.t - m.b) * (1 - x / max); };
    var cp = 'dia-lauf' + (++lauf);
    el('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H },
      el('clipPath', { id: cp }, el('defs', {}, s)));
    var g = el('g', { 'clip-path': 'url(#' + cp + ')' }, s), innen = el('g', {}, g);
    var flaeche = el('path', {
      class: 'diagramm__flaeche', 'data-reihe': 1, fill: verlauf(s, 1, .35)
    }, innen);
    var linie = el('path', { class: 'diagramm__linie', 'data-reihe': 1 }, innen);
    var punkt = el('circle', { r: 5, class: 'diagramm__laufpunkt' }, s);
    var jetzt = fig.querySelector('.diagramm__jetzt');

    function zeichne() {
      var pkte = werte.map(function (x, k) { return [m.l + breite * k, yVon(x)]; });
      linie.setAttribute('d', kurve(pkte));
      flaeche.setAttribute('d', kurve(pkte) + ' L' + pkte[N - 1][0] + ',' + (H - m.b) +
        ' L' + m.l + ',' + (H - m.b) + ' Z');
      punkt.setAttribute('cx', m.l + breite * (N - 2));
      punkt.setAttribute('cy', yVon(werte[N - 2]));
      if (jetzt) jetzt.textContent = zahl(werte[N - 2]) + (d.unit || '');
    }
    zeichne();

    var uhr = null, sichtbar = false;
    function takt() {
      v = Math.max(d.min, Math.min(d.max,
        werte[N - 1] + (Math.random() - .5) * (d.max - d.min) * .12));
      werte.push(v);
      werte.shift();
      zeichne();
      if (!OB) {
        innen.animate(
          [{ transform: 'translateX(' + breite + 'px)' }, { transform: 'translateX(0)' }],
          { duration: t.takt, easing: 'linear' }
        );
      }
    }
    function los() { if (!uhr && sichtbar && !document.hidden) uhr = setInterval(takt, 1000); }
    function halt() { clearInterval(uhr); uhr = null; }
    new IntersectionObserver(function (e) {
      sichtbar = e[0].isIntersecting;
      sichtbar ? los() : halt();
    }).observe(fig);
    document.addEventListener('visibilitychange', function () {
      document.hidden ? halt() : los();
    });
    legende(fig, [{ name: d.name, reihe: 1 }]);
    return function () {
      var c = wischen(s);
      g.setAttribute('clip-path', 'url(#' + c.id + ')');
      c.ab(t.wisch);
      setTimeout(function () {
        g.setAttribute('clip-path', 'url(#' + cp + ')');
      }, OB ? 0 : t.wisch + 50);
    };
  };

  function rund(fig, d, t, o) {
    var s = blatt(fig, 0, d.title), cx = W / 2, cy = H / 2;
    var summe = d.items.reduce(function (a, it) { return a + it.value; }, 0);
    var pfade = d.items.map(function (it, i) {
      return el('path', {
        class: 'diagramm__stueck diagramm__muster', 'data-reihe': reihe(i),
        'data-tip': '<b>' + sicher(it.label) + '</b><span>' + zahl(it.value) + (d.unit || '') +
          ' <em>' + Math.round(it.value / summe * 100) + ' %</em></span>'
      }, s);
    });
    var mitte = el('text', { x: cx, y: cy + 8, 'text-anchor': 'middle', class: 'diagramm__mitte' }, s);
    var unter = el('text', { x: cx, y: cy + 28, 'text-anchor': 'middle', class: 'diagramm__achse' }, s);
    mitte.textContent = o.mitte ? o.mitte(summe) : '';
    unter.textContent = d.centerLabel || '';
    hinweisziele(fig, s);
    legende(fig, d.items.map(function (it, i) { return { name: it.label, reihe: reihe(i) }; }));
    return function () {
      blenden(t.bogen, function (p) {
        var a = 0;
        d.items.forEach(function (it, i) {
          var sp = it.value / summe * Math.PI * 2 * p;
          pfade[i].setAttribute('d', bogen(cx, cy, o.r0, o.r1, a + .012, a + sp - .012));
          a += sp;
        });
      });
    };
  }

  D.kreis = function (fig, d, t) {
    return rund(fig, d, t, { r0: 72, r1: 128, mitte: function (v) { return zahl(v); } });
  };

  D.ring = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), cx = W / 2, cy = H / 2, ringe = [];
    d.items.forEach(function (it, i) {
      var r = 128 - i * 26;
      el('circle', { cx: cx, cy: cy, r: r, class: 'diagramm__bahn' }, s);
      ringe.push({
        e: el('path', {
          class: 'diagramm__ring', 'data-reihe': strich(i),
          'data-tip': '<b>' + sicher(it.label) + '</b><span>' + zahl(it.value) + ' von ' +
            zahl(it.max) + ' <em>' + Math.round(it.value / it.max * 100) + ' %</em></span>'
        }, s),
        r: r, f: it.value / it.max
      });
    });
    var mitte = el('text', { x: cx, y: cy + 8, 'text-anchor': 'middle', class: 'diagramm__mitte' }, s);
    hinweisziele(fig, s);
    legende(fig, d.items.map(function (it, i) {
      return { name: it.label + ' · ' + Math.round(it.value / it.max * 100) + ' %', reihe: strich(i) };
    }));
    return function () {
      versetzt(ringe.length, t.bogen, t.versatzGross, function (i, p) {
        var R = ringe[i], a = R.f * Math.PI * 2 * p;
        R.e.setAttribute('d', a < .001 ? '' : 'M' + cx + ',' + (cy - R.r) +
          ' A' + R.r + ',' + R.r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' +
          (cx + R.r * Math.sin(a)) + ',' + (cy - R.r * Math.cos(a)));
        if (i === 0) mitte.textContent = Math.round(R.f * 100 * p) + ' %';
      });
    };
  };

  D.messuhr = function (fig, d, t) {
    var s = blatt(fig, 250, d.title), cx = W / 2, cy = 175, r0 = 110, r1 = 150;
    var A0 = -Math.PI / 2, f = d.value / d.max;
    el('path', { d: bogen(cx, cy, r0, r1, A0, Math.PI / 2), class: 'diagramm__bahn--flaeche' }, s);
    var id = 'dia-uhr' + (++lauf);
    var lg = el('linearGradient', {
      id: id, x1: 0, y1: 0, x2: 1, y2: 0, 'data-verlauf': 'messuhr'
    }, el('defs', {}, s));
    el('stop', { offset: '0%' }, lg);
    el('stop', { offset: '100%' }, lg);
    var wert = el('path', { fill: 'url(#' + id + ')' }, s);
    var zeiger = el('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - r0 + 14, class: 'diagramm__zeiger'
    }, s);
    el('circle', { cx: cx, cy: cy, r: 7, class: 'diagramm__nabe' }, s);
    var mitte = el('text', { x: cx, y: cy + 58, 'text-anchor': 'middle', class: 'diagramm__mitte' }, s);
    el('text', {
      x: cx - (r0 + r1) / 2, y: cy + 22, 'text-anchor': 'middle', class: 'diagramm__achse'
    }, s).textContent = '0';
    el('text', {
      x: cx + (r0 + r1) / 2, y: cy + 22, 'text-anchor': 'middle', class: 'diagramm__achse'
    }, s).textContent = zahl(d.max);
    legende(fig, [{ name: d.label + ': ' + zahl(d.value) + ' von ' + zahl(d.max), reihe: 1 }]);
    return function () {
      blenden(t.bogen, function (p) {
        var a = A0 + Math.PI * f * p;
        wert.setAttribute('d', bogen(cx, cy, r0, r1, A0, Math.max(A0 + .001, a)));
        zeiger.setAttribute('transform', 'rotate(' + (a * 180 / Math.PI) + ' ' + cx + ' ' + cy + ')');
        mitte.textContent = zahl(d.value * p) + (d.unit || '');
      });
    };
  };

  D.trichter = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), n = d.items.length;
    var max = d.items[0].value, bh = (H - 20) / n, stufen = [];
    d.items.forEach(function (it, i) {
      var y = 10 + i * bh;
      var b = (W - 220) * Math.max(.1, Math.sqrt(it.value / max));
      var r = el('rect', {
        y: y + 4, height: bh - 8, class: 'diagramm__stufe diagramm__muster',
        'data-reihe': reihe(i),
        'data-tip': '<b>' + sicher(it.label) + '</b><span>' + zahl(it.value) +
          (i ? ' <em>' + Math.round(it.value / d.items[i - 1].value * 100) +
            ' % der Stufe davor</em>' : '') + '</span>'
      }, s);
      el('text', { x: 20, y: y + bh / 2 + 5, class: 'diagramm__marke' }, s).textContent = it.label;
      el('text', {
        x: W - 20, y: y + bh / 2 + 5, 'text-anchor': 'end', class: 'diagramm__wert'
      }, s).textContent = zahl(it.value);
      stufen.push({ r: r, b: b });
    });
    hinweisziele(fig, s);
    return function () {
      versetzt(n, t.wachs, t.versatzGross, function (i, p) {
        var b = stufen[i].b * p;
        stufen[i].r.setAttribute('x', W / 2 + 20 - b / 2);
        stufen[i].r.setAttribute('width', b);
      });
    };
  };

  D.waerme = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 10, r: 10, b: 26, l: 40 };
    var R = d.rows.length, K = d.cols.length;
    var cw = (W - m.l - m.r) / K, ch = (H - m.t - m.b) / R;
    var max = Math.max.apply(null, d.values.map(function (r) { return Math.max.apply(null, r); }));
    var felder = [];
    d.rows.forEach(function (rl, r) {
      el('text', {
        x: m.l - 8, y: m.t + ch * (r + .5) + 4, 'text-anchor': 'end', class: 'diagramm__achse'
      }, s).textContent = rl;
      d.cols.forEach(function (cl, c) {
        var v = d.values[r][c];
        felder.push({
          e: el('rect', {
            x: m.l + cw * c + 1.5, y: m.t + ch * r + 1.5, width: cw - 3, height: ch - 3,
            class: 'diagramm__zelle', 'data-reihe': 1, opacity: 0,
            'data-tip': '<b>' + sicher(rl) + ', ' + sicher(cl) + '</b><span>' +
              zahl(v) + (d.unit || '') + '</span>'
          }, s),
          o: v / max, k: r + c
        });
      });
    });
    d.cols.forEach(function (cl, c) {
      if (c % 2 === 0) {
        el('text', {
          x: m.l + cw * (c + .5), y: H - 8, 'text-anchor': 'middle', class: 'diagramm__achse'
        }, s).textContent = cl;
      }
    });
    hinweisziele(fig, s);
    var l = fig.querySelector('.diagramm__legende');
    if (l) {
      l.className = 'diagramm__legende diagramm__skala';
      l.innerHTML = '<span><i data-reihe="1"></i>wenig bis viel' +
        (d.unit ? ' ' + sicher(d.unit.trim()) : '') + '</span>';
      legendeAusrichten(fig);
    }
    return function () {
      versetzt(R + K, t.punkt, t.versatz, function (k, p) {
        felder.forEach(function (f) {
          if (f.k === k) f.e.setAttribute('opacity', (.08 + .92 * f.o) * p);
        });
      });
    };
  };

  D.netz = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), cx = W / 2, cy = H / 2 + 6, R = 118, n = d.axes.length;
    function pt(i, r) {
      var a = Math.PI * 2 * i / n;
      return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    }
    var g = el('g', { class: 'diagramm__netz' }, s);
    [.25, .5, .75, 1].forEach(function (f) {
      el('polygon', {
        points: d.axes.map(function (_, i) { return pt(i, R * f).join(','); }).join(' ')
      }, g);
    });
    d.axes.forEach(function (a, i) {
      var p = pt(i, R);
      el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1] }, g);
      var q = pt(i, R + 18);
      el('text', {
        x: q[0], y: q[1] + 4, 'text-anchor': 'middle', class: 'diagramm__achse'
      }, s).textContent = a;
    });
    var formen = d.series.map(function (r, k) {
      return el('polygon', {
        class: 'diagramm__netzform', 'data-reihe': strich(k),
        'data-tip': '<b>' + sicher(r.name) + '</b>' + d.axes.map(function (a, i) {
          return '<span>' + sicher(a) + ' <em>' + zahl(r.values[i]) + '</em></span>';
        }).join('')
      }, s);
    });
    hinweisziele(fig, s);
    legende(fig, d.series.map(function (r, k) { return { name: r.name, reihe: strich(k) }; }));
    return function () {
      versetzt(d.series.length, t.bogen, t.versatzGross, function (k, p) {
        formen[k].setAttribute('points', d.series[k].values.map(function (v, i) {
          return pt(i, R * v / 100 * p).join(',');
        }).join(' '));
      });
    };
  };

  D.punkte = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 16, r: 16, b: 40, l: 50 };
    var mx = rundesMax(Math.max.apply(null, d.points.map(function (p) { return p.x; })));
    var my = rundesMax(Math.max.apply(null, d.points.map(function (p) { return p.y; })));
    hochachse(s, m, my, 4, function (v) { return zahl(v) + (d.yUnit || ''); });
    var xVon = function (v) { return m.l + (W - m.l - m.r) * v / mx; };
    var yVon = function (v) { return m.t + (H - m.t - m.b) * (1 - v / my); };
    for (var i = 0; i <= 4; i++) {
      el('text', {
        x: xVon(mx * i / 4), y: H - m.b + 18, 'text-anchor': 'middle', class: 'diagramm__achse'
      }, s).textContent = zahl(mx * i / 4);
    }
    el('text', {
      x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'diagramm__achse'
    }, s).textContent = d.xLabel;
    var punkte = d.points.map(function (p) {
      return {
        e: el('path', {
          class: 'diagramm__punkt', 'data-reihe': 1,
          'data-tip': '<b>' + sicher(p.label) + '</b><span>' + sicher(d.xLabel) +
            ' <em>' + zahl(p.x) + '</em></span><span>' + sicher(d.yLabel) +
            ' <em>' + zahl(p.y) + (d.yUnit || '') + '</em></span>'
        }, s),
        x: xVon(p.x), y: yVon(p.y)
      };
    });
    hinweisziele(fig, s);
    legende(fig, [{ name: d.yLabel + ' nach ' + d.xLabel, reihe: 1 }]);
    return function () {
      versetzt(punkte.length, t.punkt, t.versatz, function (i, p) {
        punkte[i].e.setAttribute('d', form(0, punkte[i].x, punkte[i].y, 7 * p));
      });
    };
  };

  D.strom = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), m = { t: 10, b: 10, l: 10, r: 10 }, NB = 14, nach = {};
    d.nodes.forEach(function (n) { n.ein = 0; n.aus = 0; nach[n.id] = n; });
    d.links.forEach(function (l) { nach[l.from].aus += l.value; nach[l.to].ein += l.value; });
    var spalten = Math.max.apply(null, d.nodes.map(function (n) { return n.col; })) + 1;
    var luft = 14, maxSpalte = 0;
    for (var c = 0; c < spalten; c++) {
      var sum = d.nodes.filter(function (n) { return n.col === c; })
        .reduce(function (a, n) { return a + Math.max(n.ein, n.aus); }, 0);
      maxSpalte = Math.max(maxSpalte, sum);
    }
    var ky = (H - m.t - m.b - luft * 4) / maxSpalte;
    for (c = 0; c < spalten; c++) {
      var y = m.t;
      d.nodes.filter(function (n) { return n.col === c; }).forEach(function (n) {
        n.x = m.l + 120 + (W - m.l - m.r - 240 - NB) * n.col / (spalten - 1);
        n.y = y;
        n.h = Math.max(n.ein, n.aus) * ky;
        n.ay = y;
        n.ey = y;
        y += n.h + luft;
      });
    }
    var schnitt = wischen(s);
    var g = el('g', { 'clip-path': 'url(#' + schnitt.id + ')' }, s);
    d.links.forEach(function (l) {
      var a = nach[l.from], b = nach[l.to], h = l.value * ky;
      var x0 = a.x + NB, x1 = b.x, xm = (x0 + x1) / 2, y0 = a.ay, y1 = b.ey;
      a.ay += h;
      b.ey += h;
      el('path', {
        d: 'M' + x0 + ',' + y0 + ' C' + xm + ',' + y0 + ' ' + xm + ',' + y1 + ' ' + x1 + ',' + y1 +
          ' L' + x1 + ',' + (y1 + h) + ' C' + xm + ',' + (y1 + h) + ' ' + xm + ',' + (y0 + h) +
          ' ' + x0 + ',' + (y0 + h) + ' Z',
        class: 'diagramm__strom diagramm__muster',
        'data-reihe': reihe(a.col === 0 ? d.nodes.indexOf(a) : 0),
        'data-tip': '<b>' + sicher(a.label) + ' → ' + sicher(b.label) + '</b><span>' +
          zahl(l.value) + (d.unit || '') + '</span>'
      }, g);
    });
    d.nodes.forEach(function (n) {
      el('rect', {
        x: n.x, y: n.y, width: NB, height: n.h, class: 'diagramm__knoten',
        'data-tip': '<b>' + sicher(n.label) + '</b><span>' +
          zahl(Math.max(n.ein, n.aus)) + (d.unit || '') + '</span>'
      }, s);
      var links = n.col === 0;
      el('text', {
        x: links ? n.x - 8 : n.x + NB + 8, y: n.y + n.h / 2 + 4,
        'text-anchor': links ? 'end' : 'start', class: 'diagramm__marke'
      }, s).textContent = n.label;
    });
    hinweisziele(fig, s);
    return function () { schnitt.ab(t.wisch); };
  };

  D.strahlen = function (fig, d, t) {
    var s = blatt(fig, 0, d.title), cx = W / 2, cy = H / 2, stuecke = [], summe = 0;
    d.children.forEach(function (c) {
      c.value = c.children.reduce(function (a, x) { return a + x.value; }, 0);
      summe += c.value;
    });
    var a = 0;
    d.children.forEach(function (c, i) {
      var weite = c.value / summe * Math.PI * 2, r = reihe(i);
      stuecke.push({
        e: el('path', {
          class: 'diagramm__stueck diagramm__muster', 'data-reihe': r,
          'data-tip': '<b>' + sicher(c.label) + '</b><span>' + zahl(c.value) + (d.unit || '') +
            ' <em>' + Math.round(c.value / summe * 100) + ' %</em></span>'
        }, s),
        a0: a, a1: a + weite, r0: 44, r1: 88
      });
      var b = a;
      c.children.forEach(function (x) {
        var sp = x.value / summe * Math.PI * 2;
        stuecke.push({
          e: el('path', {
            class: 'diagramm__stueck diagramm__stueck--aussen diagramm__muster', 'data-reihe': r,
            'data-tip': '<b>' + sicher(c.label) + ' · ' + sicher(x.label) + '</b><span>' +
              zahl(x.value) + (d.unit || '') + '</span>'
          }, s),
          a0: b, a1: b + sp, r0: 92, r1: 136
        });
        b += sp;
      });
      a += weite;
    });
    el('text', {
      x: cx, y: cy + 6, 'text-anchor': 'middle', class: 'diagramm__mitte diagramm__mitte--klein'
    }, s).textContent = zahl(summe);
    hinweisziele(fig, s);
    legende(fig, d.children.map(function (c, i) { return { name: c.label, reihe: reihe(i) }; }));
    return function () {
      blenden(t.bogen, function (p) {
        stuecke.forEach(function (st) {
          st.e.setAttribute('d', bogen(cx, cy, st.r0, st.r1, st.a0 * p + .01, st.a1 * p - .01));
        });
      });
    };
  };

  D.karte = function (fig, d, t) {
    var s = blatt(fig, 0, d.title);
    var spalten = Math.max.apply(null, d.tiles.map(function (x) { return x.col; })) + 1;
    var zeilen = Math.max.apply(null, d.tiles.map(function (x) { return x.row; })) + 1;
    var k = Math.min((W - 40) / spalten, (H - 20) / zeilen);
    var ox = (W - k * spalten) / 2, oy = (H - k * zeilen) / 2;
    var max = Math.max.apply(null, d.tiles.map(function (x) { return x.value; }));
    var felder = d.tiles.map(function (x) {
      var gg = el('g', {
        'data-tip': '<b>' + sicher(x.label) + '</b><span>' + zahl(x.value) + (d.unit || '') + '</span>'
      }, s);
      var r = el('rect', {
        x: ox + x.col * k + 2, y: oy + x.row * k + 2, width: k - 4, height: k - 4,
        class: 'diagramm__gebiet', 'data-reihe': 1, opacity: 0
      }, gg);
      el('text', {
        x: ox + x.col * k + k / 2, y: oy + x.row * k + k / 2 + 4,
        'text-anchor': 'middle', class: 'diagramm__kachel'
      }, gg).textContent = x.id;
      return { r: r, o: .12 + .88 * x.value / max, k: x.col + x.row };
    });
    hinweisziele(fig, s);
    var l = fig.querySelector('.diagramm__legende');
    if (l) {
      l.className = 'diagramm__legende diagramm__skala';
      l.innerHTML = '<span><i data-reihe="1"></i>wenig bis viel' +
        (d.unit ? ' ' + sicher(d.unit.trim()) : '') + '</span>';
      legendeAusrichten(fig);
    }
    return function () {
      versetzt(spalten + zeilen, t.punkt, t.versatz, function (i, p) {
        felder.forEach(function (f) {
          if (f.k === i) f.r.setAttribute('opacity', f.o * p);
        });
      });
    };
  };

  function zeitenVon(fig) {
    var stil = getComputedStyle(fig);
    return {
      wisch: dauer(fig, 'wisch', stil),
      wachs: dauer(fig, 'wachs', stil),
      bogen: dauer(fig, 'bogen', stil),
      punkt: dauer(fig, 'punkt', stil),
      takt: dauer(fig, 'takt', stil),
      versatz: dauer(fig, 'versatz', stil),
      versatzGross: dauer(fig, 'versatz-gross', stil)
    };
  }

  function einrichten(fig, vorab) {
    if (fig.__dia) return;
    fig.__dia = true;
    var art = fig.getAttribute('data-diagramm');
    var quelle = fig.querySelector('script[type="application/json"]');
    if (!D[art] || !quelle) return;
    var d;
    try { d = JSON.parse(quelle.textContent); }
    catch (err) {
      kaputt(fig, err, 'Die Daten dieses Diagramms sind kein gültiges JSON.',
        'Den Inhalt von <script type="application/json"> prüfen, oft fehlt ein Komma oder ein Anführungszeichen.');
      return;
    }
    musterblatt();

    if (!fig.querySelector('.diagramm__feld')) {
      var kopf = document.createElement('figcaption');
      kopf.className = 'diagramm__kopf';
      kopf.innerHTML = '<span class="diagramm__titel"></span>' +
        (art === 'laufend' ? '<b class="diagramm__jetzt"></b>' : '') +
        '<span class="diagramm__notiz"></span>' +
        (art === 'laufend' ? '' :
          '<button class="diagramm__nochmal" type="button" aria-label="Neu abspielen">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>');
      kopf.querySelector('.diagramm__titel').textContent = d.title || '';
      kopf.querySelector('.diagramm__notiz').textContent = d.note || '';
      fig.insertBefore(kopf, quelle);
      var feld = document.createElement('div');
      feld.className = 'diagramm__feld';
      feld.innerHTML = '<div class="diagramm__hinweis" hidden></div>';
      fig.insertBefore(feld, quelle);
      var lg = document.createElement('div');
      lg.className = 'diagramm__legende';
      fig.insertBefore(lg, quelle);
    }

    var t = vorab || zeitenVon(fig);

    var platz = fig.parentNode ? document.createComment('') : null;
    if (platz) fig.parentNode.replaceChild(platz, fig);
    var ab;
    try {
      ab = D[art](fig, d, t);
      werteTabelle(fig, d, art);
    } finally {
      if (platz) platz.parentNode.replaceChild(fig, platz);
    }

    var knopf = fig.querySelector('.diagramm__nochmal');
    if (knopf) knopf.addEventListener('click', function () { ab(); });

    if (!('IntersectionObserver' in window)) { ab(); return; }
    var gespielt = false;
    var beob = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !gespielt) {
        gespielt = true;
        ab();
        beob.disconnect();
      }
    }, { threshold: .35 });
    beob.observe(fig);
  }

  function kaputt(fig, err, titel, ausweg) {
    console.error('Diagramm «' + (fig.getAttribute('data-diagramm') || '?') + '»: ' + titel, err, fig);
    Array.prototype.forEach.call(
      fig.querySelectorAll('.diagramm__kopf, .diagramm__feld, .diagramm__legende'),
      function (e) { e.remove(); });
    if (fig.querySelector(':scope > .meldung')) return;
    var m = document.createElement('div');
    m.className = 'meldung meldung--fail';
    m.setAttribute('role', 'status');
    m.innerHTML = '<svg class="symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>' +
      '<div><b></b><p></p></div>';
    m.querySelector('b').textContent = titel;
    m.querySelector('p').textContent = ausweg;
    fig.insertBefore(m, fig.firstChild);
  }

  function init(wurzel) {
    wurzel = wurzel || document;
    var SEL = '.diagramm[data-diagramm]';
    var treffer = Array.prototype.slice.call(wurzel.querySelectorAll(SEL));
    if (wurzel.matches && wurzel.matches(SEL)) treffer.unshift(wurzel);
    var alle = treffer.filter(function (fig) { return !fig.__dia; });
    var zeiten = alle.map(function (fig) { return zeitenVon(fig); });
    alle.forEach(function (fig, i) {
      try { einrichten(fig, zeiten[i]); }
      catch (err) {
        kaputt(fig, err, 'Dieses Diagramm liess sich nicht zeichnen.',
          'Die Konsole nennt den Grund, meist passt ein Feld in den Daten nicht zur Art des Diagramms.');
      }
    });
  }

  window.Diagramme = { init: init };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
  document.addEventListener('inhalt-neu', function (e) { init(e.target instanceof Element ? e.target : document); });
})();

} catch (fehler) { console.warn("marke.js · system/chart-diagramme.js", fehler); } }

/* system/herz.js */
{ try {
(() => {
const RUHIG = window.matchMedia('(prefers-reduced-motion: reduce)');

const schreibe = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’');

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.herz[data-partikel]') ? [wurzel] : []), ...wurzel.querySelectorAll('.herz[data-partikel]')];
  for (const herz of treffer) {
    if (fertig.has(herz)) continue;
    fertig.add(herz);
    const kaestchen = herz.querySelector('input');
    const bild = herz.querySelector('.herz__bild');
    const zahl = herz.querySelector('.herz__zahl');
    if (!kaestchen || !bild) continue;
    let stand = Number(zahl?.textContent.replace(/\D/g, '') || 0);

    function streue() {
      if (RUHIG.matches) return;
      for (let i = 0; i < 12; i++) {
        const punkt = document.createElement('span');
        punkt.className = 'herz__punkt';
        const winkel = Math.random() * Math.PI * 2;
        const weite = 40 + Math.random() * 45;
        punkt.style.setProperty('--weg-x', `${Math.cos(winkel) * weite}px`);
        punkt.style.setProperty('--weg-y', `${Math.sin(winkel) * weite}px`);
        bild.append(punkt);
        punkt.addEventListener('animationend', () => punkt.remove());
      }
    }

    kaestchen.addEventListener('change', () => {
      stand += kaestchen.checked ? 1 : -1;
      if (zahl) zahl.textContent = schreibe(stand);
      if (kaestchen.checked) streue();
    });
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/herz.js", fehler); } }

/* system/feld-pruefen.js */
{ try {
(() => {
const FELDER = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea';

let zaehler = 0;
const freieKennung = (feld) => {
  let id = feld.id ? feld.id + '-fehler' : 'feld-fehler-' + (++zaehler);
  while (document.getElementById(id)) id = (feld.id || 'feld') + '-fehler-' + (++zaehler);
  return id;
};

const beschreibung = (feld) => (feld.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);

const wickelVon = (feld) =>
  feld.closest('.feld')
  || (/^(radio|checkbox)$/.test(feld.type) ? feld.closest('fieldset') : null);

const gemerkt = new WeakMap();
const meldungVon = (feld, anlegen = true) => {
  const alt = gemerkt.get(feld);
  if (alt?.isConnected) return alt;
  const m = sucheMeldung(feld, anlegen);
  if (m) gemerkt.set(feld, m);
  return m;
};
const sucheMeldung = (feld, anlegen) => {
  for (const id of beschreibung(feld)) {
    const el = document.getElementById(id);
    if (el?.classList.contains('feld__fehler')) return el;
  }
  const wickel = wickelVon(feld);
  const da = wickel && [...wickel.querySelectorAll('.feld__fehler')]
    .find((m) => m.parentElement.closest('.feld, fieldset') === wickel);
  if (da || !anlegen) return da || null;
  if (!wickel) {
    const neu = document.createElement('p');
    neu.className = 'feld__fehler';
    neu.setAttribute('aria-live', 'polite');
    neu.id = freieKennung(feld);
    (feld.closest('.feld__eingabe') || feld).after(neu);
    return neu;
  }
  const neu = document.createElement('p');
  neu.className = 'feld__fehler';
  neu.setAttribute('aria-live', 'polite');
  neu.id = freieKennung(feld);
  const hinweis = wickel.querySelector(':scope > .hinweis');
  if (hinweis) hinweis.before(neu); else wickel.append(neu);
  return neu;
};

const satzZu = (feld) => {
  const v = feld.validity;
  if (v.valueMissing) return 'Dieses Feld braucht eine Angabe.';
  if (v.typeMismatch && feld.type === 'email') return 'Hier fehlt ein @ und eine Domain.';
  if (v.typeMismatch && feld.type === 'url') return 'Eine Adresse beginnt mit https://';
  if (v.tooShort) return `Mindestens ${feld.minLength} Zeichen.`;
  if (v.tooLong) return `Höchstens ${feld.maxLength} Zeichen.`;
  if (v.rangeUnderflow) return `Mindestens ${feld.min}.`;
  if (v.rangeOverflow) return `Höchstens ${feld.max}.`;
  if (v.stepMismatch) return `Nur Schritte von ${feld.step}.`;
  return feld.validationMessage;
};

const zuPruefen = (feld) =>
  feld.willValidate && (feld.value.trim() !== '' || feld.required);

const verknuepfe = (feld, id, an) => {
  const liste = beschreibung(feld).filter((x) => x !== id);
  if (an) liste.push(id);
  if (liste.length) feld.setAttribute('aria-describedby', liste.join(' '));
  else feld.removeAttribute('aria-describedby');
};

const zeige = (feld, gueltig, text) => {
  feld.setAttribute('aria-invalid', gueltig ? 'false' : 'true');
  const meldung = meldungVon(feld);
  if (!meldung) return;
  meldung.textContent = gueltig ? '' : text;
  if (!meldung.id) meldung.id = freieKennung(feld);
  verknuepfe(feld, meldung.id, !gueltig);
};

const pruefe = (feld) => {
  if (!zuPruefen(feld)) {
    feld.removeAttribute('aria-invalid');
    const m = meldungVon(feld, false);
    if (m) {
      m.textContent = '';
      if (m.id) verknuepfe(feld, m.id, false);
    }
    return;
  }
  const gueltig = feld.checkValidity();
  zeige(feld, gueltig, feld.dataset.fehler || satzZu(feld));
};

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.(FELDER) ? [wurzel] : []), ...wurzel.querySelectorAll(FELDER)];
  for (const feld of treffer) {
    if (fertig.has(feld)) continue;
    fertig.add(feld);
    if (feld.willValidate && feld.closest('.feld')) meldungVon(feld);
  }
}
einrichten(document);

document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));

document.addEventListener('focusout', (e) => {
  const feld = e.target.closest?.(FELDER);
  if (feld) pruefe(feld);
});

document.addEventListener('input', (e) => {
  const feld = e.target.closest?.(FELDER);
  if (feld && feld.getAttribute('aria-invalid') === 'true') pruefe(feld);
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement) || form.hasAttribute('data-nicht-pruefen')) return;
  if (e.submitter?.hasAttribute('formnovalidate')) return;
  const felder = [...form.querySelectorAll(FELDER)];
  felder.forEach(pruefe);
  const erstes = felder.find((f) => f.willValidate && !f.checkValidity());
  if (!erstes) return;
  e.preventDefault();
  felder.filter((f) => f.willValidate && !f.checkValidity()).forEach(schuettle);
  erstes.focus();
});

const schuettle = (feld) => window.Bewegung?.schuetteln(feld.closest('.feld__eingabe') || feld);
document.addEventListener('invalid', (e) => { const f = e.target.closest?.(FELDER); if (f) schuettle(f); }, true);
})();

} catch (fehler) { console.warn("marke.js · system/feld-pruefen.js", fehler); } }

/* system/bewegung.js */
{ try {
(() => {
'use strict';
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const token = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const ms = (n) => { const v = token(n); return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000 || 0; };
const zahlText = (n) => { const x = Math.round(Number(n) || 0); return (x < 0 ? '−' : '') + String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, "'"); };
const zahlVon = (t) => Number(String(t || '').replace(/[^\d.\-−]/g, '').replace('−', '-')) || 0;

const GRENZE = 100;
const vorgemerkt = new Map();
const imBild = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
const schluessel = (el) => (el.closest('[data-tabelle]')?.dataset.tabelle || '') + '|' + el.dataset.id;
let angehalten = 0;
function lagen(wurzel) {
  const m = new Map();
  for (const el of wurzel.querySelectorAll('[data-id]')) {
    const r = el.getBoundingClientRect();
    if (r.width && imBild(r)) m.set(schluessel(el), { r, art: el.tagName });
    if (m.size > GRENZE) return null;
  }
  return m;
}
function gleiten(wurzel, tun) {
  if (!wurzel || ruhig() || angehalten) { vorgemerkt.clear(); return tun(); }
  const vorher = lagen(wurzel);
  const erg = tun();
  if (!vorher) { vorgemerkt.clear(); return erg; }
  const dauer = ms('--t-base'), kurve = token('--ease'), ankunft = token('--ease-ankunft');
  const gesehen = new Set();
  for (const el of wurzel.querySelectorAll('[data-id]')) {
    const id = el.dataset.id, k = schluessel(el); if (gesehen.has(k)) continue; gesehen.add(k);
    const neu = el.getBoundingClientRect(); if (!neu.width || !imBild(neu)) continue;
    const gemerkt = vorgemerkt.get(id), v = vorher.get(k);
    if (!gemerkt && (!v || v.art !== el.tagName)) continue;
    const alt = gemerkt || v.r;
    const dx = alt.left - neu.left, dy = alt.top - neu.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    if (gemerkt) {
      el.animate([{ transform: `translate(${dx}px, ${dy}px) rotate(2deg)` }, { transform: 'none' }],
        { duration: dauer, easing: ankunft });
    } else if (Math.abs(dx) > 120) {
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` },
        { transform: `translate(${dx / 2}px, ${dy / 2 - 24}px)`, offset: .5 }, { transform: 'none' }],
        { duration: ms('--t-slow'), easing: kurve });
    } else {
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: dauer, easing: kurve });
    }
  }
  const neu = [];
  const bleibt = [...wurzel.querySelectorAll('[data-id]')].some(el => vorher.has(schluessel(el)));
  for (const el of bleibt ? wurzel.querySelectorAll('[data-id]') : []) {
    const k = schluessel(el); if (vorher.has(k) || vorgemerkt.has(el.dataset.id)) continue;
    const r = el.getBoundingClientRect(); if (r.width && imBild(r)) neu.push(el);
    if (neu.length > 20) break;
  }
  if (vorher.size && neu.length && neu.length <= 20) for (const el of neu)
    el.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: dauer, easing: kurve });
  vorgemerkt.clear();
  return erg;
}
const merke = (id, rect) => { if (id && rect) vorgemerkt.set(String(id), rect); };

const laufend = new WeakMap();
function zaehlen(el, bis, o = {}) {
  if (!el) return;
  const format = o.format || zahlText, von = o.von ?? 0;
  cancelAnimationFrame(laufend.get(el));
  if (ruhig()) { el.textContent = format(bis); return; }
  const dauer = o.dauer || ms('--t-slow') * 2, t0 = performance.now();
  const schritt = (t) => {
    const p = Math.min(1, (t - t0) / dauer), e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(von + (bis - von) * e);
    if (p < 1) laufend.set(el, requestAnimationFrame(schritt));
  };
  laufend.set(el, requestAnimationFrame(schritt));
}
function wert(el, neu, o = {}) {
  if (!el) return;
  const format = o.format || zahlText, alt = o.von ?? zahlVon(el.textContent);
  if (alt === neu) return;
  zaehlen(el, neu, { ...o, von: alt, format, dauer: ms('--t-slow') });
  const zustand = (neu > alt) === !o.wenigerIstBesser ? 'pass' : 'fail';
  puls(o.flaeche || el, zustand);
  if (o.differenz === false) return;
  el.parentElement?.querySelector(':scope > .bewegung-differenz')?.remove();
  const d = document.createElement('span');
  d.className = 'bewegung-differenz'; d.dataset.zustand = zustand;
  d.textContent = (neu > alt ? '+ ' : '− ') + format(Math.abs(neu - alt));
  el.after(d);
  d.addEventListener('animationend', () => d.remove());
  if (ruhig()) setTimeout(() => d.remove(), ms('--t-lang') * 2);
}

const KENNZAHL = '.zahl > b, .kennzahlen dd';
const kennStand = new Map();
const zahlFormat = (dez) => (n) => { const x = Number(n) || 0, [g, d] = Math.abs(x).toFixed(dez).split('.');
  return (x < 0 ? '−' : '') + g.replace(/\B(?=(\d{3})+(?!\d))/g, "'") + (d ? '.' + d : ''); };
function zahlSpanne(el) {
  const da = el.querySelector(':scope > .bewegung-zahl'); if (da) return da;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.parentElement.closest('small')) continue;
    const m = n.data.match(/−?\d[\d']*(\.\d+)?/); if (!m) continue;
    const z = n.splitText(m.index); z.splitText(m[0].length);
    const s = document.createElement('span'); s.className = 'bewegung-zahl'; s.textContent = m[0]; z.replaceWith(s);
    return s;
  }
  return null;
}
function kennzahlen(wurzel, wahl = KENNZAHL) {
  if (!wurzel) return;
  const jetzt = performance.now();
  for (const el of wurzel.querySelectorAll(wahl)) {
    const box = el.closest('.zahl, dl > div') || el.parentElement;
    const name = (box.querySelector(':scope > span, :scope > dt')?.textContent || '').replace(/[\d'.]+/g, '#').trim(); if (!name) continue;
    const s = zahlSpanne(el); if (!s) continue;
    const neu = zahlVon(s.textContent), dez = (s.textContent.split('.')[1] || '').length, format = zahlFormat(dez);
    const k = (wurzel.id || '') + '|' + name, alt = kennStand.get(k);
    if (!alt) { kennStand.set(k, { wert: neu, seit: jetzt }); zaehlen(s, neu, { format }); continue; }
    if (alt.wert !== neu) {
      if (jetzt - alt.seit < 2500) zaehlen(s, neu, { von: alt.wert, format });
      else wert(s, neu, { von: alt.wert, format, flaeche: box });
    }
    alt.wert = neu;
  }
}

const neuStarten = (el, klasse) => { el.classList.remove(klasse); void el.offsetWidth; el.classList.add(klasse); };
function puls(el, zustand = 'pass') {
  if (!el) return;
  el.dataset.pulsZustand = zustand;
  neuStarten(el, 'bewegung-puls');
  el.addEventListener('animationend', () => el.classList.remove('bewegung-puls'), { once: true });
}
function schuetteln(el) {
  if (!el || ruhig()) return;
  neuStarten(el, 'bewegung-schuetteln');
  el.addEventListener('animationend', () => el.classList.remove('bewegung-schuetteln'), { once: true });
}

const VENDOR = new URL('vendor/', document.currentScript?.src || (new Error().stack?.match(/https?:\/\/[^\s)]+?\.js/) || [])[0] || location.href);
let konfetti = null;
const ladeKonfetti = () => (konfetti ??= import(new URL('canvas-confetti-1.9.4.module.mjs', VENDOR).href).then((m) => m.create));
let letzteGrosse = 0, letzteKleine = 0, zeiger = null;
document.addEventListener('pointerdown', (e) => { zeiger = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
function feiern(quelle, stufe = 'klein') {
  if (ruhig()) return;
  const jetzt = performance.now();
  if (stufe === 'klein' && (jetzt - letzteGrosse < 600 || jetzt - letzteKleine < 1000)) return;
  if (stufe === 'klein') letzteKleine = jetzt;
  if (stufe === 'gross') letzteGrosse = jetzt;
  let x = innerWidth / 2, y = innerHeight / 2;
  if (quelle instanceof Element) { const r = quelle.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  else if (quelle && 'x' in quelle) ({ x, y } = quelle);
  else if (zeiger && jetzt - zeiger.t < 3000) ({ x, y } = zeiger);
  const gross = stufe === 'gross';
  const farben = (gross ? ['--ton-1', '--ton-2', '--ton-3', '--ton-4', '--ton-5', '--ton-6', '--ink'] : ['--state-pass', '--ton-2', '--ton-6']).map(token).filter(Boolean);
  const c = document.createElement('canvas');
  c.className = 'bewegung-konfetti'; c.setAttribute('aria-hidden', 'true'); c.popover = 'manual';
  document.body.append(c); try { c.showPopover(); } catch (_) {}
  ladeKonfetti()
    .then((erzeuge) => erzeuge(c, { resize: true })({
      particleCount: gross ? 120 : 14, spread: gross ? 100 : 60, startVelocity: gross ? 45 : 20,
      colors: farben, origin: { x: x / innerWidth, y: y / innerHeight }, disableForReducedMotion: true,
    }))
    .catch(() => {})
    .finally(() => c.remove());
}

function ueberblenden(tun) {
  if (!document.startViewTransition || ruhig()) return tun();
  const v = document.startViewTransition(async () => { angehalten++; try { await tun(); } finally { angehalten--; } });
  v.ready.catch(() => {});
  return v.updateCallbackDone;
}
const gestaffelt = new Set();
function staffel(wurzel, schluessel) {
  if (!wurzel || gestaffelt.has(schluessel)) return;
  const kinder = [...wurzel.querySelectorAll('[data-id]')].slice(0, 15);
  if (!kinder.length) return;
  gestaffelt.add(schluessel);
  if (ruhig()) return;
  kinder.forEach((k, i) => { k.style.setProperty('--bewegung-i', i); k.classList.add('bewegung-staffel'); });
  setTimeout(() => kinder.forEach(k => k.classList.remove('bewegung-staffel')), ms('--t-base') + 15 * ms('--t-sofort') / 4);
}

document.addEventListener('click', async (e) => {
  const b = e.target.closest?.('[data-kopieren]'); if (!b || b.dataset.kopiert) return;
  try { await navigator.clipboard.writeText(b.dataset.kopieren); } catch (_) { return; }
  b.dataset.kopiert = ''; b.style.minWidth = b.offsetWidth + 'px';
  setTimeout(() => { delete b.dataset.kopiert; b.style.minWidth = ''; }, ms('--t-lang'));
});

document.addEventListener('click', (e) => {
  const s = e.target.closest?.('.stern'); if (!s || ruhig() || s.getAttribute('aria-pressed') === 'true') return;
  requestAnimationFrame(() => s.isConnected && s.querySelector('svg')?.animate([{ transform: 'scale(.86)' }, { transform: 'none' }],
    { duration: ms('--t-base'), easing: token('--ease-ankunft') }));
});


let zug = null;
const nachKlick = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
function ziehen(e, el, o = {}) {
  if (zug || e.button !== 0) return;
  const start = { x: e.clientX, y: e.clientY, eltern: el.parentElement, danach: el.nextElementSibling };
  zug = { el, o, los: false, start, pid: e.pointerId };
  const achse = o.achse || 'y', kinder = o.kinder || ((b) => [...b.children].filter(k => k !== el));
  const setze = o.setze || ((b, vor, x) => b.insertBefore(x, vor));
  let bild = null, versatz = null, behaelter = null, rollUhr = 0, zeigerY = 0;
  const bewege = (ev) => {
    if (ev.pointerId !== zug?.pid) return;
    if (!zug.los) {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
      zug.los = true;
      const r = el.getBoundingClientRect(); versatz = { x: start.x - r.left, y: start.y - r.top };
      bild = o.bild ? o.bild(el) : el.cloneNode(true);
      bild.classList.add('zieh-bild'); if (o.kippen) bild.classList.add('zieh-bild--kippt');
      bild.removeAttribute('id'); bild.setAttribute('aria-hidden', 'true');
      Object.assign(bild.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px', right: 'auto', bottom: 'auto' });
      document.body.append(bild); try { bild.popover = 'manual'; bild.showPopover(); } catch (_) {}
      el.classList.add('wird-gezogen'); document.documentElement.setAttribute('data-zieht-karte', '');
      document.querySelectorAll('.vorschaukarte--schwebt:popover-open').forEach(k => k.hidePopover());
      getSelection()?.removeAllRanges();
      const rollen = () => { if (!zug) return;
        const rand = 48, v = zeigerY < rand ? -(rand - zeigerY) / 3 : zeigerY > innerHeight - rand ? (zeigerY - innerHeight + rand) / 3 : 0;
        if (v) window.scrollBy({ top: v, behavior: 'instant' }); rollUhr = requestAnimationFrame(rollen); };
      rollUhr = requestAnimationFrame(rollen);
    }
    ev.preventDefault(); zeigerY = ev.clientY;
    bild.style.left = (ev.clientX - versatz.x) + 'px'; bild.style.top = (ev.clientY - versatz.y) + 'px';
    const b = o.behaelter?.(ev.clientX, ev.clientY);
    if (b !== behaelter) { behaelter?.removeAttribute('data-ziel'); behaelter = b; b?.setAttribute('data-ziel', ''); }
    if (!b) return;
    const p = achse === 'y' ? ev.clientY : ev.clientX, liste = kinder(b);
    const vor = liste.find(k => { const r = k.getBoundingClientRect();
      if (achse === 'raster') return ev.clientY < r.top || (ev.clientY < r.bottom && ev.clientX < r.left + r.width / 2);
      return p < (achse === 'y' ? r.top + r.height / 2 : r.left + r.width / 2); }) || null;
    if (el.parentElement === b && (vor ? el.nextElementSibling === vor : !liste.some(k => k.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING))) return;
    if (vor === el) return;
    const bewegt = [...liste, ...kinder(el.parentElement), ...(o.mit?.() || [])];
    flipListe(bewegt, () => setze(b, vor, el));
  };
  const fertig = async (ev) => {
    if (ev && ev.pointerId !== zug?.pid) return;
    document.removeEventListener('pointermove', bewege); document.removeEventListener('pointerup', fertig);
    document.removeEventListener('pointercancel', abbruch); document.removeEventListener('keydown', taste);
    const z = zug; zug = null; cancelAnimationFrame(rollUhr);
    if (!z?.los) return;
    document.addEventListener('click', nachKlick, { capture: true, once: true });
    setTimeout(() => document.removeEventListener('click', nachKlick, true), 0);
    const abwurf = bild.getBoundingClientRect(); bild.remove();
    behaelter?.removeAttribute('data-ziel'); document.documentElement.removeAttribute('data-zieht-karte');
    const b = el.parentElement, index = kinder(b).filter(k => k.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).length;
    const gleich = b === start.eltern && el.nextElementSibling === start.danach;
    const zurueck = () => { if (!gleich) flipListe([...kinder(b), ...kinder(start.eltern), ...(o.mit?.() || [])], () => setze(start.eltern, start.danach, el)); };
    el.classList.remove('wird-gezogen');
    if (!ev) zurueck();
    lande(el, abwurf, o.kippen);
    let ok = true;
    if (ev && !gleich) { try { ok = await o.ende?.({ behaelter: b, index, gleich, abwurf }); } catch (err) { console.error(err); ok = false; } }
    if (ok === false && el.isConnected) { const r = el.getBoundingClientRect(); zurueck(); lande(el, r); }
  };
  const abbruch = () => fertig(null);
  const taste = (ev) => { if (ev.key === 'Escape') fertig(null); };
  document.addEventListener('pointermove', bewege); document.addEventListener('pointerup', fertig);
  document.addEventListener('pointercancel', abbruch); document.addEventListener('keydown', taste);
}
document.addEventListener('selectstart', (e) => {
  const el = e.target.nodeType === 3 ? e.target.parentElement : e.target;
  if (zug && !el?.closest?.('input, textarea, [contenteditable]')) e.preventDefault();
}, true);
function lande(el, von, gekippt) {
  if (ruhig() || !von) return; const n = el.getBoundingClientRect();
  el.animate([{ transform: `translate(${von.left - n.left}px, ${von.top - n.top}px)${gekippt ? ' rotate(2deg)' : ''}` }, { transform: 'none' }],
    { duration: ms('--t-base'), easing: token('--ease-ankunft') });
}
let marke = null;
function markiere(sel, dauer = ms('--t-lang') + ms('--t-slow')) {
  marke = { sel, bis: performance.now() + dauer };
  const schritt = () => { if (!marke) return;
    if (performance.now() > marke.bis) { for (const e of document.querySelectorAll('[data-gelandet]')) e.removeAttribute('data-gelandet'); marke = null; return; }
    for (const e of document.querySelectorAll(marke.sel)) if (!e.hasAttribute('data-gelandet')) e.setAttribute('data-gelandet', '');
    requestAnimationFrame(schritt); };
  schritt(); setTimeout(() => { if (marke && performance.now() > marke.bis) schritt(); }, dauer + 50);
}
function flipListe(els, tun) {
  if (ruhig()) return tun();
  const vorher = new Map([...new Set(els)].map(e => [e, e.getBoundingClientRect()]));
  tun();
  for (const [e, a] of vorher) { if (!e.isConnected) continue; const b = e.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms('--t-fast'), easing: token('--ease') }); }
}

const laeuft = new WeakSet();
async function besetzt(knopf, arbeit) {
  if (!knopf) return arbeit();
  if (laeuft.has(knopf) || knopf.getAttribute('aria-busy') === 'true') return;
  laeuft.add(knopf);
  const uhr = setTimeout(() => { knopf.setAttribute('aria-busy', 'true'); knopf.dataset.besetzt = '';
    if (!knopf.querySelector(':scope > .btn__ring')) knopf.insertAdjacentHTML('afterbegin', '<span class="btn__ring" aria-hidden="true"></span>'); }, ms('--t-fast'));
  try { return await arbeit(); }
  finally { laeuft.delete(knopf); clearTimeout(uhr); knopf.removeAttribute('aria-busy'); delete knopf.dataset.besetzt; knopf.querySelector(':scope > .btn__ring')?.remove(); }
}

document.addEventListener('click', (e) => {
  const f = e.target.closest?.('[data-bewegung-feiern]');
  if (f) feiern(f, f.dataset.bewegungFeiern === 'gross' ? 'gross' : 'klein');
  const w = e.target.closest?.('[data-bewegung-wert]'), ziel = w && document.querySelector(w.dataset.bewegungWert);
  if (ziel) wert(ziel, zahlVon(ziel.textContent) + Number(w.dataset.schritt || 1));
});

window.Bewegung = { gleiten, merke, ziehen, lande, markiere, flipListe, zaehlen, wert, kennzahlen, besetzt, puls, schuetteln, feiern, ueberblenden, staffel, ruhig, GRENZE };
})();

} catch (fehler) { console.warn("marke.js · system/bewegung.js", fehler); } }

/* system/beziehungsgraph.js */
{ try {
(() => {
const STANDARD_ARTEN = [
  { typ: 'kontakte', name: 'Kontakte', einzahl: 'Kontakt', form: 'kreis' },
  { typ: 'unternehmen', name: 'Unternehmen', einzahl: 'Unternehmen', form: 'quadrat' },
  { typ: 'vorhaben', name: 'Projekte', einzahl: 'Projekt', form: 'raute' },
  { typ: 'aufgaben', name: 'Aufgaben', einzahl: 'Aufgabe', form: 'dreieck' },
];
const ALPHA_MIN = 0.001, ALPHA_ABKLINGEN = 1 - Math.pow(ALPHA_MIN, 1 / 300), BREMSE = 0.6;
const ABSTOSSUNG = -120, THETA2 = 0.81, ZUG_MITTE = 0.05, KANTE_LAENGE = 48;
const HITZE_ZIEHEN = 0.12;
const K_MIN = 0.08, K_MAX = 6;
const ZOOM_NAMEN = 0.9, ZOOM_NAMEN_VOLL = 1.3, GROSS_AB = 6, KNOTEN_GROSS = 8;
const SCHRIFT = 12, NAME_HOEHE = 15, NAMEN_MAX = 400;
const NAMEN_HOVER = 40;
const BLENDE_MS = 140, FAHRT_MS = 260;
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const norm = (s) => String(s ?? '').toLocaleLowerCase('de-CH').normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const zahl = (n) => n.toLocaleString('de-CH');


function baum(knoten) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of knoten) { if (n.x < x0) x0 = n.x; if (n.x > x1) x1 = n.x; if (n.y < y0) y0 = n.y; if (n.y > y1) y1 = n.y; }
  const seite = Math.max(x1 - x0, y1 - y0, 1);
  const wurzel = { x0, y0, s: seite, m: 0, cx: 0, cy: 0, kinder: null, punkt: null };
  const setze = (z, n, tiefe) => {
    if (!z.kinder && !z.punkt) { z.punkt = n; return; }
    if (!z.kinder) {
      if (tiefe > 24) { z.mehr = (z.mehr || []); z.mehr.push(n); return; }
      z.kinder = [null, null, null, null];
      const alt = z.punkt; z.punkt = null;
      setze(z, alt, tiefe);
    }
    const h = z.s / 2, i = (n.x >= z.x0 + h ? 1 : 0) + (n.y >= z.y0 + h ? 2 : 0);
    if (!z.kinder[i]) z.kinder[i] = { x0: z.x0 + (i & 1 ? h : 0), y0: z.y0 + (i & 2 ? h : 0), s: h, m: 0, cx: 0, cy: 0, kinder: null, punkt: null };
    setze(z.kinder[i], n, tiefe + 1);
  };
  for (const n of knoten) setze(wurzel, n, 0);
  const summe = (z) => {
    if (z.punkt) { const extra = z.mehr || []; z.m = 1 + extra.length; z.cx = (z.punkt.x + extra.reduce((s, n) => s + n.x, 0)) / z.m; z.cy = (z.punkt.y + extra.reduce((s, n) => s + n.y, 0)) / z.m; return; }
    if (!z.kinder) return;
    let m = 0, cx = 0, cy = 0;
    for (const k of z.kinder) if (k) { summe(k); m += k.m; cx += k.cx * k.m; cy += k.cy * k.m; }
    z.m = m; z.cx = cx / m; z.cy = cy / m;
  };
  summe(wurzel);
  return wurzel;
}

function schritt(g) {
  const { knoten, kanten } = g;
  const a = g.alpha;
  for (const k of kanten) {
    const s = k.s, t = k.t;
    let dx = t.x + t.vx - s.x - s.vx || 1e-6, dy = t.y + t.vy - s.y - s.vy || 1e-6;
    let l = Math.sqrt(dx * dx + dy * dy);
    l = (l - KANTE_LAENGE) / l * a * k.staerke;
    dx *= l; dy *= l;
    t.vx -= dx * k.b; t.vy -= dy * k.b;
    s.vx += dx * (1 - k.b); s.vy += dy * (1 - k.b);
  }
  const wurzel = baum(knoten);
  for (const n of knoten) {
    const stapel = [wurzel];
    while (stapel.length) {
      const z = stapel.pop();
      if (!z.m) continue;
      const dx = z.cx - n.x, dy = z.cy - n.y;
      let d2 = dx * dx + dy * dy;
      if (z.punkt === n && !z.mehr) continue;
      if (!z.kinder || (z.s * z.s) / THETA2 < d2) {
        if (d2 < 1) d2 = 1;
        const w = ABSTOSSUNG * a * (z.punkt === n ? z.m - 1 : z.m) / d2;
        n.vx += dx * w; n.vy += dy * w;
        continue;
      }
      for (const k of z.kinder) if (k) stapel.push(k);
    }
  }
  for (const n of knoten) {
    n.vx -= n.x * ZUG_MITTE * a; n.vy -= n.y * ZUG_MITTE * a;
    if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; continue; }
    n.vx *= BREMSE; n.vy *= BREMSE;
    n.x += n.vx; n.y += n.vy;
  }
  g.alpha += (g.alphaZiel - g.alpha) * ALPHA_ABKLINGEN;
}


function aufbauen(daten) {
  const arten = (daten.arten?.length ? daten.arten : STANDARD_ARTEN).map((a, i) => ({ ...a, reihe: i + 1, an: true }));
  const artVon = new Map(arten.map((a) => [a.typ, a]));
  const alle = [], nachSchluessel = new Map(), nachId = new Map();
  (daten.knoten || []).forEach((k, i) => {
    const art = artVon.get(k.typ) || arten[0];
    const r = 10 * Math.sqrt(0.5 + i), w = i * Math.PI * (3 - Math.sqrt(5));
    const n = { ...k, schluessel: `${k.typ}:${k.id}`, art, x: r * Math.cos(w), y: r * Math.sin(w), vx: 0, vy: 0, nachbarn: new Set(), such: norm(k.name) };
    alle.push(n);
    nachSchluessel.set(n.schluessel, n);
    nachId.set(String(k.id), nachId.has(String(k.id)) ? null : n);
  });
  const finde = (s) => nachSchluessel.get(String(s)) || nachId.get(String(s)) || null;
  const kanten = [];
  for (const k of daten.kanten || []) {
    const [von, nach] = Array.isArray(k) ? k : [k.von, k.nach];
    const s = finde(von), t = finde(nach);
    if (!s || !t || s === t || s.nachbarn.has(t)) continue;
    s.nachbarn.add(t); t.nachbarn.add(s);
    kanten.push({ s, t });
  }
  for (const k of kanten) {
    const a = k.s.nachbarn.size, b = k.t.nachbarn.size;
    k.staerke = 1 / Math.min(a, b);
    k.b = a / (a + b);
  }
  for (const n of alle) n.r = Math.min(20, 3.5 + Math.sqrt(n.nachbarn.size) * 1.7);
  const nachGrad = [...alle].sort((a, b) => b.nachbarn.size - a.nachbarn.size);
  return { daten, arten, alle, knoten: alle, kanten, nachGrad, finde, alpha: 1, alphaZiel: 0 };
}

function sichtbarSetzen(g) {
  g.knoten = g.nurVerbunden ? g.alle.filter((n) => n.nachbarn.size) : g.alle;
  g.lose = g.alle.length - g.alle.filter((n) => n.nachbarn.size).length;
  g.drin = g.nurVerbunden ? new Set(g.knoten) : null;
}
const imSpiel = (g, n) => !g.drin || g.drin.has(n);


function farben(g) {
  const probe = g.probe;
  const lies = (wert) => { probe.style.color = wert; return getComputedStyle(probe).color; };
  g.farbe = {
    ink: lies('var(--ink)'), leise: lies('var(--ink-muted)'), kante: lies('var(--border-strong)'),
    flaeche: lies('var(--surface-base)'), akzent: lies('var(--accent)'), fokus: lies('var(--focus)'),
    art: g.arten.map((a) => lies(`var(--dia-${((a.reihe - 1) % 6) + 1})`)),
  };
  g.schrift = getComputedStyle(g.el).fontFamily;
  g.breiten = new Map();
}

function form(ctx, f, x, y, r) {
  if (f === 'quadrat') { const s = r * 0.9; ctx.rect(x - s, y - s, s * 2, s * 2); return; }
  if (f === 'raute') { const s = r * 1.2; ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); return; }
  if (f === 'dreieck') { const s = r * 1.25; ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.94, y + s * 0.6); ctx.lineTo(x - s * 0.94, y + s * 0.6); ctx.closePath(); return; }
  ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
}

function blende(g, an) {
  const ziel = an ? 1 : 0;
  if (reduziert()) { g.blend = ziel; g.blendZeit = 0; return false; }
  if (g.blend === ziel) { g.blendZeit = 0; return false; }
  const jetzt = performance.now();
  const dt = g.blendZeit ? Math.min(50, jetzt - g.blendZeit) : 16;
  g.blend = ziel ? Math.min(1, g.blend + dt / BLENDE_MS) : Math.max(0, g.blend - dt / BLENDE_MS);
  g.blendZeit = g.blend === ziel ? 0 : jetzt;
  return g.blend !== ziel;
}

function zeichne(g) {
  g.wartet = false;
  const { ctx, knoten, kanten, kam, farbe } = g;
  const b = g.breite, h = g.hoehe, dpr = g.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, b, h);
  ctx.setTransform(dpr * kam.k, 0, 0, dpr * kam.k, dpr * kam.x, dpr * kam.y);

  const jetzt = g.zeiger || g.gewaehlt;
  if (jetzt) g.altFokus = jetzt;
  const mehr = blende(g, !!jetzt);
  const fokus = jetzt || (g.blend > 0 ? g.altFokus : null);
  const hervor = fokus ? new Set([fokus, ...fokus.nachbarn]) : null;
  const treffer = g.treffer;
  const sichtbar = (n) => n.art.an && imSpiel(g, n);
  const leuchtet = (n) => (hervor ? hervor.has(n) : treffer ? treffer.has(n) : true);
  const blass = hervor ? 1 - 0.82 * g.blend : 0.18;

  const basis = knoten.length > 300 ? 0.3 : 0.55;
  ctx.lineWidth = 1 / kam.k;
  ctx.strokeStyle = farbe.kante;
  ctx.globalAlpha = hervor ? basis + (0.1 - basis) * g.blend : treffer ? 0.1 : basis;
  ctx.beginPath();
  for (const k of kanten) {
    if (!sichtbar(k.s) || !sichtbar(k.t)) continue;
    if (hervor && (k.s === fokus || k.t === fokus)) continue;
    ctx.moveTo(k.s.x, k.s.y); ctx.lineTo(k.t.x, k.t.y);
  }
  ctx.stroke();
  if (g.nurArt) {
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    for (const k of kanten) if (!k.s.art.an || !k.t.art.an) { ctx.moveTo(k.s.x, k.s.y); ctx.lineTo(k.t.x, k.t.y); }
    ctx.stroke();
  }
  if (hervor) {
    ctx.globalAlpha = 0.25 + 0.75 * g.blend;
    ctx.strokeStyle = farbe.akzent;
    ctx.lineWidth = 1.5 / kam.k;
    ctx.beginPath();
    for (const n of fokus.nachbarn) if (sichtbar(n)) { ctx.moveTo(fokus.x, fokus.y); ctx.lineTo(n.x, n.y); }
    ctx.stroke();
  }

  for (const art of g.arten) {
    ctx.fillStyle = farbe.art[art.reihe - 1];
    for (const hell of [false, true]) {
      if (!art.an && hell) continue;
      ctx.globalAlpha = !art.an ? 0.1 : hell ? 1 : blass;
      ctx.beginPath();
      let leer = true;
      for (const n of knoten) {
        if (n.art !== art || (art.an && leuchtet(n) !== hell)) continue;
        form(ctx, art.form, n.x, n.y, Math.max(n.r, 2.5 / kam.k));
        leer = false;
      }
      if (!leer) ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (g.gewaehlt && sichtbar(g.gewaehlt)) {
    ctx.strokeStyle = farbe.fokus;
    ctx.lineWidth = 2.5 / kam.k;
    ctx.beginPath();
    form(ctx, g.gewaehlt.art.form, g.gewaehlt.x, g.gewaehlt.y, g.gewaehlt.r + 3 / kam.k);
    ctx.stroke();
  }

  namen(g, jetzt, sichtbar);
  if (mehr) bitte(g);
}

function namen(g, fokus, sichtbar) {
  const { ctx, kam, farbe, dpr } = g;
  const b = g.breite, h = g.hoehe, k = kam.k;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = farbe.flaeche;
  ctx.fillStyle = farbe.ink;

  let liste, deckung = () => 1;
  if (fokus) {
    liste = [fokus, ...[...fokus.nachbarn].sort((x, y) => y.nachbarn.size - x.nachbarn.size)];
  } else if (g.treffer) {
    liste = g.nachGrad.filter((n) => g.treffer.has(n));
  } else {
    const wenige = g.knoten.length <= 60;
    const anteil = Math.min(1, Math.max(0, (k - ZOOM_NAMEN) / (ZOOM_NAMEN_VOLL - ZOOM_NAMEN)));
    const gross = (n) => n.r * k >= GROSS_AB || n.nachbarn.size >= KNOTEN_GROSS;
    liste = g.nachGrad.filter((n) => wenige || k >= ZOOM_NAMEN || gross(n));
    deckung = (n) => (wenige || gross(n) ? 1 : anteil);
  }

  const ZELLE = 120, belegt = new Map();
  const frei = (x0, y0, x1, y1) => {
    for (let cx = Math.floor(x0 / ZELLE); cx <= Math.floor(x1 / ZELLE); cx++) {
      for (let cy = Math.floor(y0 / ZELLE); cy <= Math.floor(y1 / ZELLE); cy++) {
        const feld = belegt.get(cx * 4096 + cy);
        if (feld) for (const r of feld) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false;
      }
    }
    return true;
  };
  const belege = (r) => {
    for (let cx = Math.floor(r[0] / ZELLE); cx <= Math.floor(r[2] / ZELLE); cx++) {
      for (let cy = Math.floor(r[1] / ZELLE); cy <= Math.floor(r[3] / ZELLE); cy++) {
        const s = cx * 4096 + cy;
        if (!belegt.has(s)) belegt.set(s, []);
        belegt.get(s).push(r);
      }
    }
  };

  const normal = `${SCHRIFT}px ${g.schrift}`, fett = `600 ${SCHRIFT}px ${g.schrift}`;
  let anzahl = 0;
  g.namenGezeigt = 0;
  g.namenFehlen = 0;
  const drin = (lx, ly, w) => lx >= 2 && lx + w <= b - 2 && ly >= 0 && ly + NAME_HOEHE <= h;
  const passt = (lx, ly, w) => drin(lx, ly, w) && frei(lx - 3, ly - 1, lx + w + 3, ly + NAME_HOEHE);
  const fx = fokus ? fokus.x * k + kam.x : 0, fy = fokus ? fokus.y * k + kam.y : 0;
  const fuehrung = [];
  const haufen = (n, rr) => {
    if (n.nachbarn.size < KNOTEN_GROSS) return rr;
    const d = [...n.nachbarn].filter(sichtbar).map((m) => Math.hypot(m.x - n.x, m.y - n.y) * k).sort((p, q) => p - q);
    return d.length ? Math.max(rr, d[Math.floor(d.length * 0.8)] + 6) : rr;
  };
  const sichtNachbarn = fokus ? [...fokus.nachbarn].filter(sichtbar).length : 0;
  const reserviert = fokus && sichtNachbarn > 0 ? ` +${sichtNachbarn} weitere` : '';
  let gesetzt = 0;
  const reste = [];
  for (const n of liste) {
    if (!sichtbar(n)) continue;
    const a = deckung(n);
    if (a <= 0.02) continue;
    const x = n.x * k + kam.x, y = n.y * k + kam.y, rr = Math.max(n.r * k, 2.5) + 3;
    if (x < -160 || x > b + 160 || y < -NAME_HOEHE - rr || y > h + rr) continue;
    const istFokus = n === fokus;
    if (fokus && !istFokus && gesetzt >= NAMEN_HOVER) { reste.push(n); continue; }
    ctx.font = istFokus ? fett : normal;
    let w = istFokus ? null : g.breiten.get(n);
    if (w == null) { w = ctx.measureText(n.name + (istFokus ? reserviert : '')).width; if (!istFokus) g.breiten.set(n, w); }
    const rh = istFokus || n.nachbarn.size >= KNOTEN_GROSS ? haufen(n, rr) : rr;
    const lagen = [[x - w / 2, y + rh], [x - w / 2, y - rh - NAME_HOEHE + 2], [x + rh, y - NAME_HOEHE / 2], [x - rh - w, y - NAME_HOEHE / 2]];
    if (rh > rr) lagen.push([x - w / 2, y + rr], [x - w / 2, y - rr - NAME_HOEHE + 2], [x + rr, y - NAME_HOEHE / 2], [x - rr - w, y - NAME_HOEHE / 2]);
    let lage = null, linie = null;
    for (const [lx, ly] of lagen) {
      if (passt(lx, ly, w)) { lage = [lx, ly]; break; }
    }
    if (!lage && fokus) {
      const w0 = istFokus ? Math.PI / 2 : Math.atan2(y - fy, x - fx);
      suche: for (const dist of [rr + 14, rr + 34, rr + 60, rr + 92, rr + 132, rr + 180]) {
        for (let i = 0; i < 16; i++) {
          const ang = w0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, cs = Math.cos(ang), sn = Math.sin(ang);
          const lx = x + cs * dist - w / 2 + cs * w / 2, ly = y + sn * dist - NAME_HOEHE / 2 + sn * NAME_HOEHE / 2;
          if (!passt(lx, ly, w)) continue;
          lage = [lx, ly];
          const sx = x + cs * (rr - 3);
          const sy = y + sn * (rr - 3);
          linie = [sx, sy, Math.max(lx, Math.min(lx + w, sx)), Math.max(ly, Math.min(ly + NAME_HOEHE, sy))];
          break suche;
        }
      }
    }
    if (!lage && istFokus) lage = [Math.max(2, Math.min(b - w - 2, lagen[0][0])), Math.max(0, Math.min(h - NAME_HOEHE, lagen[0][1]))];
    if (!lage) { if (fokus) reste.push(n); continue; }
    belege([lage[0] - 3, lage[1] - 1, lage[0] + w + 3, lage[1] + NAME_HOEHE]);
    if (istFokus) { g.fokusLage = { lage, w, reserviert }; }
    else {
      if (linie) fuehrung.push(linie);
      ctx.globalAlpha = a;
      ctx.strokeText(n.name, lage[0], lage[1]);
      ctx.fillText(n.name, lage[0], lage[1]);
      gesetzt++;
    }
    if (++anzahl >= NAMEN_MAX) break;
  }
  if (fokus && g.fokusLage) {
    const fl = g.fokusLage, rest = sichtNachbarn - gesetzt;
    ctx.font = fett;
    const text = fokus.name + (rest > 0 ? ` +${rest} weitere` : '');
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.strokeText(text, fl.lage[0] + fl.w / 2, fl.lage[1]);
    ctx.fillText(text, fl.lage[0] + fl.w / 2, fl.lage[1]);
    ctx.textAlign = 'left';
    g.fokusLage = null;
    g.namenFehlen = Math.max(0, rest);
  }
  if (fuehrung.length) {
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = farbe.leise;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const l of fuehrung) { ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  g.namenGezeigt = anzahl;
}

function bitte(g) {
  if (g.wartet || g.ersetzt) return;
  g.wartet = true;
  requestAnimationFrame(() => zeichne(g));
}

function lauf(g) {
  if (g.laeuft) return;
  g.laeuft = true;
  const takt = () => {
    if (g.ersetzt) { g.laeuft = false; return; }
    const proBild = reduziert() ? 400 : 1;
    for (let i = 0; i < proBild && (g.alpha >= ALPHA_MIN || g.alphaZiel); i++) schritt(g);
    if (g.folgen && !g.kamZiel) einpassen(g, false);
    zeichne(g);
    if (g.alpha >= ALPHA_MIN || g.alphaZiel) requestAnimationFrame(takt);
    else g.laeuft = false;
  };
  requestAnimationFrame(takt);
}


function rahmen(g) {
  const liste = g.knoten.filter((n) => n.art.an);
  if (!liste.length || !g.breite) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of liste) { x0 = Math.min(x0, n.x - n.r); x1 = Math.max(x1, n.x + n.r); y0 = Math.min(y0, n.y - n.r); y1 = Math.max(y1, n.y + n.r + 16); }
  const rand = 24;
  const k = Math.max(K_MIN, Math.min(2, (g.breite - rand * 2) / (x1 - x0 || 1), (g.hoehe - rand * 2) / (y1 - y0 || 1)));
  return { k, x: g.breite / 2 - (x0 + x1) / 2 * k, y: g.hoehe / 2 - (y0 + y1) / 2 * k };
}

function einpassen(g, ruck = true, sanft = false) {
  const ziel = rahmen(g);
  if (!ziel) return;
  if (sanft && !g.laeuft) { fahre(g, ziel); return; }
  g.kam = ziel;
  if (ruck) bitte(g);
}

function fahre(g, ziel) {
  halt(g);
  if (reduziert() || !g.breite) { g.kam = ziel; zeigerNeu(g); bitte(g); return; }
  const von = g.kam, t0 = performance.now(), nr = g.fahrt;
  const mitte = (c) => ({ x: (g.breite / 2 - c.x) / c.k, y: (g.hoehe / 2 - c.y) / c.k });
  const m0 = mitte(von), m1 = mitte(ziel);
  g.kamZiel = ziel;
  const takt = (t) => {
    if (g.fahrt !== nr || g.ersetzt) return;
    const p = Math.min(1, (t - t0) / FAHRT_MS), e = 1 - Math.pow(1 - p, 3);
    const k = Math.exp(Math.log(von.k) + (Math.log(ziel.k) - Math.log(von.k)) * e);
    const mx = m0.x + (m1.x - m0.x) * e, my = m0.y + (m1.y - m0.y) * e;
    g.kam = { k, x: g.breite / 2 - mx * k, y: g.hoehe / 2 - my * k };
    if (p < 1) requestAnimationFrame(takt); else g.kamZiel = null;
    zeigerNeu(g);
    zeichne(g);
  };
  requestAnimationFrame(takt);
}
function halt(g) { g.fahrt = (g.fahrt || 0) + 1; g.kamZiel = null; }

function zoome(g, faktor, sx = g.breite / 2, sy = g.hoehe / 2, sanft = false) {
  const basis = sanft && g.kamZiel ? g.kamZiel : g.kam;
  const k = Math.max(K_MIN, Math.min(K_MAX, basis.k * faktor));
  const f = k / basis.k;
  const ziel = { k, x: sx - (sx - basis.x) * f, y: sy - (sy - basis.y) * f };
  g.folgen = false;
  if (sanft) { fahre(g, ziel); return; }
  halt(g);
  g.kam = ziel;
  zeigerNeu(g);
  bitte(g);
}

function zeige(g, n) {
  const x = n.x * g.kam.k + g.kam.x, y = n.y * g.kam.k + g.kam.y, rand = 48;
  if (x > rand && x < g.breite - rand && y > rand && y < g.hoehe - rand) return;
  g.folgen = false;
  fahre(g, { ...g.kam, x: g.breite / 2 - n.x * g.kam.k, y: g.hoehe / 2 - n.y * g.kam.k });
}

const welt = (g, sx, sy) => ({ x: (sx - g.kam.x) / g.kam.k, y: (sy - g.kam.y) / g.kam.k });
function treffe(g, sx, sy) {
  const p = welt(g, sx, sy), toleranz = 4 / g.kam.k;
  let best = null, bestD = Infinity;
  for (const n of g.knoten) {
    if (!n.art.an) continue;
    const d = Math.hypot(n.x - p.x, n.y - p.y) - Math.max(n.r * 1.2, 2.5 / g.kam.k);
    if (d < toleranz && d < bestD) { best = n; bestD = d; }
  }
  return best;
}


const anzahlVerb = (n) => (n === 1 ? 'eine Verbindung' : `${zahl(n)} Verbindungen`);
const artName = (n) => n.art.einzahl || n.art.name;

function melde(g) {
  const st = g.el.querySelector('.beziehungsgraph__stand');
  if (!st) return;
  const sichtbar = g.knoten.filter((n) => n.art.an).length;
  let text = `${zahl(sichtbar)} Knoten, ${anzahlVerb(g.kanten.filter((k) => k.s.art.an && k.t.art.an).length)}`;
  if (g.nurVerbunden && g.lose) text += `, ${zahl(g.lose)} ohne Verbindung ausgeblendet`;
  if (g.treffer) {
    text = `${zahl(g.treffer.size)} Treffer für «${g.q}»`;
    if (g.trefferLose) text += `, ${zahl(g.trefferLose)} ohne Verbindung ausgeblendet`;
  }
  if (g.gewaehlt) {
    const n = g.gewaehlt, nb = [...n.nachbarn].filter((x) => x.art.an);
    text = `${n.name}, ${artName(n)}, ${anzahlVerb(nb.length)}${nb.length ? `: ${nb.slice(0, 5).map((x) => x.name).join(', ')}${nb.length > 5 ? ' …' : ''}` : ''}`;
  }
  if (st.textContent !== text) st.textContent = text;
}

function zeigerNeu(g) {
  if (!g.maus || g.zieht) return;
  const n = treffe(g, g.maus.x, g.maus.y);
  g.canvas.classList.toggle('ist-zeigend', !!n);
  if (n !== g.zeiger) { g.zeiger = n; tooltip(g); }
}

function tooltip(g) {
  const n = g.zeiger;
  let text = '';
  if (n) {
    const nb = [...n.nachbarn].filter((x) => x.art.an && imSpiel(g, x)).sort((a, b) => b.nachbarn.size - a.nachbarn.size);
    text = `${n.name}, ${artName(n)}, ${anzahlVerb(nb.length)}${nb.length ? `: ${nb.map((x) => x.name).join(', ')}` : ''}`;
  }
  if (g.canvas.title !== text) { if (text) g.canvas.title = text; else g.canvas.removeAttribute('title'); }
}

function waehle(g, n) {
  g.gewaehlt = n && imSpiel(g, n) ? n : null;
  if (g.gewaehlt) zeige(g, g.gewaehlt);
  melde(g);
  bitte(g);
}

function oeffne(g, n) {
  g.el.dispatchEvent(new CustomEvent('beziehungsgraph-oeffnen', { bubbles: true, detail: { typ: n.typ, id: n.id } }));
}

function nachbarIn(g, dx, dy) {
  const von = g.gewaehlt;
  let best = null, bestW = Infinity;
  for (const n of g.knoten) {
    if (n === von || !n.art.an) continue;
    const ex = n.x - von.x, ey = n.y - von.y, d = Math.hypot(ex, ey) || 1e-6;
    const cos = (ex * dx + ey * dy) / d;
    if (cos < 0.5) continue;
    const w = d * (2 - cos) * (von.nachbarn.has(n) ? 0.7 : 1);
    if (w < bestW) { best = n; bestW = w; }
  }
  return best;
}

function suche(g, q) {
  g.q = q.trim();
  const s = norm(g.q);
  const passt = (n) => n.art.an && n.such.includes(s);
  g.treffer = s ? new Set(g.knoten.filter(passt)) : null;
  g.trefferLose = s && g.nurVerbunden ? g.alle.filter((n) => !n.nachbarn.size && passt(n)).length : 0;
  g.trefferI = -1;
  if (g.gewaehlt && g.treffer && !g.treffer.has(g.gewaehlt)) g.gewaehlt = null;
  melde(g);
  bitte(g);
}

function artenZeichnen(g) {
  const ort = g.el.querySelector('.beziehungsgraph__arten');
  if (!ort) return;
  const zaehle = (a) => g.knoten.filter((n) => !a || n.art === a).length;
  const name = `${g.el.id || 'beziehungsgraph'}-art`;
  const wahl = (wert, inhalt, anzahl) => `<label class="reiter__wahl"><input type="radio" name="${esc(name)}" value="${esc(wert)}" class="visually-hidden"${(g.nurArt || '') === wert ? ' checked' : ''}><span>${inhalt}<span class="reiter__zahl">${zahl(anzahl)}</span></span></label>`;
  ort.innerHTML = `<div class="reiter__leiste" role="radiogroup" aria-label="Art">${wahl('', 'Alle', zaehle(null))}${g.arten.map((a) => wahl(a.typ, `<span class="beziehungsgraph__form" data-form="${esc(a.form || 'kreis')}" data-reihe="${((a.reihe - 1) % 6) + 1}" aria-hidden="true"></span>${esc(a.name)}`, zaehle(a))).join('')}</div>`;
}

function nurArt(g, typ) {
  g.nurArt = typ || '';
  for (const a of g.arten) a.an = !typ || a.typ === typ;
  if (g.gewaehlt && !g.gewaehlt.art.an) g.gewaehlt = null;
  if (g.q) suche(g, g.q); else { melde(g); bitte(g); }
}

function verbundenKnopf(g) {
  let knopf = g.el.querySelector('.beziehungsgraph__verbunden');
  const leiste = g.el.querySelector('.beziehungsgraph__leiste');
  if (!knopf && leiste) {
    knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'btn btn--zwei btn--klein umschaltknopf beziehungsgraph__verbunden';
    knopf.textContent = 'Nur verbundene';
    leiste.insertBefore(knopf, leiste.querySelector('.beziehungsgraph__stand'));
  }
  if (knopf) knopf.setAttribute('aria-pressed', String(g.nurVerbunden));
}

function nurVerbunden(g, an, melden) {
  g.nurVerbunden = !!an;
  g.el.dataset.nurVerbunden = String(g.nurVerbunden);
  sichtbarSetzen(g);
  if (g.gewaehlt && !imSpiel(g, g.gewaehlt)) g.gewaehlt = null;
  if (g.zeiger && !imSpiel(g, g.zeiger)) g.zeiger = null;
  verbundenKnopf(g);
  artenZeichnen(g);
  leerZeigen(g);
  if (g.q) suche(g, g.q); else melde(g);
  g.alpha = Math.max(g.alpha, 0.5);
  g.folgen = true;
  halt(g);
  lauf(g);
  if (melden) g.el.dispatchEvent(new CustomEvent('beziehungsgraph-verbunden', { bubbles: true, detail: { an: g.nurVerbunden } }));
}


const GRAPH = new WeakMap();

function aufsetzen(el, daten) {
  const canvas = el.querySelector('.beziehungsgraph__bild');
  if (!canvas) return;
  const alt = GRAPH.get(el);
  if (alt) alt.ersetzt = true;
  const g = aufbauen(daten);
  Object.assign(g, {
    el, canvas, ctx: canvas.getContext('2d'), kam: { k: 1, x: 0, y: 0 }, folgen: true, blend: 0,
    breite: alt?.breite || 0, hoehe: alt?.hoehe || 0, dpr: alt?.dpr || 1, probe: alt?.probe,
    nurVerbunden: alt ? alt.nurVerbunden : el.dataset.nurVerbunden !== 'false',
  });
  if (!g.probe) {
    g.probe = document.createElement('span');
    g.probe.className = 'beziehungsgraph__probe';
    g.probe.setAttribute('aria-hidden', 'true');
    el.append(g.probe);
  }
  GRAPH.set(el, g);
  sichtbarSetzen(g);
  leerZeigen(g);
  farben(g);
  verbundenKnopf(g);
  artenZeichnen(g);
  const q = el.querySelector('.beziehungsgraph__suche input')?.value || '';
  if (q) suche(g, q); else melde(g);
  if (!g.breite) groesse(g);
  for (let i = 0; i < 40; i++) schritt(g);
  einpassen(g, false);
  lauf(g);
}

function leerZeigen(g) {
  const flaeche = g.el.querySelector('.beziehungsgraph__flaeche');
  if (!flaeche) return;
  let leer = flaeche.querySelector(':scope > .beziehungsgraph__leer');
  if (!g.knoten.length && !leer) {
    leer = document.createElement('div');
    leer.className = 'beziehungsgraph__leer';
    flaeche.append(leer);
  }
  if (!leer) return;
  leer.hidden = !!g.knoten.length;
  if (leer.hidden) return;
  const text = g.alle.length
    ? `<div class="leerzustand"><h4>Noch keine Verbindungen</h4><p>${zahl(g.alle.length)} Einträge stehen ohne Verbindung. «Nur verbundene» ausschalten zeigt sie als lose Punkte.</p><button type="button" class="btn btn--zwei btn--klein" data-beziehungsgraph-alle>Alle Einträge zeigen</button></div>`
    : '<div class="leerzustand"><h4>Noch keine Verbindungen</h4><p>Sobald Kontakte, Unternehmen, Projekte oder Aufgaben verknüpft sind, stehen sie hier als Netz.</p></div>';
  if (leer.innerHTML !== text) leer.innerHTML = text;
}

function groesse(g) {
  const r = g.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (!r.width) return;
  g.breite = r.width; g.hoehe = r.height; g.dpr = dpr;
  g.canvas.width = Math.round(r.width * dpr);
  g.canvas.height = Math.round(r.height * dpr);
  if (g.folgen) einpassen(g, false);
  zeichne(g);
}

function lies(el) {
  const quelle = el.querySelector(':scope > script[type="application/json"]');
  try { return quelle ? JSON.parse(quelle.textContent) : {}; } catch { console.error('Beziehungsgraph: Daten sind kein gültiges JSON', el); return {}; }
}

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.beziehungsgraph') ? [wurzel] : []), ...wurzel.querySelectorAll('.beziehungsgraph')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    aufsetzen(el, lies(el));
    const canvas = el.querySelector('.beziehungsgraph__bild');
    if (!canvas) continue;
    new ResizeObserver(() => { const g = GRAPH.get(el); if (g) groesse(g); }).observe(canvas);
    bedienen(el, canvas);
  }
}

function bedienen(el, canvas) {
  const zeiger = new Map();
  let zug = null;
  const punkt = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  canvas.addEventListener('pointerdown', (e) => {
    const g = GRAPH.get(el);
    if (!g || (e.button && e.pointerType === 'mouse')) return;
    canvas.setPointerCapture(e.pointerId);
    const p = punkt(e);
    zeiger.set(e.pointerId, p);
    if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; zug = { art: 'kneifen', d: Math.hypot(a.x - b.x, a.y - b.y), k: g.kam.k }; return; }
    const n = treffe(g, p.x, p.y);
    zug = { art: n ? 'knoten' : 'flaeche', n, start: p, kam: { ...g.kam }, gezogen: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    const g = GRAPH.get(el);
    if (!g) return;
    const p = punkt(e);
    if (zeiger.has(e.pointerId)) zeiger.set(e.pointerId, p);
    g.maus = p;
    if (!zug) {
      const n = treffe(g, p.x, p.y);
      canvas.classList.toggle('ist-zeigend', !!n);
      g.maus = p;
      if (n !== g.zeiger) { g.zeiger = n; tooltip(g); bitte(g); }
      return;
    }
    if (zug.art === 'kneifen' && zeiger.size === 2) {
      const [a, b] = [...zeiger.values()];
      zoome(g, zug.k * Math.hypot(a.x - b.x, a.y - b.y) / zug.d / g.kam.k, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (!zug.gezogen && Math.hypot(p.x - zug.start.x, p.y - zug.start.y) < 4) return;
    zug.gezogen = true;
    canvas.classList.add('ist-gezogen');
    if (zug.art === 'knoten') {
      g.zeiger = zug.n;
      g.zieht = true;
      const w = welt(g, p.x, p.y);
      zug.n.fx = w.x; zug.n.fy = w.y;
      g.alphaZiel = HITZE_ZIEHEN;
      if (g.alpha < HITZE_ZIEHEN) g.alpha = HITZE_ZIEHEN;
      g.folgen = false;
      halt(g);
      lauf(g);
    } else {
      halt(g);
      g.kam = { ...zug.kam, x: zug.kam.x + p.x - zug.start.x, y: zug.kam.y + p.y - zug.start.y };
      g.folgen = false;
      bitte(g);
    }
  });
  const los = (e) => {
    const g = GRAPH.get(el);
    zeiger.delete(e.pointerId);
    if (!g || !zug) return;
    canvas.classList.remove('ist-gezogen');
    if (zug.art === 'knoten') { zug.n.fx = zug.n.fy = null; g.alphaZiel = 0; }
    g.zieht = false;
    if (!zug.gezogen && zug.art !== 'kneifen' && e.type === 'pointerup') {
      waehle(g, zug.n);
      if (zug.n) oeffne(g, zug.n);
    }
    zug = null;
  };
  canvas.addEventListener('pointerup', los);
  canvas.addEventListener('pointercancel', los);
  canvas.addEventListener('pointerleave', () => { const g = GRAPH.get(el); if (!g) return; g.maus = null; if (g.zeiger && !zug) { g.zeiger = null; tooltip(g); canvas.classList.remove('ist-zeigend'); bitte(g); } });

  canvas.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const g = GRAPH.get(el), p = punkt(e);
    const d = Math.max(-60, Math.min(60, e.deltaY * (e.deltaMode === 1 ? 16 : 1)));
    if (g) zoome(g, Math.exp(-d * 0.008), p.x, p.y);
  }, { passive: false });

  canvas.addEventListener('keydown', (e) => {
    const g = GRAPH.get(el);
    if (!g) return;
    const RICHTUNG = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (RICHTUNG[e.key]) {
      e.preventDefault();
      const [dx, dy] = RICHTUNG[e.key];
      if (e.shiftKey) { g.folgen = false; fahre(g, { ...(g.kamZiel || g.kam), x: (g.kamZiel || g.kam).x - dx * 80, y: (g.kamZiel || g.kam).y - dy * 80 }); return; }
      if (!g.gewaehlt) { const m = welt(g, g.breite / 2, g.hoehe / 2); waehle(g, g.knoten.filter((n) => n.art.an).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0]); return; }
      const n = nachbarIn(g, dx, dy);
      if (n) waehle(g, n);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && g.gewaehlt) { e.preventDefault(); oeffne(g, g.gewaehlt); return; }
    if (e.key === 'Escape' && g.gewaehlt) { e.preventDefault(); waehle(g, null); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoome(g, 1.4, undefined, undefined, true); return; }
    if (e.key === '-') { e.preventDefault(); zoome(g, 1 / 1.4, undefined, undefined, true); return; }
    if (e.key === '0') { e.preventDefault(); g.folgen = true; einpassen(g, true, true); }
  });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest?.('.beziehungsgraph');
  const g = el && GRAPH.get(el);
  if (!g) return;
  if (e.target.closest('.beziehungsgraph__verbunden')) { nurVerbunden(g, !g.nurVerbunden, true); return; }
  if (e.target.closest('[data-beziehungsgraph-alle]')) { nurVerbunden(g, false, true); return; }
  const zoom = e.target.closest('[data-beziehungsgraph-zoom]');
  if (zoom) {
    const w = zoom.dataset.beziehungsgraphZoom;
    if (w === '0') { g.folgen = true; einpassen(g, true, true); } else zoome(g, w === '1' ? 1.4 : 1 / 1.4, undefined, undefined, true);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest?.('.beziehungsgraph__arten')?.closest('.beziehungsgraph');
  const g = el && GRAPH.get(el);
  if (g) nurArt(g, e.target.value);
});

document.addEventListener('input', (e) => {
  const el = e.target.closest?.('.beziehungsgraph__suche')?.closest('.beziehungsgraph');
  const g = el && GRAPH.get(el);
  if (g) suche(g, e.target.value);
});

document.addEventListener('keydown', (e) => {
  const el = e.target.closest?.('.beziehungsgraph__suche')?.closest('.beziehungsgraph');
  const g = el && GRAPH.get(el);
  if (!g) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    const liste = [...(g.treffer || [])];
    if (!liste.length) return;
    g.trefferI = (g.trefferI + 1) % liste.length;
    waehle(g, liste[g.trefferI]);
  } else if (e.key === 'Escape' && e.target.value) {
    e.target.value = '';
    suche(g, '');
  }
});

const neuFaerben = () => { for (const el of document.querySelectorAll('.beziehungsgraph')) { const g = GRAPH.get(el); if (g) { farben(g); bitte(g); } } };
new MutationObserver(neuFaerben).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme', 'class'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', neuFaerben);

einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));

window.Beziehungsgraph = {
  setzen(el, daten) {
    const quelle = el.querySelector(':scope > script[type="application/json"]');
    if (quelle) quelle.textContent = JSON.stringify(daten);
    if (!fertig.has(el)) { einrichten(el); return; }
    aufsetzen(el, daten);
    const g = GRAPH.get(el);
    if (g?.breite) groesse(g);
  },
  waehle(el, schluessel) { const g = GRAPH.get(el); const n = g?.finde(schluessel); if (g) waehle(g, n); },
  nurVerbunden(el, an) { const g = GRAPH.get(el); if (g && g.nurVerbunden !== !!an) nurVerbunden(g, an, false); },
  daten: (el) => GRAPH.get(el)?.daten,
  messen(el, { bilder = 60, fokus } = {}) {
    const g = GRAPH.get(el);
    if (!g) return null;
    const zeigerVorher = g.zeiger, alphaVorher = g.alpha;
    if (fokus) { g.zeiger = g.finde(fokus); g.blend = 1; }
    g.alpha = Math.max(g.alpha, 0.3);
    const lage = g.knoten.map((n) => [n.x, n.y, n.vx, n.vy]);
    let layout = 0, bild = 0;
    for (let i = 0; i < bilder; i++) {
      const t0 = performance.now(); schritt(g);
      const t1 = performance.now(); zeichne(g);
      layout += t1 - t0; bild += performance.now() - t1;
    }
    g.knoten.forEach((n, i) => { [n.x, n.y, n.vx, n.vy] = lage[i]; });
    const ergebnis = {
      knoten: g.knoten.length, alle: g.alle.length, kanten: g.kanten.length, namen: g.namenGezeigt, zoom: +g.kam.k.toFixed(2),
      msLayout: +(layout / bilder).toFixed(2), msZeichnen: +(bild / bilder).toFixed(2), msJeBild: +((layout + bild) / bilder).toFixed(2),
    };
    g.zeiger = zeigerVorher; g.alpha = alphaVorher;
    bitte(g);
    return ergebnis;
  },
};
})();

} catch (fehler) { console.warn("marke.js · system/beziehungsgraph.js", fehler); } }

/* system/bildakkordeon.js */
{ try {
(() => {
const WACHS_BASIS = 0.52;   // expandRatio des Originals

function starten(reihe) {
  const felder = [...reihe.querySelectorAll('.bildakkordeon__feld')];
  const links = felder.map(f => f.querySelector('.bildakkordeon__link'));
  const n = felder.length;
  if (n < 2) return;
  const wachs = (WACHS_BASIS * (n - 1)) / (1 - WACHS_BASIS);
  reihe.style.setProperty('--h-wachs', wachs.toFixed(2));
  const hover = reihe.dataset.ausloeser !== 'klick';
  let aktiv = Math.max(0, felder.findIndex(f => f.classList.contains('ist-aktiv')));

  function setzen(neu) {
    aktiv = neu;
    felder.forEach((f, i) => {
      const ist = i === aktiv;
      f.classList.toggle('ist-aktiv', ist);
      links[i].toggleAttribute('aria-current', ist);
      if (ist) links[i].setAttribute('aria-current', 'true');
      // Vorzeichen der Kippung: Felder vor dem gewählten kippen nach einer Seite, die dahinter nach der anderen.
      f.style.setProperty('--vz', ist ? '0' : i < aktiv ? '1' : '-1');
      f.style.setProperty('--d', ist ? '0' : String(Math.max(-1.5, Math.min(1.5, aktiv - i))));
    });
  }

  felder.forEach((f, i) => {
    const a = links[i];
    if (hover) f.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setzen(i); });
    a.addEventListener('focus', () => setzen(i));
    a.addEventListener('click', e => { if (i !== aktiv) { e.preventDefault(); setzen(i); } });
    a.addEventListener('keydown', e => {
      const vor = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      const zurueck = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      if (!vor && !zurueck) return;
      e.preventDefault();
      const j = (i + (vor ? 1 : -1) + n) % n;
      links[j].focus();
    });
  });
  setzen(aktiv);
}

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.bildakkordeon__reihe') ? [wurzel] : []), ...wurzel.querySelectorAll('.bildakkordeon__reihe')];
  for (const reihe of treffer) {
    if (fertig.has(reihe)) continue;
    fertig.add(reihe);
    starten(reihe);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/bildakkordeon.js", fehler); } }

/* system/bilderfolge.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.bilderfolge') ? [wurzel] : []), ...wurzel.querySelectorAll('.bilderfolge')];
  for (const folge of treffer) {
    if (fertig.has(folge)) continue;
    fertig.add(folge);
    const bahn = folge.querySelector('.bilderfolge__bahn');
    const bilder = [...folge.querySelectorAll('.bilderfolge__bild')];
    const punkte = [...folge.querySelectorAll('.bilderfolge__punkt')];
    if (!bahn || !bilder.length) continue;

    let jetzt = 0;

    function markieren(i) {
      jetzt = i;
      bilder.forEach((b, k) => b.toggleAttribute('data-aktiv', k === i));
      punkte.forEach((p, k) => {
        if (k === i) p.setAttribute('aria-current', 'true');
        else p.removeAttribute('aria-current');
      });
    }

    function zeigen(i) {
      const ziel = bilder[i];
      if (!ziel) return;
      bahn.scrollLeft = ziel.offsetLeft - (bahn.clientWidth - ziel.offsetWidth) / 2;
      markieren(i);
    }

    punkte.forEach((p, i) => p.addEventListener('click', () => zeigen(i)));

    for (const knopf of folge.querySelectorAll('[data-schritt]')) {
      knopf.addEventListener('click', () => {
        const schritt = Number(knopf.dataset.schritt);
        zeigen((jetzt + schritt + bilder.length) % bilder.length);
      });
    }

    const auge = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          markieren(bilder.indexOf(e.target));
        }
      }
    }, { root: bahn, threshold: [0.61] });
    bilder.forEach((b) => auge.observe(b));

    markieren(0);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/bilderfolge.js", fehler); } }

/* system/bildmuster.js */
{ try {
(() => {
const W = 400, H = 500;
const bild = (href, extra = '') =>
  `<image href="${href}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" ${extra}/>`;
const ausschnitt = (id, formen, foto) => `<clipPath id="${id}c">${formen}</clipPath>${bild(foto, `clip-path="url(#${id}c)"`)}`;
const smil = (attr, werte, dur, begin = 0, extra = '') =>
  `<animate attributeName="${attr}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="${Array(werte.length - 1).fill('.4 0 .2 1').join(';')}" values="${werte.join(';')}" ${extra}/>`;

let MARKE = { d: '', w: 1, h: 1 };
// Texte für Schriftband und Terminal; je Element über data-text änderbar.
let TEXT = { band: 'Licht trifft Linie', zeilen: ['idee', 'bauen', 'prüfen', 'live'] };

function zufall(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function sektor(cx, cy, r1, r2, a0, a1) {
  const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  const gross = a1 - a0 > Math.PI ? 1 : 0;
  return r1 > 0
    ? `M${p(r2, a0)}A${r2},${r2} 0 ${gross} 1 ${p(r2, a1)}L${p(r1, a1)}A${r1},${r1} 0 ${gross} 0 ${p(r1, a0)}Z`
    : `M${cx},${cy}L${p(r2, a0)}A${r2},${r2} 0 ${gross} 1 ${p(r2, a1)}Z`;
}



function lamellen(id, foto, bewegt) {
  const n = 8, pad = 18, gap = 6, w = (W - 2 * pad - (n - 1) * gap) / n, versatz = [-28, 14, -40, 24, -8, 36, -20, 6];
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = pad + i * (w + gap), y = 30 + versatz[i] * .5;
    const bew = bewegt ? `class="bildmuster__lamelle" style="animation-delay:${-i * .4}s"` : `transform="translate(0 ${versatz[i]})"`;
    s += `<clipPath id="${id}${i}"><rect x="${x}" y="${y}" width="${w}" height="${H - 60}" rx="4"/></clipPath>
      <g clip-path="url(#${id}${i})"><image href="${foto}" x="0" y="-40" width="${W}" height="${H + 80}" preserveAspectRatio="xMidYMid slice" ${bew}/></g>`;
  }
  return s;
}

function bildmarke(id, foto) {
  const sk = (W - 40) / MARKE.w;
  return ausschnitt(id, `<path transform="translate(20 ${(H - MARKE.h * sk) / 2}) scale(${sk})" d="${MARKE.d}"/>`, foto);
}



function schriftband(id, foto) {
  const L = 1500, zeile = `${TEXT.band} · `;
  const t = [0, L].map(x => `<text x="${x}" y="335" textLength="${L}" lengthAdjust="spacingAndGlyphs">${zeile}<animateTransform attributeName="transform" type="translate" from="0 0" to="${-L} 0" dur="14s" repeatCount="indefinite"/></text>`).join('');
  return `<clipPath id="${id}c" class="bildmuster__schrift" font-size="250">${t}</clipPath>${bild(foto, `clip-path="url(#${id}c)"`)}`;
}







function faecher(id, foto, bewegt) {
  const n = 8, gap = .045, cx = 0, cy = H, R = 700, summe = n * (n + 1) / 2, frei = Math.PI / 2 - gap * (n - 1);
  let s = '', a = -Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const b = frei * (n - i) / summe;
    const offen = sektor(cx, cy, 0, R, a, a + b), zu = sektor(cx, cy, 0, R, a, a + b * .06);
    s += `<path d="${offen}">${bewegt ? smil('d', [zu, offen, offen, zu], 5, 0, `keyTimes="0;.4;.8;1" begin="${i * .12}s"`).replace(/ begin="0s"/, '') : ''}</path>`;
    a += b + gap;
  }
  return ausschnitt(id, s, foto);
}





function markenTuer(id, foto) {
  const anim = `<animateTransform attributeName="transform" type="scale" additive="sum" dur="6s" repeatCount="indefinite" values=".12;.12;1.9;1.9;.12" keyTimes="0;.15;.55;.8;1" calcMode="spline" keySplines="0 0 1 1;.7 0 .2 1;0 0 1 1;.7 0 .2 1"/>
    <animateTransform attributeName="transform" type="translate" additive="sum" dur="6s" repeatCount="indefinite" values="${-MARKE.w / 2} ${-MARKE.h / 2}"/>`;
  return ausschnitt(id, `<path transform="translate(${W / 2} ${H / 2})" d="${MARKE.d}">${anim}</path>`, foto);
}








function blende(id, foto) {
  const ecken = [...Array(6)].map((_, k) => [Math.cos(k * Math.PI / 3) * 100, Math.sin(k * Math.PI / 3) * 100]);
  const sechseck = ecken.map(p => p.join(',')).join(' ');
  const kanten = ecken.map(([x, y], k) => {
    const [nx, ny] = ecken[(k + 1) % 6], l = Math.hypot(nx - x, ny - y);
    return `M${x},${y}L${(x + (x - nx) / l * 3000).toFixed(0)},${(y + (y - ny) / l * 3000).toFixed(0)}`;
  }).join('');
  const anim = `<animateTransform attributeName="transform" type="rotate" additive="sum" dur="6s" repeatCount="indefinite" values="0;60;60;0" keyTimes="0;.45;.75;1" calcMode="spline" keySplines=".6 0 .2 1;0 0 1 1;.6 0 .2 1"/>
    <animateTransform attributeName="transform" type="scale" additive="sum" dur="6s" repeatCount="indefinite" values=".12;2.3;2.3;.12" keyTimes="0;.45;.75;1" calcMode="spline" keySplines=".6 0 .2 1;0 0 1 1;.6 0 .2 1"/>`;
  return ausschnitt(id, `<polygon points="${sechseck}" transform="translate(${W / 2} ${H / 2})">${anim}</polygon>`, foto)
    + `<g transform="translate(${W / 2} ${H / 2})"><path class="bildmuster__kante" d="${kanten}" stroke-width=".9" vector-effect="non-scaling-stroke"/>${anim}</g>`;
}

function wellen(id, foto) {
  const n = 7, pad = 14, gap = 8, w = (W - 2 * pad - (n - 1) * gap) / n, A = 9, lam = 160;
  const d = (x0, ph) => {
    const l = [], r = [];
    for (let y = 14; y <= H - 14; y += 8) {
      const dx = A * Math.sin(y / lam * Math.PI * 2 + ph);
      l.push(`${(x0 + dx).toFixed(1)},${y}`); r.unshift(`${(x0 + w + dx).toFixed(1)},${y}`);
    }
    return `M${l.join('L')}L${r.join('L')}Z`;
  };
  let s = '';
  for (let i = 0; i < n; i++) {
    const x0 = pad + i * (w + gap), ph = i * .7;
    const werte = [0, 1, 2, 3, 4].map(k => d(x0, ph - k * Math.PI / 2));
    s += `<path d="${werte[0]}"><animate attributeName="d" dur="3s" repeatCount="indefinite" values="${werte.join(';')}"/></path>`;
  }
  return ausschnitt(id, s, foto);
}



function kacheln(id, foto) {
  // Die Kacheln fliegen auseinander und finden zurück; Ausschnitt und Bild wandern zusammen.
  const z = zufall(31), sp = 4, ze = 5, gap = 6, tw = (W - (sp - 1) * gap) / sp, th = (H - (ze - 1) * gap) / ze; let s = '';
  for (let r = 0; r < ze; r++) for (let c = 0; c < sp; c++) {
    const i = r * sp + c, x = c * (tw + gap), y = r * (th + gap), dx = (z() - .5) * 140, dy = (z() - .5) * 140, b = (i * .06).toFixed(2);
    s += `<g><animateTransform attributeName="transform" type="translate" dur="6s" begin="${b}s" repeatCount="indefinite" values="0 0;0 0;${dx.toFixed(0)} ${dy.toFixed(0)};0 0" keyTimes="0;.4;.7;1" calcMode="spline" keySplines="0 0 1 1;.6 0 .2 1;.6 0 .2 1"/>
      <clipPath id="${id}${i}"><rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="4"/></clipPath>
      <g clip-path="url(#${id}${i})">${bild(foto)}</g></g>`;
  }
  return s;
}

// Ein Hin und Zurück mit Pause an beiden Enden, für alle Paare gleich, damit sie zusammen wirken.
const PENDEL = 'keyTimes="0;.4;.5;.9;1" calcMode="spline" keySplines=".6 0 .2 1;0 0 1 1;.6 0 .2 1;0 0 1 1"';
const pendel = (attr, a, b, dur, begin) =>
  `<animate attributeName="${attr}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="${a};${b};${b};${a};${a}" ${PENDEL}/>`;
const pendelT = (typ, a, b, dur, begin) =>
  `<animateTransform attributeName="transform" type="${typ}" additive="sum" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="${a};${b};${b};${a};${a}" ${PENDEL}/>`;


function schraeg(id, foto, bewegt) {
  const sl = 190, breiten = [130, 54, 170, 80, 140, 70], schub = [0, -18, 12, -10, 16, -6];
  let x = -200, s = '';
  breiten.forEach((b, i) => {
    const ruhe = `${schub[i] * .5} ${schub[i]}`;
    // Bewegt gleitet das Foto in jedem Band entlang der Schräge, das Nachbarband in die Gegenrichtung.
    const anim = bewegt ? `<animateTransform attributeName="transform" type="translate" dur="4.4s" begin="${-i * .2}s" repeatCount="indefinite" values="${ruhe};${(i % 2 ? -1 : 1) * 22} ${(i % 2 ? 1 : -1) * 55};${ruhe}" calcMode="spline" keySplines=".5 0 .5 1;.5 0 .5 1"/>` : '';
    s += `<clipPath id="${id}${i}"><polygon points="${x},${H} ${x + b},${H} ${x + b + sl},0 ${x + sl},0"/></clipPath>
      <g clip-path="url(#${id}${i})"><image href="${foto}" x="-40" y="-70" width="${W + 80}" height="${H + 140}" preserveAspectRatio="xMidYMid slice" transform="translate(${ruhe})">${anim}</image></g>`;
    x += b + 12;
  });
  return s;
}

function kapseln(id, foto, bewegt) {
  const n = 7, pad = 16, gap = 10, w = (W - 2 * pad - (n - 1) * gap) / n;
  const lage = [[60, 300], [150, 330], [20, 260], [110, 360], [40, 440], [170, 300], [90, 380]];
  return ausschnitt(id, lage.map(([y, h], i) => {
    const hh = Math.min(h, H - pad - y), oben = pad, unten = H - pad - hh;
    // Jede Kapsel fährt ihren freien Weg ab, darum nie über den Rand.
    const anim = bewegt ? smil('y', [y, i % 2 ? oben : unten, y], 5 + i * .4, -i * .6) : '';
    return `<rect x="${pad + i * (w + gap)}" y="${y}" width="${w}" height="${hh}" rx="${w / 2}">${anim}</rect>`;
  }).join(''), foto);
}

function halbkreise(id, foto, bewegt) {
  const z = zufall(23), t = 100; let s = '';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
    const art = z(), dreh = Math.floor(z() * 4) * 90;
    const anim = bewegt
      ? `<animateTransform attributeName="transform" type="rotate" additive="sum" accumulate="sum" dur="3.6s" begin="${((c + r) * .25).toFixed(2)}s" repeatCount="indefinite" values="0 ${t / 2} ${t / 2};180 ${t / 2} ${t / 2};180 ${t / 2} ${t / 2}" keyTimes="0;.4;1" calcMode="spline" keySplines=".6 0 .2 1;0 0 1 1"/>`
      : '';
    if (art < .7) s += `<path d="M0,${t} A${t / 2},${t / 2} 0 0 1 ${t},${t} Z" transform="translate(${c * t} ${r * t}) rotate(${dreh} ${t / 2} ${t / 2})">${anim}</path>`;
    else if (art < .85) s += `<circle cx="${c * t + t / 2}" cy="${r * t + t / 2}" r="${(bewegt ? .15 : .5) * t}">${bewegt ? pendel('r', t * .15, t / 2, 3.6, -(c + r) * .25) : ''}</circle>`;
  }
  return ausschnitt(id, s, foto);
}

function zerfall(id, foto, bewegt) {
  const z = zufall(5), a = 20; let s = '';
  for (let r = 0; r < H / a; r++) for (let c = 0; c < W / a; c++) {
    const t = c / (W / a), zz = z(), weg = zz < Math.pow(t, 1.8) * 1.15;
    const g = a * (1 - t * .75 * z()), drift = Math.pow(t, 2) * z() * 34, mx = c * a + a / 2, my = r * a + a / 2;
    if (!bewegt) {
      if (!weg) s += `<rect x="${(mx - g / 2 + drift).toFixed(1)}" y="${(my - g / 2).toFixed(1)}" width="${g.toFixed(1)}" height="${g.toFixed(1)}"/>`;
      continue;
    }
    // Bewegt setzt sich das Foto zusammen und zerfällt wieder, von links nach rechts versetzt.
    const ende = weg ? .001 : g / a, b = (-(1 - t) * 1.2).toFixed(2);
    s += `<rect x="${-a / 2}" y="${-a / 2}" width="${a}" height="${a}" transform="translate(${mx} ${my})">
      ${pendelT('translate', '0 0', `${(drift + (weg ? 40 * t : 0)).toFixed(1)} 0`, 6, b)}${pendelT('scale', '1', ende.toFixed(3), 6, b)}</rect>`;
  }
  return ausschnitt(id, s, foto);
}






const f1 = n => n.toFixed(1);
const drehen = (cx, cy, dur, bis = 360) =>
  `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${bis} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;
const schieben = (bis, dur, begin = 0) =>
  `<animateTransform attributeName="transform" type="translate" from="0 0" to="${bis}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;

function speichenrad(id, foto, bewegt) {
  const cx = W / 2, cy = H / 2; let sp = '';
  // Speichen kreuzen sich wie an einem echten Laufrad: jede startet an der Nabe versetzt.
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, h = a + (k % 2 ? .38 : -.38);
    sp += `M${f1(cx + 20 * Math.cos(h))},${f1(cy + 20 * Math.sin(h))}L${f1(cx + 168 * Math.cos(a))},${f1(cy + 168 * Math.sin(a))}`;
  }
  return ausschnitt(id, `<circle cx="${cx}" cy="${cy}" r="188"/>`, foto)
    + `<g><path class="bildmuster__linie" stroke-width="2.5" d="${sp}"/><circle class="bildmuster__linie" cx="${cx}" cy="${cy}" r="171" stroke-width="7"/>
       <circle class="bildmuster__grund" cx="${cx}" cy="${cy}" r="26"/>${bewegt ? drehen(cx, cy, 4) : ''}</g>`;
}



function hoehenprofil(id, foto, bewegt) {
  const punkte = [], flach = [];
  for (let x = 0; x <= W; x += 5) {
    punkte.push(`${x},${f1(255 - 75 * Math.sin(x / 61) - 45 * Math.sin(x / 23 + 1) - 18 * Math.sin(x / 9 + 2))}`);
    flach.push(`${x},${H - 14}`);
  }
  const d = q => `M0,${H}L${q.join('L')}L${W},${H}Z`;
  let km = '';
  for (let x = 20; x < W; x += 20) km += `M${x},0V${H}`;
  return ausschnitt(id, `<path d="${d(punkte)}">${bewegt ? pendel('d', d(flach), d(punkte), 6, 0) : ''}</path>`, foto)
    + `<path class="bildmuster__linie" stroke-width="2" d="${km}"/>`;
}







function filmstreifen(id, foto, bewegt) {
  const x0 = 60, x1 = 340, fx = 98, fw = 204, fh = 140, takt = 158; let bilder = '', loecher = '';
  for (let i = -1, y = -takt + 10; y < H + takt; y += takt, i++) {
    bilder += `<clipPath id="${id}${i + 1}"><rect x="${fx}" y="${y}" width="${fw}" height="${fh}" rx="3"/></clipPath>
      <image href="${foto}" x="${fx}" y="${y}" width="${fw}" height="${fh}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}${i + 1})"/>`;
    for (let k = 0; k < 4; k++) {
      const ly = y + k * takt / 4 + 8;
      loecher += `<rect class="bildmuster__grund" x="${x0 + 12}" y="${ly}" width="16" height="22" rx="4"/><rect class="bildmuster__grund" x="${x1 - 28}" y="${ly}" width="16" height="22" rx="4"/>`;
    }
  }
  return `<rect class="bildmuster__koerper" x="${x0}" y="0" width="${x1 - x0}" height="${H}"/><g>${bilder}${loecher}${bewegt ? schieben(`0 ${takt}`, 2.2) : ''}</g>`;
}






const R = (x, y, w, h, rx = 0, a = '', extra = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" ${extra}>${a}</rect>`;
const C = (cx, cy, r, a = '', extra = '') => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" ${extra}>${a}</circle>`;
const rohr = (x1, y1, x2, y2, t) => {
  const l = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / l * t / 2, ny = (x2 - x1) / l * t / 2;
  return `${f1(x1 + nx)},${f1(y1 + ny)} ${f1(x2 + nx)},${f1(y2 + ny)} ${f1(x2 - nx)},${f1(y2 - ny)} ${f1(x1 - nx)},${f1(y1 - ny)}`;
};
const ring = (cx, cy, r1, r2) => sektor(cx, cy, r1, r2, 0, Math.PI) + sektor(cx, cy, r1, r2, Math.PI, Math.PI * 2);
const bei = (x, y, extra = '') => `transform="translate(${f1(x)} ${f1(y)})${extra}"`;
// Ein Feld, das nach seinem Takt sichtbar und unsichtbar wird: Teil k von n eines Zyklus.
function takt(k, n, dur, begin = 0) {
  const a = k / n, b = (k + 1) / n;
  const [werte, zeiten] = k === 0 ? ['visible;hidden', `0;${b}`] : ['hidden;visible;hidden', `0;${a};${b}`];
  return `<animate attributeName="visibility" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" values="${werte}" keyTimes="${zeiten}" calcMode="discrete"/>`;
}
const flackern = (z, dur) => `<animate attributeName="visibility" dur="${f1(dur)}s" begin="${-f1(z * dur)}s" repeatCount="indefinite" values="visible;hidden" keyTimes="0;.5" calcMode="discrete"/>`;


function veloFormen(anim = '') {
  // Rennrad mit Rahmengeometrie wie ein echtes: Radstand gut zweieinhalb Raddurchmesser,
  // waagrechtes Oberrohr, Tretlager knapp unter den Achsen, Rennlenker nach unten gebogen.
  const RA = [92, 326], FA = [308, 326], B = [192, 334], S = [168, 180], H = [282, 178], HL = [290, 222];
  const p = (pts, t) => `<polygon points="${pts}">${anim}</polygon>`;
  const rohre = [[S, B, 11], [B, HL, 12], [S, H, 10], [H, HL, 13], [HL, FA, 8], [S, RA, 7], [B, RA, 8],
    [H, [300, 170], 7], [[300, 170], [328, 172], 7], [[328, 172], [336, 192], 7], [[336, 192], [324, 210], 7],
    [S, [162, 160], 7]];
  return `<path d="${ring(...RA, 72, 82)}">${anim}</path><path d="${ring(...FA, 72, 82)}">${anim}</path>`
    + rohre.map(([a, b, t]) => p(rohr(...a, ...b, t))).join('')
    + `<path d="M132,156 Q160,148 186,154 L186,160 Q160,158 132,163 Z">${anim}</path>` + C(...B, 20, anim);
}
function velorahmen(id, foto, bewegt) {
  return ausschnitt(id, veloFormen(bewegt ? `<animateTransform attributeName="transform" type="translate" values="-420 0;420 0" dur="5s" repeatCount="indefinite"/>` : ''), foto);
}

function ritzelpaket(id, foto, bewegt) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 35, h = 380 - i * 30;
    s += `<rect x="-13" y="${-h / 2}" width="26" height="${h}" rx="13" ${bei(x, 250)}>${bewegt ? pendelT('scale', '1 1', '1 .62', 3.2, -i * .18) : ''}</rect>`;
  }
  return ausschnitt(id, s, foto);
}


function velobuegel(id, foto, bewegt) {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const x = 14 + i * 64, r = 28, d = 20, y = 120 + (i % 2) * 50, u = H - 16;
    const pfad = `M${x},${u}V${y + r}A${r},${r} 0 0 1 ${x + 2 * r},${y + r}V${u}h${-d}V${y + r}A${r - d},${r - d} 0 0 0 ${x + d},${y + r}V${u}Z`;
    s += `<path d="${pfad}">${bewegt ? pendelT('translate', '0 360', '0 0', 4.4, (i * .15).toFixed(2)) : ''}</path>`;
  }
  return ausschnitt(id, s, foto);
}











function spielstand(id, foto, bewegt) {
  const ziffer = (txt, x, anker, a = '') => `<text class="bildmuster__schrift" x="${x}" y="345" font-size="300" text-anchor="${anker}">${txt}${a}</text>`;
  let s = ziffer(':', 200, 'middle');
  if (bewegt) {
    [0, 1, 2, 3].forEach(k => { s += ziffer(k, 170, 'end', takt(k, 4, 8)); });
    [0, 1, 2].forEach(k => { s += ziffer(k, 230, 'start', takt(k, 3, 6)); });
  } else s += ziffer(3, 170, 'end') + ziffer(2, 230, 'start');
  return ausschnitt(id, s, foto);
}




// Kickerfigur nach dem Leonhart «leo.player» (Referenz vom 2026-10-14), nur der Umriss ohne
// Innenlinien: Helm, Schultern um die Stange, Taille, Beine, symmetrischer Fussblock.
// Einheiten um den Stangenpunkt (0,0). Die Figur ist ein Fenster: man sieht das Foto durch sie.
const FIGUR_FORMEN = [
  '<circle cx="0" cy="-50" r="19"/>',
  '<rect x="-15" y="-46" width="30" height="24" rx="9"/>',
  '<rect x="-8" y="-25" width="16" height="9"/>',
  '<path d="M-27,-12Q-27,-18 -21,-18H21Q27,-18 27,-12V10Q27,18 19,22L15,48H-15L-19,22Q-27,18 -27,10Z"/>',
  '<rect x="-14" y="46" width="28" height="26" rx="2"/>',
  '<rect x="-12" y="70" width="24" height="28"/>',
  '<polygon points="-15,96 15,96 20,106 20,121 15,128 -15,128 -20,121 -20,106"/>',
];

function figur2(transform, anim = '') {
  return FIGUR_FORMEN.map(f => f.replace(/\/>$/, ` transform="${transform}">${anim}</${f.match(/^<(\w+)/)[1]}>`)).join('');
}

function aufstellung(id, foto, bewegt) {
  // Wie G38: von oben 3, 5, 5, 3; der Ball geht zwischen den Fünferstangen hin und her.
  const reihen = [[46, 3], [168, 5], [290, 5], [412, 3]], g = .58; let s = '';
  reihen.forEach(([y, n], r) => {
    const dur = 2.4 + (r % 2) * .5;
    s += `<rect x="-60" y="${y - 2}" width="${W + 120}" height="4">${bewegt ? pendelT('translate', '-26 0', '26 0', dur, -r * .5) : ''}</rect>`;
    for (let i = 1; i <= n; i++) s += figur2(`translate(${f1(i * W / (n + 1))} ${y}) scale(${g})`, bewegt ? pendelT('translate', `${f1(-26 / g)} 0`, `${f1(26 / g)} 0`, dur, -r * .5) : '');
  });
  s += bewegt
    ? `<circle r="9"><animate attributeName="cx" dur="4.8s" repeatCount="indefinite" values="67;133;200;267;333;267;200;133;67"/><animate attributeName="cy" dur="4.8s" repeatCount="indefinite" values="${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => k % 2 ? 254 : 238).join(';')}"/></circle>`
    : C(166, 246, 9);
  // Ein Rahmen aus Foto rundherum, ruhend und bewegt (Entscheid 2026-10-14).
  s += R(0, 0, W, 10) + R(0, H - 10, W, 10) + R(0, 0, 10, H) + R(W - 10, 0, 10, H);
  return ausschnitt(id, s, foto);
}

function schuss2(id, foto, bewegt) {
  // Die Stange liegt waagrecht (2026-10-14); die Figur wippt um sie vor und zurück wie
  // ein Pendel. Rundherum ein Rahmen aus Foto, wie bei der Aufstellung.
  const lage = 'translate(200 200)';
  const anim = bewegt ? `<animateTransform attributeName="transform" type="rotate" additive="sum" dur="1.8s" repeatCount="indefinite" values="-16;16;-16" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>` : '';
  const rahmen = R(0, 0, W, 10) + R(0, H - 10, W, 10) + R(0, 0, 10, H) + R(W - 10, 0, 10, H);
  return ausschnitt(id, `<rect x="-300" y="-8" width="600" height="16" rx="8" transform="${lage}"/>` + figur2(`${lage} scale(2.1)${bewegt ? '' : ' rotate(8)'}`, anim) + rahmen, foto);
}








function terminal(id, foto, bewegt) {
  const zeilen = TEXT.zeilen.map(z => `> ${z}`);
  let s = '';
  zeilen.forEach((t, i) => { s += `<text class="bildmuster__schrift" x="24" y="${110 + i * 100}" font-size="88">${t}${bewegt ? `<animate attributeName="visibility" dur="6s" repeatCount="indefinite" values="hidden;visible" keyTimes="0;${(i + 1) / 6}" calcMode="discrete"/>` : ''}</text>`; });
  s += R(300, 405, 44, 70, 4, bewegt ? `<animate attributeName="visibility" dur="1s" repeatCount="indefinite" values="visible;hidden" keyTimes="0;.5" calcMode="discrete"/>` : '');
  return ausschnitt(id, s, foto);
}

function fenster(id, foto, bewegt) {
  let s = '', punkte = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = 16 + c * 192, y = 16 + r * 160, w = 176, h = 148, i = r * 2 + c;
    const anim = bewegt ? pendelT('scale', '.001', '1', 5, f1(i * .2)) : '';
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" ${bei(x + w / 2, y + h / 2)}>${anim}</rect>`;
    punkte += `<g ${bei(x + w / 2, y + h / 2)}>${anim}${[0, 1, 2].map(k => C(-w / 2 + 16 + k * 14, -h / 2 + 14, 4.5, '', 'class="bildmuster__grund"')).join('')}<line class="bildmuster__linie" x1="${-w / 2}" x2="${w / 2}" y1="${-h / 2 + 28}" y2="${-h / 2 + 28}" stroke-width="3"/></g>`;
  }
  return ausschnitt(id, s, foto) + punkte;
}


function matrixcode(id, foto, bewegt) {
  const z = zufall(97), m = 16, n = 21, x0 = 32, y0 = 82; let s = '';
  const sucher = (r, c) => [[0, 0], [0, 14], [14, 0]].some(([a, b]) => r >= a && r < a + 7 && c >= b && c < b + 7);
  [[0, 0], [0, 14], [14, 0]].forEach(([r, c]) => {
    const x = x0 + c * m, y = y0 + r * m;
    s += `<path fill-rule="evenodd" d="M${x},${y}h${7 * m}v${7 * m}h${-7 * m}Z M${x + m},${y + m}v${5 * m}h${5 * m}v${-5 * m}Z"/>` + R(x + 2 * m, y + 2 * m, 3 * m, 3 * m);
  });
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (sucher(r, c) || (r === 7 || c === 7) && r < 8 && c < 8 || (r === 7 && c >= 13 && c < 21) || (c === 7 && r >= 13)) continue;
    const an = z() < .5, dur = 1.5 + z() * 3;
    if (an || bewegt) s += R(x0 + c * m, y0 + r * m, m, m, 0, bewegt ? flackern(z(), dur) : '');
  }
  return ausschnitt(id, s, foto);
}

function klammern(id, foto, bewegt) {
  const t = (zeichen, x, a = '') => `<text class="bildmuster__schrift" x="${x}" y="360" font-size="320" text-anchor="middle">${zeichen}${a}</text>`;
  return ausschnitt(id, t('&lt;', 90, bewegt ? pendelT('translate', '0 0', '-34 0', 3, 0) : '')
    + t('/', 200, bewegt ? pendelT('rotate', '0 200 260', '-12 200 260', 3, 0) : '') + t('&gt;', 310, bewegt ? pendelT('translate', '0 0', '34 0', 3, 0) : ''), foto);
}



function bezier(id, foto, bewegt) {
  const zustand = (c1, c2) => {
    const p0 = [40, 420], p3 = [360, 90], pt = t => [0, 1].map(k => (1 - t) ** 3 * p0[k] + 3 * (1 - t) ** 2 * t * c1[k] + 3 * (1 - t) * t * t * c2[k] + t ** 3 * p3[k]);
    const oben = [], unten = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, [x, y] = pt(t), [x2, y2] = pt(Math.min(1, t + .01)), [x1, y1] = pt(Math.max(0, t - .01));
      const l = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / l * 44, ny = (x2 - x1) / l * 44;
      oben.push(`${f1(x + nx)},${f1(y + ny)}`); unten.unshift(`${f1(x - nx)},${f1(y - ny)}`);
    }
    return { band: [...oben, ...unten].join(' '), griffe: `M${p0}L${c1}M${p3}L${c2}`, c1, c2 };
  };
  const A = zustand([60, 120], [340, 400]), B = zustand([340, 460], [40, 40]);
  const pz = (attr, a, b) => bewegt ? pendel(attr, a, b, 5, 0) : '';
  return ausschnitt(id, `<polygon points="${A.band}">${pz('points', A.band, B.band)}</polygon>`, foto)
    + `<path class="bildmuster__kante" stroke-width="2" d="${A.griffe}">${pz('d', A.griffe, B.griffe)}</path>`
    + [[A.c1, B.c1], [A.c2, B.c2]].map(([a, b]) => `<circle class="bildmuster__griff" r="8" cx="${a[0]}" cy="${a[1]}">${pz('cx', a[0], b[0])}${pz('cy', a[1], b[1])}</circle>`).join('')
    + R(32, 412, 16, 16, 2, '', 'class="bildmuster__griff"') + R(352, 82, 16, 16, 2, '', 'class="bildmuster__griff"');
}




function ebenen(id, foto, bewegt) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const y = 110 + i * 70;
    s += `<polygon points="0,-74 150,0 0,74 -150,0" ${bei(200, y)}>${bewegt ? pendelT('translate', '0 0', `0 ${(i - 2) * 26}`, 4, 0) : ''}</polygon>`;
  }
  return ausschnitt(id, s, foto) + [0, 1, 2, 3].map(i => `<polyline class="bildmuster__linie" stroke-width="4" points="-150,0 0,74 150,0" ${bei(200, 110 + i * 70)}>${bewegt ? pendelT('translate', '0 0', `0 ${(i - 2) * 26}`, 4, 0) : ''}</polyline>`).join('');
}




function auswahl(id, foto, bewegt) {
  const a = [70, 90, 260, 320], b = [30, 180, 200, 220];
  const p = (k, i) => bewegt ? pendel(k, a[i], b[i], 5, 0) : '';
  let griffe = '';
  [[0, 0], [.5, 0], [1, 0], [0, .5], [1, .5], [0, 1], [.5, 1], [1, 1]].forEach(([fx, fy]) => {
    const lage = s => [s[0] + fx * s[2] - 6, s[1] + fy * s[3] - 6];
    const [ax, ay] = lage(a), [bx, by] = lage(b);
    griffe += R(ax, ay, 12, 12, 2, bewegt ? pendel('x', f1(ax), f1(bx), 5, 0) + pendel('y', f1(ay), f1(by), 5, 0) : '', 'class="bildmuster__griff"');
  });
  const kanten = ['x', 'y', 'width', 'height'].map((k, i) => p(k, i)).join('');
  return ausschnitt(id, R(...a, 0, kanten), foto) + R(...a, 0, kanten, 'class="bildmuster__kante" stroke-width="1.5" stroke-dasharray="6 4"') + griffe;
}


function lebenslauf(id, foto, bewegt) {
  const z = zufall(103); let s = R(56, 20, 8, 460, 4);
  for (let i = 0; i < 7; i++) {
    const y = 48 + i * 66, w = 120 + z() * 200, w2 = 60 + z() * 140;
    s += C(60, y, 16) + R(96, y - 14, w, 22, 11, bewegt ? pendel('width', 22, f1(w), 6, f1(i * .25)) : '') + R(96, y + 14, w2, 10, 5, bewegt ? pendel('width', 10, f1(w2), 6, f1(i * .25 + .1)) : '');
  }
  return ausschnitt(id, s, foto);
}


function umschlag(id, foto, bewegt) {
  const zu = '40,140 360,140 200,268', offen = '40,140 360,140 200,20';
  const lasche = `<polygon points="${bewegt ? zu : offen}">${bewegt ? pendel('points', zu, offen, 5, 0) : ''}</polygon>`;
  const linie = `M40,140L200,${bewegt ? 268 : 140}L360,140`;
  return ausschnitt(id, R(40, 140, 320, 220, 6) + lasche, foto)
    + `<path class="bildmuster__linie" stroke-width="5" d="${linie}">${bewegt ? pendel('d', 'M40,140L200,268L360,140', 'M40,140L200,140L360,140', 5, 0) : ''}</path>`
    + `<path class="bildmuster__linie" stroke-width="5" d="M40,360L170,250M360,360L230,250"/>`;
}

function karriereleiter(id, foto, bewegt) {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const h = 70 + i * 66, x = 14 + i * 63;
    s += R(x, 484 - h, 59, h, 6, bewegt ? pendel('height', 4, h, 5, f1(i * .2)) + pendel('y', 480, 484 - h, 5, f1(i * .2)) : '');
  }
  return ausschnitt(id, s, foto);
}




function gespraech(id, foto, bewegt) {
  let s = '';
  [[24, 40, 250, 90, 1], [130, 160, 246, 80, -1], [24, 270, 210, 96, 1], [150, 396, 226, 74, -1]].forEach(([x, y, w, h, s0], i) => {
    const anim = bewegt ? pendelT('scale', '.001', '1', 6, f1(i * .5)) : '';
    const fuss = s0 > 0 ? `${x + 30},${y + h - 2} ${x + 30},${y + h + 26} ${x + 62},${y + h - 2}` : `${x + w - 30},${y + h - 2} ${x + w - 30},${y + h + 26} ${x + w - 62},${y + h - 2}`;
    const mx = s0 > 0 ? x : x + w, my = y + h;
    s += `<rect x="${x - mx}" y="${y - my}" width="${w}" height="${h}" rx="22" ${bei(mx, my)}>${anim}</rect><polygon points="${fuss.split(' ').map(p => p.split(',').map((v, k) => v - [mx, my][k]).join(',')).join(' ')}" ${bei(mx, my)}>${anim}</polygon>`;
  });
  return ausschnitt(id, s, foto);
}




function grundriss(id, foto, bewegt) {
  const raeume = [[30, 40, 190, 180], [230, 40, 140, 110], [230, 160, 140, 60], [30, 230, 120, 230], [160, 230, 210, 230]];
  const tueren = [[100, 220, 40, 10], [220, 80, 10, 40], [290, 150, 30, 10], [150, 330, 10, 50], [300, 220, 40, 10]];
  let s = raeume.map(([x, y, w, h], i) => `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="3" ${bei(x + w / 2, y + h / 2)}>${bewegt ? pendelT('scale', '.001', '1', 5, f1(i * .25)) : ''}</rect>`).join('');
  s += tueren.map(([x, y, w, h], i) => R(x, y, w, h, 0, bewegt ? takt(1, 2, 5, -.8 + i * .1).replace('hidden;visible;hidden', 'hidden;visible;visible') : '')).join('');
  return ausschnitt(id, s, foto);
}

function skyline(id, foto, bewegt) {
  const z = zufall(107); let s = '', fenster = '', x = 10;
  while (x < 380) {
    const w = Math.min(36 + z() * 46, 390 - x), h = 120 + z() * 330, i = Math.round(x);
    const anim = bewegt ? pendelT('translate', '0 470', '0 0', 5, f1(z() * 1.2)) : '';
    s += R(x, 480 - h, w, h, 3, anim);
    let f = '';
    for (let fy = 480 - h + 14; fy < 466; fy += 22) for (let fx = x + 8; fx < x + w - 14; fx += 14) f += `<rect class="bildmuster__grund" x="${f1(fx)}" y="${f1(fy)}" width="6" height="10"/>`;
    fenster += `<g>${f}${anim}</g>`;
    x += w + 6;
  }
  return ausschnitt(id, s, foto) + fenster;
}

function hausgiebel(id, foto, bewegt) {
  let s = '', tueren = '';
  for (let i = 0; i < 5; i++) {
    const x = 14 + i * 76, y = 140 + [60, 0, 90, 30, 70][i], anim = bewegt ? pendelT('translate', '0 400', '0 0', 5, f1(i * .2)) : '';
    s += `<path d="M${x},480V${y + 36}L${x + 35},${y}L${x + 70},${y + 36}V480Z">${anim}</path>`;
    tueren += `<g>${R(x + 25, 440, 20, 40, 10, '', 'class="bildmuster__grund"')}${anim}</g>`;
  }
  return ausschnitt(id, s, foto) + tueren;
}



function geschosse(id, foto, bewegt) {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const y = 432 - i * 56;
    s += R(40 + (i % 2) * 14, y, 306, 44, 4, bewegt ? pendelT('translate', '0 -520', '0 0', 6, f1(i * .25)) : '');
  }
  return ausschnitt(id, s, foto);
}


function parzellen(id, foto, bewegt) {
  const z = zufall(113), sp = 4, ze = 5, P = [];
  for (let r = 0; r <= ze; r++) { P.push([]); for (let c = 0; c <= sp; c++) {
    const rand = r === 0 || r === ze || c === 0 || c === sp;
    P[r].push([c * 100 + (rand ? 0 : (z() - .5) * 50), r * 100 + (rand ? 0 : (z() - .5) * 50)]);
  } }
  let s = '', verkauft = '';
  for (let r = 0; r < ze; r++) for (let c = 0; c < sp; c++) {
    const q = [P[r][c], P[r][c + 1], P[r + 1][c + 1], P[r + 1][c]], mx = q.reduce((a, p) => a + p[0], 0) / 4, my = q.reduce((a, p) => a + p[1], 0) / 4;
    const punkte = q.map(([x, y]) => `${f1((x - mx) * .9)},${f1((y - my) * .9)}`).join(' ');
    const anim = bewegt ? pendelT('scale', '1', '.7', 3.6, f1(-(r * sp + c) * .17)) : '';
    if (r * sp + c === 9) verkauft += `<polygon class="bildmuster__koerper" points="${punkte}" ${bei(mx, my)}>${anim}</polygon>`;
    else s += `<polygon points="${punkte}" ${bei(mx, my)}>${anim}</polygon>`;
  }
  return ausschnitt(id, s, foto) + verkauft;
}



// Paare: links ruhend, rechts das bewegte Gegenstück (2026-10-14: jedes ruhende braucht eins).

const MUSTER = {
  lamellen: [lamellen, lamellen], schraegschnitt: [schraeg, schraeg], wellenstreifen: [null, wellen],
  ritzel: [ritzelpaket, ritzelpaket], filmstreifen: [filmstreifen, filmstreifen], geschosse: [geschosse, geschosse],
  werdegang: [null, lebenslauf], halbkreise: [halbkreise, halbkreise], faecher: [faecher, faecher],
  kapseln: [kapseln, kapseln], bogenreihe: [velobuegel, null], speichenrad: [speichenrad, speichenrad],
  blende: [null, blende], kacheln: [null, kacheln], zerfall: [null, zerfall], matrixcode: [matrixcode, matrixcode],
  fenster: [fenster, fenster], grundriss: [grundriss, grundriss], parzellen: [parzellen, parzellen],
  bildmarke: [bildmarke, markenTuer], schriftband: [null, schriftband], spielstand: [spielstand, spielstand],
  klammern: [klammern, klammern], terminal: [terminal, terminal], rennrad: [velorahmen, velorahmen],
  aufstellung: [aufstellung, aufstellung], schuss: [null, schuss2], post: [null, umschlag],
  gespraech: [gespraech, gespraech], hoehenprofil: [hoehenprofil, hoehenprofil], skyline: [skyline, skyline],
  hausgiebel: [hausgiebel, null], karriereleiter: [karriereleiter, null], ebenen: [ebenen, ebenen],
  kurve: [null, bezier], zuschneiden: [null, auswahl],
};

const marken = new Map();
function markeLaden(url) {
  if (!marken.has(url)) marken.set(url, fetch(url).then(r => (r.ok ? r.text() : '')).then(text => {
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('svg');
    const [, , w, h] = (svg?.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    // Eine Marke kann vorne Schnittformen tragen; die Kontur ist der längste Pfad.
    const d = svg && [...svg.querySelectorAll('path[d]')].map(p => p.getAttribute('d')).sort((a, b) => b.length - a.length)[0];
    return d && w > 0 && h > 0 ? { d, w, h } : null;
  }).catch(() => null));
  return marken.get(url);
}

const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
// Mehrere bewegte Muster gleichzeitig ruckeln; darum läuft nur, was im Fenster steht.
const sicht = 'IntersectionObserver' in window ? new IntersectionObserver(eintraege => eintraege.forEach(e => {
  e.target.dataset.sichtbar = e.isIntersecting ? '1' : '0';
  laufen(e.target);
}), { rootMargin: '200px' }) : null;
function laufen(svg) {
  const an = !ruhig.matches && svg.dataset.sichtbar !== '0';
  svg.classList.toggle('bildmuster--steht', !an);
  if (an) svg.unpauseAnimations(); else svg.pauseAnimations();
}

let zaehler = 0;
async function zeichnen(figur) {
  const img = figur.querySelector('img'), eintrag = MUSTER[figur.dataset.muster];
  if (!img || !eintrag || figur.querySelector(':scope > svg')) return;
  const bewegt = figur.hasAttribute('data-bewegt') ? !!eintrag[1] : !eintrag[0];
  const fn = eintrag[bewegt ? 1 : 0];
  if (figur.dataset.muster === 'bildmarke') {
    if (!figur.dataset.bildmarke) return;
    const marke = await markeLaden(figur.dataset.bildmarke);
    if (!marke || figur.querySelector(':scope > svg')) return;
    MARKE = marke;
  }
  const text = figur.dataset.text;
  TEXT = { band: text || 'Licht trifft Linie', zeilen: text ? text.split('|') : ['idee', 'bauen', 'prüfen', 'live'] };
  const id = `bm${++zaehler}-`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', img.alt);
  svg.innerHTML = fn(id, img.currentSrc || img.src, bewegt);
  img.hidden = true;
  figur.prepend(svg);
  if (bewegt) { sicht?.observe(svg); laufen(svg); }
}

const SEL = '.bildmuster[data-muster]';
const eingerichtet = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.(SEL) ? [wurzel] : []), ...wurzel.querySelectorAll(SEL)];
  for (const figur of treffer) {
    if (eingerichtet.has(figur)) continue;
    eingerichtet.add(figur);
    zeichnen(figur);
  }
}
ruhig.addEventListener?.('change', () => document.querySelectorAll('.bildmuster > svg').forEach(laufen));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => einrichten(document));
else einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
window.bildmuster = { zeichnen, alle: (wurzel = document) => einrichten(wurzel) };
})();

} catch (fehler) { console.warn("marke.js · system/bildmuster.js", fehler); } }

/* system/bildspur.js */
{ try {
(() => {
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function dauer(token) {
  const probe = document.createElement('i');
  probe.style.transitionDuration = `var(${token})`;
  document.body.append(probe);
  const wert = getComputedStyle(probe).transitionDuration;
  probe.remove();
  return wert.endsWith('ms') ? parseFloat(wert) : parseFloat(wert) * 1000;
}

const QUAD_AUS = 'cubic-bezier(.5, 1, .89, 1)';  // gsap «power1» (= power1.out)
const QUART_AUS = 'cubic-bezier(.25, 1, .5, 1)'; // gsap «power3» (= power3.out)
const SCHWELLE = 80;                              // Zeigerweg in px bis zum nächsten Bild
const GLAETTUNG = 0.1;

const lerp = (a, b, n) => (1 - n) * a + n * b;

const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.bildspur') ? [wurzel] : []), ...wurzel.querySelectorAll('.bildspur')];
for (const flaeche of treffer) {
  if (fertig.has(flaeche)) continue;
  fertig.add(flaeche);
  const ebene = flaeche.querySelector('.bildspur__ebene');
  const bilder = ebene ? [...ebene.querySelectorAll('.bildspur__bild')] : [];
  if (!bilder.length) continue;

  let vorgeladen = false;
  const vorladen = () => {
    if (vorgeladen) return;
    vorgeladen = true;
    for (const b of bilder) {
      const img = b.querySelector('img');
      if (!img) continue;
      const p = new Image();
      p.src = img.currentSrc || img.src;
      p.decode().catch(() => {});
    }
  };

  const halb = dauer('--t-slow');
  let maus = { x: 0, y: 0 };
  let letzte = { x: 0, y: 0 };
  let geglaettet = { x: 0, y: 0 };
  let nummer = 0;
  let laeuft = false;
  let gestartet = false;
  let sichtbar = false;

  const lokal = (e) => {
    const k = flaeche.getBoundingClientRect();
    return { x: e.clientX - k.left, y: e.clientY - k.top };
  };

  function zeigen() {
    nummer = nummer < bilder.length - 1 ? nummer + 1 : 0;
    const bild = bilder[nummer];
    const b = bild.offsetWidth, h = bild.offsetHeight;
    const x0 = geglaettet.x - b / 2, y0 = geglaettet.y - h / 2;
    const x1 = maus.x - b / 2, y1 = maus.y - h / 2;
    ebene.append(bild); // später im Markup liegt weiter vorn
    bild.anim?.cancel();
    bild.anim = bild.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1, offset: 0, easing: QUAD_AUS },
      { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 1, offset: 0.5, easing: QUART_AUS },
      { transform: `translate(${x1}px, ${y1}px) scale(0.2)`, opacity: 0, offset: 1 },
    ], { duration: halb * 2 });
  }

  function schleife() {
    if (!sichtbar || document.hidden) { laeuft = false; return; }
    geglaettet.x = lerp(geglaettet.x, maus.x, GLAETTUNG);
    geglaettet.y = lerp(geglaettet.y, maus.y, GLAETTUNG);
    if (Math.hypot(maus.x - letzte.x, maus.y - letzte.y) > SCHWELLE) {
      zeigen();
      letzte = { ...maus };
    }
    requestAnimationFrame(schleife);
  }
  const wecken = () => {
    if (laeuft || !gestartet || !sichtbar || document.hidden) return;
    laeuft = true;
    requestAnimationFrame(schleife);
  };

  flaeche.addEventListener('pointermove', (e) => {
    if (reduziert()) return;
    maus = lokal(e);
    if (!gestartet) {
      gestartet = true;
      geglaettet = { ...maus };
      letzte = { ...maus };
    }
    wecken();
  }, { passive: true });
  new IntersectionObserver((eintraege) => {
    sichtbar = eintraege.some((x) => x.isIntersecting);
    if (sichtbar) { vorladen(); wecken(); }
  }, { rootMargin: '400px 0px' }).observe(flaeche);
  document.addEventListener('visibilitychange', wecken);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/bildspur.js", fehler); } }

/* system/bildvergleich.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.bildvergleich') ? [wurzel] : []), ...wurzel.querySelectorAll('.bildvergleich')];
for (const vergleich of treffer) {
  if (fertig.has(vergleich)) continue;
  fertig.add(vergleich);
  const regler = vergleich.querySelector('.bildvergleich__regler');
  if (!regler) continue;
  const vorher = vergleich.querySelector('.bildvergleich__marke--vorher');
  const nachher = vergleich.querySelector('.bildvergleich__marke--nachher');

  const setze = () => {
    vergleich.style.setProperty('--pos', regler.value + '%');
    const kante = vergleich.clientWidth * regler.value / 100;
    if (vorher) {
      const schnitt = Math.min(vorher.offsetWidth, Math.max(0, vorher.offsetLeft + vorher.offsetWidth - kante));
      vorher.style.setProperty('--schnitt', schnitt + 'px');
    }
    if (nachher) {
      const schnitt = Math.min(nachher.offsetWidth, Math.max(0, kante - nachher.offsetLeft));
      nachher.style.setProperty('--schnitt', schnitt + 'px');
    }
  };
  setze();                                  // Startwert aus dem Markup uebernehmen
  regler.addEventListener('input', setze);
  window.addEventListener('resize', setze);

  let selbst = false;
  let zieht = false;
  const folge = (e) => {
    const r = vergleich.getBoundingClientRect();
    if (!r.width) return;
    const wert = String(Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100))));
    if (regler.value === wert) return;
    regler.value = wert;
    regler.dispatchEvent(new Event('input', { bubbles: true }));
  };
  vergleich.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;               // nur Finger, Stift oder linke Maustaste
    selbst = true;                          // beendet auch die Vorschau der Bewegung
    zieht = true;
    folge(e);
    if (e.pointerType !== 'mouse') e.preventDefault();
  });
  vergleich.addEventListener('pointermove', (e) => { if (zieht) folge(e); });
  for (const ende of ['pointerup', 'pointercancel', 'pointerleave']) {
    vergleich.addEventListener(ende, () => { zieht = false; });
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
  regler.addEventListener('keydown', () => { selbst = true; });
  const start = Number(regler.value);
  const auge = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    auge.disconnect();
    const dauer = 1600, t0 = performance.now();
    const schritt = (t) => {
      if (selbst) return;
      const p = Math.min(1, (t - t0) / dauer);
      regler.value = String(Math.round(start - 12 * Math.sin(p * Math.PI * 2) * (1 - p * 0.3)));
      setze();
      if (p < 1) requestAnimationFrame(schritt); else { regler.value = String(start); setze(); }
    };
    requestAnimationFrame(schritt);
  }, { threshold: 0.5 });
  auge.observe(vergleich);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/bildvergleich.js", fehler); } }

/* system/genau-eine-wahl.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('[data-eine-wahl]') ? [wurzel] : []), ...wurzel.querySelectorAll('[data-eine-wahl]')];
  for (const gruppe of treffer) {
    if (fertig.has(gruppe)) continue;
    fertig.add(gruppe);
    const attribut = gruppe.dataset.eineWahl || 'aria-pressed';
    const mitLinks = gruppe.hasAttribute('data-vorfuehrung');
    const anWert = gruppe.querySelector(`[${attribut}]:not([${attribut}="false"])`)
      ?.getAttribute(attribut) ?? 'true';
    const ausWert = attribut === 'aria-current' ? null : 'false';

    const wahl = mitLinks ? 'button:not([data-schritt]), a[href]' : 'button:not([data-schritt])';
    const waehlbar = () => [...gruppe.querySelectorAll(wahl)];

    const setze = (ziel) => {
      for (const k of waehlbar()) {
        if (k === ziel) k.setAttribute(attribut, anWert);
        else if (ausWert === null) k.removeAttribute(attribut);
        else k.setAttribute(attribut, ausWert);
      }
    };

    gruppe.addEventListener('click', (e) => {
      const schritt = e.target.closest('[data-schritt]');
      if (schritt) {
        const liste = waehlbar();
        const jetzt = liste.findIndex((k) => k.getAttribute(attribut) === anWert);
        const naechster = liste[Math.min(liste.length - 1, Math.max(0, jetzt + Number(schritt.dataset.schritt)))];
        if (naechster) setze(naechster);
        return;
      }
      const knopf = e.target.closest(mitLinks ? 'button, a[href]' : 'button');
      if (!knopf || !waehlbar().includes(knopf)) return;
      if (knopf.tagName === 'A') e.preventDefault();
      setze(knopf);
    });
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/genau-eine-wahl.js", fehler); } }

/* system/burgerknopf.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.burgerknopf') ? [wurzel] : []), ...wurzel.querySelectorAll('.burgerknopf')];
  for (const knopf of treffer) {
    if (fertig.has(knopf)) continue;
    fertig.add(knopf);
    const menue = document.getElementById(knopf.getAttribute('aria-controls'));
    if (!menue) continue;

    const setze = (offen) => {
      knopf.setAttribute('aria-expanded', String(offen));
      knopf.setAttribute('aria-label', offen ? 'Menü schliessen' : 'Menü öffnen');
      menue.hidden = !offen;
    };

    knopf.addEventListener('click', () => setze(knopf.getAttribute('aria-expanded') !== 'true'));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || knopf.getAttribute('aria-expanded') !== 'true') return;
      if (!menue.contains(e.target) && e.target.closest?.('dialog[open], :popover-open')) return;
      const imMenue = menue.contains(document.activeElement);
      setze(false);
      if (imMenue) { e.preventDefault(); knopf.focus(); }
    });

    document.addEventListener('click', (e) => {
      if (knopf.getAttribute('aria-expanded') !== 'true') return;
      if (!knopf.contains(e.target) && !menue.contains(e.target)) setze(false);
    });
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/burgerknopf.js", fehler); } }

/* system/formular-codefelder.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.codefelder') ? [wurzel] : []), ...wurzel.querySelectorAll('.codefelder')];
for (const gruppe of treffer) {
  if (fertig.has(gruppe)) continue;
  fertig.add(gruppe);
  const felder = [...gruppe.querySelectorAll('input')];
  if (!felder.length) continue;

  felder.forEach((feld, i) => {
    feld.addEventListener('input', () => {
      feld.value = feld.value.replace(/\D/g, '').slice(-1);
      if (feld.value && felder[i + 1]) felder[i + 1].focus();
    });

    feld.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !feld.value && felder[i - 1]) {
        felder[i - 1].focus();
      }
    });

    feld.addEventListener('paste', (e) => {
      const ziffern = (e.clipboardData?.getData('text') || '')
        .replace(/\D/g, '')
        .slice(0, felder.length);
      if (!ziffern) return;
      e.preventDefault();
      felder.forEach((f, j) => { f.value = ziffern[j] ?? ''; });
      felder[Math.min(ziffern.length, felder.length - 1)].focus();
    });
  });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/formular-codefelder.js", fehler); } }

/* system/formular-dateiablage.js */
{ try {
(() => {
'use strict';
const DATEI_TAKT = 120;   /* ms je Schritt — nur für die Vorschau */

const DATEI_ZEICHEN = {
  dokument: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  gut: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  schlecht: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
};
const dateiSymbol = (pfade) =>
  `<svg class="symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`
  + ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pfade}</svg>`;

const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const endung = (name) => name.split('.').pop()?.toLowerCase() ?? '';
const kb = (bytes) => Math.round(bytes / 1024).toLocaleString('de-CH');

const grund = (ablage, datei) => {
  const maxMb = Number(ablage.dataset.maxMb || 5);
  const arten = (ablage.dataset.arten || 'pdf,jpg,jpeg,png').split(',').map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (!arten.includes('*') && !arten.includes(endung(datei.name))) {
    return `Nicht angenommen — erlaubt sind ${arten.join(', ').toUpperCase()}`;
  }
  if (datei.size > maxMb * 1024 * 1024) return `Nicht angenommen — grösser als ${maxMb} MB`;
  return '';
};

const kachel = (datei) => {
  const feldchen = document.createElement('div');
  feldchen.className = 'dateiablage__kachel';
  if (datei.type.startsWith('image/')) {
    const adresse = URL.createObjectURL(datei);
    for (const rolle of ['geist', 'echt']) {
      const bild = document.createElement('img');
      bild.className = `dateiablage__${rolle}`;
      bild.alt = '';
      bild.src = adresse;
      feldchen.append(bild);
    }
    feldchen.lastElementChild.addEventListener('load', () => URL.revokeObjectURL(adresse), { once: true });
  } else {
    feldchen.innerHTML =
      `<div class="dateiablage__geist">${dateiSymbol(DATEI_ZEICHEN.dokument)}</div>`
      + `<div class="dateiablage__echt">${dateiSymbol(DATEI_ZEICHEN.dokument)}</div>`;
  }
  return feldchen;
};

const einflug = (li, herkunft) => {
  if (!herkunft || ruhig()) return;
  const platz = li.getBoundingClientRect();
  li.animate([
    { transform: `translate(${herkunft.x - (platz.left + platz.width / 2)}px,`
               + ` ${herkunft.y - (platz.top + platz.height / 2)}px) scale(0.82)`, opacity: 0 },
    { transform: 'none', opacity: 1 },
  ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
};

function ladezeile(ablage, datei, herkunft) {
  const liste = ablage.querySelector('.dateiablage__liste');
  const li = document.createElement('li');
  const text = document.createElement('div');
  text.className = 'dateiablage__text';
  const name = document.createElement('b');
  name.className = 'dateiablage__name';
  name.textContent = datei.name;
  const mass = document.createElement('span');
  mass.className = 'dateiablage__mass';
  text.append(name, mass);
  const zustand = document.createElement('span');
  zustand.className = 'dateiablage__zustand';
  zustand.setAttribute('aria-hidden', 'true');
  zustand.innerHTML =
    `<span class="ist-gut">${dateiSymbol(DATEI_ZEICHEN.gut)}</span>`
    + `<span class="ist-schlecht">${dateiSymbol(DATEI_ZEICHEN.schlecht)}</span>`;
  li.append(kachel(datei), text, zustand);
  liste?.prepend(li);
  einflug(li, herkunft);

  const z = {
    zeile: li,
    abgelehnt: grund(ablage, datei),
    fortschritt(p) { li.style.setProperty('--p', String(Math.max(0, Math.min(1, p)))); },
    fertig(t) {
      li.style.setProperty('--p', '1');
      li.classList.add('ist-fertig');
      mass.textContent = t || `${kb(datei.size)} KB · übertragen`;
      if (ablage.classList.contains('dateiablage--kompakt')) setTimeout(() => li.remove(), 2500);
    },
    fehler(t) { li.classList.add('ist-fehler'); mass.textContent = t; },
  };
  if (z.abgelehnt) z.fehler(z.abgelehnt);
  else { mass.textContent = `${kb(datei.size)} KB · wird übertragen`; z.fortschritt(0); }
  return z;
}

function vorschau(ablage, datei, herkunft) {
  const z = ladezeile(ablage, datei, herkunft);
  if (z.abgelehnt) return;
  if (ruhig()) { z.fertig(); return; }
  let anteil = 0;
  const uhr = setInterval(() => {
    anteil = Math.min(1, anteil + 0.08 + Math.random() * 0.1);
    z.fortschritt(anteil);
    if (anteil >= 1) { clearInterval(uhr); z.fertig(); }
  }, DATEI_TAKT);
}

function nimm(ablage, dateien, herkunft) {
  dateien = [...dateien]; if (!dateien.length) return;
  if (ablage.hasAttribute('data-hochladen')) {
    ablage.dispatchEvent(new CustomEvent('dateiablage-dateien', { bubbles: true, detail: { dateien, herkunft } }));
    return;
  }
  for (const d of dateien) vorschau(ablage, d, herkunft);
}

document.addEventListener('change', (e) => {
  const feld = e.target.closest?.('.dateiablage__eingabe'); if (!feld?.files?.length) return;
  const ablage = feld.closest('.dateiablage'); if (!ablage) return;
  nimm(ablage, feld.files);
  feld.value = '';
});

const zielVon = (el) => el?.closest?.('.dateiablage')
  || el?.closest?.('[data-ablage-flaeche]')?.querySelector('.dateiablage');
const mitDateien = (e) => e.dataTransfer?.types?.includes('Files');
for (const art of ['dragenter', 'dragover']) {
  document.addEventListener(art, (e) => {
    const ablage = mitDateien(e) && zielVon(e.target); if (!ablage) return;
    e.preventDefault(); ablage.classList.add('ist-ueber');
  });
}
document.addEventListener('dragleave', (e) => {
  const ablage = zielVon(e.target); if (!ablage) return;
  if (zielVon(e.relatedTarget) !== ablage) ablage.classList.remove('ist-ueber');
});
document.addEventListener('drop', (e) => {
  const ablage = mitDateien(e) && zielVon(e.target); if (!ablage) return;
  e.preventDefault(); ablage.classList.remove('ist-ueber');
  if (!ablage.contains(e.target)) ablage.scrollIntoView({ block: 'nearest', behavior: ruhig() ? 'auto' : 'smooth' });
  nimm(ablage, e.dataTransfer.files, { x: e.clientX, y: e.clientY });
});

const offeneAblage = () =>
  document.activeElement?.closest?.('.dateiablage')
  || document.querySelector('dialog[open] [data-ablage-flaeche] .dateiablage, dialog[open] .dateiablage')
  || document.querySelector('[data-ablage-flaeche] .dateiablage');
document.addEventListener('pointerdown', (e) => {
  const zone = e.target.closest?.('.dateiablage__zone');
  zone?.closest('.dateiablage')?.querySelector('.dateiablage__eingabe')?.focus({ preventScroll: true });
});
const fang = (() => {
  const f = document.createElement('div');
  f.className = 'visually-hidden';
  f.contentEditable = 'true'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
  return f;
})();
const nimmtText = (el) => !!(el?.isContentEditable
  || el?.closest?.('input:not([type="file"]), textarea, select, [contenteditable]:not([contenteditable="false"])'));
document.addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'v' || e.shiftKey || e.altKey) return;
  if (nimmtText(e.target)) return;
  const ablage = offeneAblage(); if (!ablage) return;
  const vorher = document.activeElement;
  (ablage.closest('dialog') || document.body).append(fang);
  fang.textContent = ''; fang.focus({ preventScroll: true });
  setTimeout(() => { fang.textContent = ''; fang.remove(); if (vorher?.isConnected) vorher.focus?.({ preventScroll: true }); }, 300);
}, true);
const ausAblage = (cd) => {
  const f = [...(cd?.files || [])];
  return f.length ? f : [...(cd?.items || [])].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
};
const benenne = (f) => {
  if (f.name && !/^image\.(png|jpe?g)$/i.test(f.name)) return f;
  const d = new Date(), z = (n) => String(n).padStart(2, '0');
  const n = `Bildschirmfoto ${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}.${z(d.getMinutes())}.${z(d.getSeconds())}.${(f.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
  return new File([f], n, { type: f.type });
};
document.addEventListener('paste', (e) => {
  const imFang = e.target === fang || fang.contains(e.target);
  if (!imFang && nimmtText(e.target)) return;
  const dateien = ausAblage(e.clipboardData).map(benenne);
  if (!dateien.length) { if (imFang) e.preventDefault(); return; }
  const ablage = offeneAblage(); if (!ablage) return;
  e.preventDefault();
  ablage.scrollIntoView({ block: 'nearest', behavior: ruhig() ? 'auto' : 'smooth' });
  nimm(ablage, dateien, null);
});

window.Dateiablage = { ladezeile, nimm };
})();

} catch (fehler) { console.warn("marke.js · system/formular-dateiablage.js", fehler); } }

/* system/datentabelle.js */
{ try {

(() => {
function zahlAus(text) {
  const s = text
    .replace(/(\d)['’    ](?=\d)/g, '$1')
    .replace(/−/g, '-')
    .replace(',', '.');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.datentabelle') ? [wurzel] : []), ...wurzel.querySelectorAll('.datentabelle')];
for (const tabelle of treffer) {
  if (fertig.has(tabelle)) continue;
  fertig.add(tabelle);
  const koerper = tabelle.querySelector('tbody');
  if (!koerper) continue;

  const alle = tabelle.querySelector('thead input[type="checkbox"]');
  const einzeln = () => [...koerper.querySelectorAll('input[type="checkbox"]')];

  function standAngleichen() {
    if (!alle) return;
    const k = einzeln();
    const an = k.filter((x) => x.checked).length;
    alle.checked = an === k.length && k.length > 0;
    alle.indeterminate = an > 0 && an < k.length;
  }

  if (alle) {
    alle.addEventListener('change', () => {
      for (const k of einzeln()) k.checked = alle.checked;
      alle.indeterminate = false;
    });
    koerper.addEventListener('change', (e) => {
      if (e.target.matches('input[type="checkbox"]')) standAngleichen();
    });
    standAngleichen();
  }

  const kopfzellen = [...tabelle.querySelectorAll('thead th')];

  for (const [spalte, zelle] of kopfzellen.entries()) {
    const knopf = zelle.querySelector('button');
    if (!knopf) continue;

    knopf.addEventListener('click', () => {
      const vorher = zelle.getAttribute('aria-sort');
      const auf = vorher !== 'ascending';

      const zahlen = zelle.classList.contains('tabelle__zahl');
      const wert = (zeile) => {
        const z = zeile.children[spalte];
        if (!z) return zahlen ? 0 : '';
        const t = (z.dataset.sort ?? z.textContent).trim();
        if (zahlen) return zahlAus(t);
        return z.dataset.sort !== undefined && /^-?\d+(\.\d+)?$/.test(t)
          ? Number(t) : t;
      };

      const zeilen = [...koerper.rows].sort((a, b) => {
        const x = wert(a), y = wert(b);
        const beideZahlen = typeof x === 'number' && typeof y === 'number';
        const v = beideZahlen ? x - y : String(x).localeCompare(String(y), 'de');
        return auf ? v : -v;
      });
      koerper.append(...zeilen);

      for (const z of kopfzellen) z.removeAttribute('aria-sort');
      zelle.setAttribute('aria-sort', auf ? 'ascending' : 'descending');
    });
  }
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/datentabelle.js", fehler); } }

/* system/datumsfeld.js */
{ try {
(() => {
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const zweistellig = (n) => String(n).padStart(2, '0');
const alsIso = (d) => `${d.getFullYear()}-${zweistellig(d.getMonth() + 1)}-${zweistellig(d.getDate())}`;
const alsText = (d) => `${zweistellig(d.getDate())}.${zweistellig(d.getMonth() + 1)}.${d.getFullYear()}`;
const ausIso = (t) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const ausText = (t) => {
  t = (t || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return ausIso(t);
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(t);
  if (!m) return null;
  const jahr = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  const d = new Date(jahr, +m[2] - 1, +m[1]);
  return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
};
const tag = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function baue(wurzel) {
  if (wurzel.hasAttribute('data-datumsfeld-bereit')) return;
  wurzel.setAttribute('data-datumsfeld-bereit', '');
  const eingabe = wurzel.querySelector('.datumsfeld__eingabe');
  const knopf = wurzel.querySelector('.datumsfeld__knopf');
  const blatt = wurzel.querySelector('.datumsfeld__blatt');
  const wert = wurzel.querySelector('.datumsfeld__wert');
  if (!eingabe || !knopf || !blatt) return;

  const min = ausIso(wurzel.dataset.min);
  const max = ausIso(wurzel.dataset.max);
  const heute = tag(new Date());
  let gewaehlt = ausText(eingabe.value) ?? ausIso(wert?.value ?? '');
  let blick = tag(gewaehlt ?? min ?? heute);

  const imBereich = (d) => (!min || d >= min) && (!max || d <= max);

  function zeichne() {
    const jahr = blick.getFullYear();
    const monat = blick.getMonth();
    const erster = new Date(jahr, monat, 1);
    const versatz = (erster.getDay() + 6) % 7;
    const tageImMonat = new Date(jahr, monat + 1, 0).getDate();

    const zurueck = !min || new Date(jahr, monat, 0) >= min;
    const weiter = !max || new Date(jahr, monat + 1, 1) <= max;

    const zellen = [];
    for (let i = 0; i < versatz; i++) zellen.push('<span></span>');
    for (let t = 1; t <= tageImMonat; t++) {
      const d = new Date(jahr, monat, t);
      const klassen = ['datumsfeld__tag'];
      if (+d === +heute) klassen.push('datumsfeld__tag--heute');
      const gesetzt = gewaehlt && +d === +gewaehlt;
      zellen.push(
        `<button type="button" class="${klassen.join(' ')}" data-datum="${alsIso(d)}"` +
        ` aria-pressed="${gesetzt ? 'true' : 'false'}"${imBereich(d) ? '' : ' disabled'}>` +
        `${t}</button>`
      );
    }

    blatt.innerHTML = `
      <div class="datumsfeld__steuer">
        <button type="button" class="datumsfeld__schritt" data-schritt="-1"
                aria-label="Vorheriger Monat"${zurueck ? '' : ' disabled'}>
          <svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="datumsfeld__monat" aria-live="polite">${MONATE[monat]} ${jahr}</span>
        <button type="button" class="datumsfeld__schritt" data-schritt="1"
                aria-label="Nächster Monat"${weiter ? '' : ' disabled'}>
          <svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div class="datumsfeld__raster" role="grid">
        ${WOCHENTAGE.map((w) => `<span class="datumsfeld__wochentag">${w}</span>`).join('')}
        ${zellen.join('')}
      </div>
      <div class="datumsfeld__fuss">
        <button type="button" class="btn btn--still btn--klein" data-zurueck>Zurück</button>
        <button type="button" class="btn btn--zwei btn--klein" data-heute
                ${imBereich(heute) ? '' : 'disabled'}>Heute</button>
      </div>`;
  }

  function oeffne() {
    blick = tag(gewaehlt ?? min ?? heute);
    zeichne();
    blatt.hidden = false;
    knopf.setAttribute('aria-expanded', 'true');
    (blatt.querySelector('[aria-pressed="true"]') || blatt.querySelector('.datumsfeld__tag:not(:disabled)'))?.focus();
  }
  function schliesse(zurueckZumKnopf = true) {
    blatt.hidden = true;
    knopf.setAttribute('aria-expanded', 'false');
    if (zurueckZumKnopf) knopf.focus();
  }
  function setze(d, melden = true) {
    gewaehlt = d ? tag(d) : null;
    eingabe.value = gewaehlt ? alsText(gewaehlt) : '';
    eingabe.setCustomValidity('');
    if (wert) wert.value = gewaehlt ? alsIso(gewaehlt) : '';
    if (melden) eingabe.dispatchEvent(new Event('change', { bubbles: true }));
  }

  knopf.addEventListener('click', () => (blatt.hidden ? oeffne() : schliesse()));

  knopf.tabIndex = -1;
  eingabe.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' || !blatt.hidden || e.shiftKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    oeffne();
  });

  blatt.addEventListener('click', (e) => {
    const schritt = e.target.closest('[data-schritt]');
    if (schritt) {
      blick = new Date(blick.getFullYear(), blick.getMonth() + Number(schritt.dataset.schritt), 1);
      zeichne();
      blatt.querySelector('.datumsfeld__tag:not(:disabled)')?.focus();
      return;
    }
    if (e.target.closest('[data-heute]')) { setze(heute); schliesse(); return; }
    if (e.target.closest('[data-zurueck]')) { schliesse(); return; }
    const t = e.target.closest('[data-datum]');
    if (t) { setze(ausIso(t.dataset.datum)); schliesse(); }
  });

  blatt.addEventListener('keydown', (e) => {
    const t = e.target.closest('[data-datum]');
    if (!t) return;
    const schritte = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let ziel = null;
    if (e.key in schritte) {
      ziel = ausIso(t.dataset.datum);
      ziel.setDate(ziel.getDate() + schritte[e.key]);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      ziel = ausIso(t.dataset.datum);
      ziel.setMonth(ziel.getMonth() + (e.key === 'PageUp' ? -1 : 1));
    } else return;
    e.preventDefault();
    if (!imBereich(ziel)) return;
    blick = ziel;
    zeichne();
    blatt.querySelector(`[data-datum="${alsIso(ziel)}"]`)?.focus();
  });

  wurzel.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || blatt.hidden || e.defaultPrevented) return;
    e.preventDefault(); e.stopPropagation();
    schliesse(document.activeElement !== eingabe);
  });

  const pruefe = () => {
    const roh = eingabe.value.trim(), d = roh ? ausText(roh) : null;
    const falsch = roh && (!d || !imBereich(d));
    eingabe.setCustomValidity(falsch ? (eingabe.dataset.fehler || (d ? 'Dieses Datum liegt ausserhalb des erlaubten Bereichs.' : 'Kein gültiges Datum. Beispiel: 14.10.2026')) : '');
  };
  eingabe.addEventListener('input', pruefe);
  eingabe.addEventListener('change', () => {
    pruefe();
    const d = ausText(eingabe.value);
    if (d && imBereich(d)) setze(d, false);
  });

  AUSSEN.set(wurzel, () => { if (!blatt.hidden) schliesse(false); });
  ZUMACHEN.set(wurzel, () => {
    if (blatt.hidden) return;
    const imBlatt = blatt.contains(document.activeElement);
    schliesse(false);
    if (imBlatt) knopf.focus({ preventScroll: true });
  });
}

const ZUMACHEN = new Map();
const AUSSEN = new Map();
document.addEventListener('click', (e) => {
  for (const [wurzel, zu] of AUSSEN) {
    if (!wurzel.isConnected) { AUSSEN.delete(wurzel); continue; }
    if (!e.composedPath().includes(wurzel)) zu();
  }
});
document.addEventListener('scroll', (e) => {
  for (const [wurzel, zu] of ZUMACHEN) {
    if (!wurzel.isConnected) { ZUMACHEN.delete(wurzel); continue; }
    const blatt = wurzel.querySelector('.datumsfeld__blatt');
    if (!blatt || blatt.hidden || blatt.contains(e.target)) continue;
    const rollt = e.target === document || e.target.contains?.(wurzel);
    if (rollt && getComputedStyle(blatt).position === 'fixed') zu();
  }
}, { capture: true, passive: true });

const alleFelder = (wurzel) => {
  if (wurzel.matches?.('.datumsfeld')) baue(wurzel);
  for (const f of wurzel.querySelectorAll?.('.datumsfeld') ?? []) baue(f);
};
alleFelder(document);
new MutationObserver((liste) => {
  for (const m of liste) for (const n of m.addedNodes) if (n.nodeType === 1) alleFelder(n);
}).observe(document.documentElement, { childList: true, subtree: true });
const lies = (t) => { if (!String(t ?? '').trim()) return ''; const d = ausText(String(t)); return d ? alsIso(d) : null; };
window.Datumsfeld = { baue, lies };
})();

} catch (fehler) { console.warn("marke.js · system/datumsfeld.js", fehler); } }

/* system/feld-vorschlag.js */
{ try {
(() => {
const heute = () => {
  const d = new Date(), z = (n) => String(n).padStart(2, '0');
  return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}`;
};
const wert = (feld) => (feld.dataset.vorschlag === 'heute' ? heute() : feld.dataset.vorschlag);

function ruesteAus(feld) {
  const v = wert(feld);
  if (!v) return;
  feld.placeholder = v;
  feld.setAttribute('aria-description', `Vorschlag ${v}, mit Shift übernehmen`);
}
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('[data-vorschlag]') ? [wurzel] : []), ...wurzel.querySelectorAll('[data-vorschlag]')];
  for (const f of treffer) {
    if (fertig.has(f)) continue;
    fertig.add(f);
    ruesteAus(f);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
document.addEventListener('focusin', (e) => { if (e.target.matches?.('[data-vorschlag]')) ruesteAus(e.target); });

function uebernimm(feld) {
  if (feld.value !== '' || feld.disabled || feld.readOnly) return false;
  feld.value = wert(feld);
  feld.dispatchEvent(new Event('input', { bubbles: true }));
  feld.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

let nurShift = false;
document.addEventListener('keydown', (e) => {
  const feld = e.target.closest?.('[data-vorschlag]');
  if (e.key === 'Shift') { nurShift = !!feld && !e.repeat; return; }
  nurShift = false;
  if (feld && e.key === 'ArrowRight' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey && uebernimm(feld)) e.preventDefault();
}, true);
document.addEventListener('keyup', (e) => {
  if (e.key !== 'Shift' || !nurShift) return;
  nurShift = false;
  const feld = e.target.closest?.('[data-vorschlag]');
  if (feld) uebernimm(feld);
}, true);
document.addEventListener('pointerdown', () => { nurShift = false; }, true);
})();

} catch (fehler) { console.warn("marke.js · system/feld-vorschlag.js", fehler); } }

/* system/dokumentbuehne.js */
{ try {
(() => {
'use strict';
const STUFEN = [50, 67, 75, 90, 100, 110, 125, 150, 200];
const schluessel = (b) => b.dataset.dokumentbuehne || 'dokumentbuehne-zoom';
const lesen = (b) => { try { const z = localStorage.getItem(schluessel(b)); return !z || z === 'fit' ? 'fit' : Number(z) || 'fit'; } catch (_) { return 'fit'; } };
const ziel = (b) => b.querySelector('.dokumentbuehne__skala')?.firstElementChild || null;

function massstab(b, zoom = lesen(b)) {
  const rahmen = b.querySelector('.dokumentbuehne__rahmen'), d = ziel(b);
  if (!rahmen || !d) return 1;
  return zoom === 'fit' ? Math.min(1, rahmen.clientWidth / (d.offsetWidth || 1)) : zoom / 100;
}
function messen(b) {
  const skala = b.querySelector('.dokumentbuehne__skala'), rahmen = b.querySelector('.dokumentbuehne__rahmen'), d = ziel(b);
  if (!skala || !rahmen || !d || !rahmen.clientWidth) return;
  const zoom = lesen(b), s = massstab(b, zoom);
  d.style.transform = s === 1 ? '' : `scale(${s})`;
  skala.style.width = `${d.offsetWidth * s}px`;
  skala.style.height = `${d.offsetHeight * s}px`;
  const mass = `${s}|${rahmen.clientWidth}`;
  if (b.dataset.mass !== mass) { b.dataset.mass = mass; rahmen.scrollLeft = Math.max(0, (rahmen.scrollWidth - rahmen.clientWidth) / 2); }
  const p = b.querySelector('[data-zoom-prozent]'); if (p) p.textContent = `${Math.round(s * 100)} %`;
  b.querySelector('[data-zoom="fit"]')?.setAttribute('aria-pressed', String(zoom === 'fit'));
  pruefeA4(b);
  b.dispatchEvent(new CustomEvent('dokumentbuehne-gemessen', { bubbles: true, detail: { massstab: s } }));
}

const A4_PX = 297 * 96 / 25.4;
function pruefeA4(b) {
  const blaetter = [...b.querySelectorAll('[data-a4]')], lang = [];
  blaetter.forEach((x, i) => { const zu = x.offsetHeight > A4_PX + 1; x.toggleAttribute('data-zu-lang', zu); if (zu) lang.push(i + 1); });
  const h = b.querySelector('[data-dokumentbuehne-hinweis]'); if (!h) return;
  h.hidden = !lang.length;
  const t = h.querySelector('[data-dokumentbuehne-hinweis-text]');
  if (t && lang.length) t.textContent = blaetter.length > 1 ? `Seite ${lang.join(' und ')} länger als A4` : 'Länger als eine Seite';
}

function druckWeg() {
  document.querySelector('body > .druckkopie')?.remove();
  document.getElementById('druckkopie-seite')?.remove();
  document.documentElement.removeAttribute('data-druckkopie');
}
function drucken(blaetter, { seite = 'A4' } = {}) {
  druckWeg();
  if (!blaetter?.length) return null;
  const halter = document.createElement('div');
  halter.className = 'druckkopie';
  halter.append(...blaetter);
  document.body.append(halter);
  const stil = document.createElement('style');
  stil.id = 'druckkopie-seite';
  stil.textContent = `@page dokument { size: ${seite}; margin: 0; }`;
  document.head.append(stil);
  document.documentElement.setAttribute('data-druckkopie', '');
  return halter;
}

const ro = window.ResizeObserver ? new ResizeObserver((eintraege) => {
  const buehnen = new Set(eintraege.map((e) => e.target.closest('.dokumentbuehne')).filter(Boolean));
  buehnen.forEach(messen);
}) : null;
function einrichten(wurzel = document) {
  for (const b of wurzel.querySelectorAll?.('.dokumentbuehne:not([data-dokumentbuehne-bereit])') || []) {
    b.setAttribute('data-dokumentbuehne-bereit', '');
    if (ro) { ro.observe(b.querySelector('.dokumentbuehne__rahmen')); const d = ziel(b); if (d) ro.observe(d); }
    messen(b);
  }
}

document.addEventListener('click', (e) => {
  const k = e.target.closest?.('.dokumentbuehne [data-zoom]'); if (!k) return;
  const b = k.closest('.dokumentbuehne'), jetzt = Math.round(massstab(b) * 100), w = k.dataset.zoom, alt = lesen(b);
  let neu;
  if (w === 'fit') neu = alt === 'fit' ? 100 : 'fit';
  else if (w === 'minus') neu = [...STUFEN].reverse().find((s) => s < jetzt) ?? STUFEN[0];
  else if (w === 'plus') neu = STUFEN.find((s) => s > jetzt) ?? STUFEN.at(-1);
  else neu = Number(w) || 100;
  try { localStorage.setItem(schluessel(b), String(neu)); } catch (_) {}
  for (const x of document.querySelectorAll('.dokumentbuehne')) if (schluessel(x) === schluessel(b)) messen(x);
});

document.fonts?.ready.then(() => document.querySelectorAll('.dokumentbuehne').forEach(messen));
new MutationObserver((m) => { if (m.some((x) => x.addedNodes.length)) einrichten(); }).observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => einrichten()); else einrichten();

window.Dokumentbuehne = { einrichten, messen, drucken, druckWeg };
})();

} catch (fehler) { console.warn("marke.js · system/dokumentbuehne.js", fehler); } }

/* system/formular-auswahl.js */
{ try {
(() => {
function richtungSetzen(auswahl) {
  const liste = auswahl.querySelector('.eigenauswahl__liste');
  if (!liste) return;
  const feld = auswahl.querySelector('summary') ?? auswahl;
  const unten = window.innerHeight - feld.getBoundingClientRect().bottom;
  const stil = getComputedStyle(liste);
  const deckel = parseFloat(stil.maxHeight);
  const rand = parseFloat(stil.borderTopWidth) + parseFloat(stil.borderBottomWidth);
  const voll = (liste.scrollHeight || liste.getBoundingClientRect().height) + rand;
  const braucht = Number.isFinite(deckel) ? Math.min(voll, deckel) : voll;
  auswahl.dataset.richtung = unten < braucht ? 'oben' : 'unten';
}

const anzeigeVon = (auswahl) => auswahl?.querySelector(':scope > summary .eigenauswahl__wert, .eigenauswahl__wert');
function leerMerken(auswahl) {
  const anzeige = anzeigeVon(auswahl);
  if (anzeige && !auswahl.querySelector('input[type="radio"]:checked') && !('leer' in anzeige.dataset)) anzeige.dataset.leer = anzeige.textContent.trim();
}
function titelSetzen(auswahl) {
  const anzeige = anzeigeVon(auswahl); if (!anzeige || auswahl.hasAttribute('data-mehrfach')) return;
  const text = anzeige.textContent.trim();
  if (anzeige.title !== text) anzeige.title = text;
}
const einrichten = (wurzel) => {
  for (const auswahl of [...(wurzel.matches?.('.eigenauswahl') ? [wurzel] : []), ...wurzel.querySelectorAll('.eigenauswahl')]) { leerMerken(auswahl); titelSetzen(auswahl); }
};
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
document.addEventListener('toggle', (e) => {
  const auswahl = e.target;
  if (!auswahl.matches?.('details.eigenauswahl') || !auswahl.open) return;
  leerMerken(auswahl); richtungSetzen(auswahl);
}, true);
window.addEventListener('resize', () => { for (const a of document.querySelectorAll('details.eigenauswahl[open]')) richtungSetzen(a); });
document.addEventListener('pointerdown', (e) => { const a = e.target.closest?.('details.eigenauswahl'); if (a) leerMerken(a); }, true);
document.addEventListener('pointerover', (e) => { const a = e.target.closest?.('details.eigenauswahl'); if (a) titelSetzen(a); }, true);

document.addEventListener('change', (e) => {
  const gewaehlt = e.target;
  if (!(gewaehlt instanceof HTMLInputElement) || gewaehlt.type !== 'radio') return;
  const auswahl = gewaehlt.closest('.eigenauswahl');
  const anzeige = anzeigeVon(auswahl);
  if (!anzeige || auswahl.hasAttribute('data-mehrfach')) return;

  if (!gewaehlt.checked) {
    anzeige.textContent = anzeige.dataset.leer ?? '–';
    delete anzeige.dataset.tonZustand;
  } else {
    const quelle = gewaehlt.closest('.wahl')?.querySelector('.wahl__text');
    if (quelle?.hasAttribute('data-ton-zustand')) {
      anzeige.replaceChildren(...[...quelle.childNodes].map((n) => n.cloneNode(true)));
      anzeige.dataset.tonZustand = quelle.dataset.tonZustand;
    } else {
      anzeige.textContent = (quelle?.dataset.kurz ?? quelle?.textContent ?? gewaehlt.value).trim();
      delete anzeige.dataset.tonZustand;
    }
  }
  titelSetzen(auswahl);

  if (auswahl.open) {
    auswahl.open = false;
    auswahl.querySelector('summary')?.focus();
  }
});

document.addEventListener('pointerdown', (e) => {
  for (const offen of document.querySelectorAll('details.eigenauswahl[open]')) {
    if (!offen.contains(e.target)) offen.open = false;
  }
});
document.addEventListener('scroll', (e) => {
  for (const offen of document.querySelectorAll('details.eigenauswahl[open]')) {
    const liste = offen.querySelector('.eigenauswahl__liste');
    if (!liste || liste.contains(e.target)) continue;
    if ((e.target === document || e.target.contains?.(offen)) && getComputedStyle(liste).position === 'fixed') offen.open = false;
  }
}, { capture: true, passive: true });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const offen = e.target.closest?.('details.eigenauswahl[open]');
  if (!offen) return;
  e.preventDefault();
  offen.open = false;
  offen.querySelector('summary')?.focus();
});

document.addEventListener('pointerdown', (e) => {
  const wahl = e.target.closest?.('.eigenauswahl .wahl');
  if (wahl) wahl.dataset.war = wahl.querySelector('input[type="radio"]')?.checked ? '1' : '';
}, true);
document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.('.eigenauswahl .wahl input[type="radio"]');
  if (!knopf) return;
  const wahl = knopf.closest('.wahl');
  const war = wahl.dataset.war === '1';
  delete wahl.dataset.war;
  if (!war) return;
  const auswahl = knopf.closest('details.eigenauswahl');
  if (!auswahl || auswahl.hasAttribute('data-pflicht')) return;
  const leer = auswahl.querySelector('input[type="radio"][value=""]');
  if (leer === knopf) return;
  const ziel = leer ?? knopf;
  ziel.checked = Boolean(leer);
  ziel.dispatchEvent(new Event('change', { bubbles: true }));
});

function eigenauswahlZeigen(auswahl) {
  const anzeige = auswahl?.querySelector('.eigenauswahl__wert'); if (!anzeige) return;
  if (!('leer' in anzeige.dataset)) anzeige.dataset.leer = 'Keine';
  const namen = [...auswahl.querySelectorAll('input[type="checkbox"]:checked')].map((x) => (x.closest('.wahl')?.querySelector('.wahl__text')?.textContent ?? x.value).trim());
  anzeige.textContent = namen.length ? namen.join(', ') : anzeige.dataset.leer;
  anzeige.title = namen.join(', ');
}
document.addEventListener('change', (e) => {
  const x = e.target; if (!(x instanceof HTMLInputElement) || x.type !== 'checkbox') return;
  const auswahl = x.closest('details.eigenauswahl[data-mehrfach]'); if (auswahl) eigenauswahlZeigen(auswahl);
});
window.eigenauswahlZeigen = eigenauswahlZeigen;
})();

} catch (fehler) { console.warn("marke.js · system/formular-auswahl.js", fehler); } }

/* system/einblenden.js */
{ try {
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var io = new IntersectionObserver(function (liste) {
    liste.forEach(function (eintrag) {
      if (!eintrag.isIntersecting) return;
      eintrag.target.classList.add('ist-da');
      io.unobserve(eintrag.target);
    });
  }, { rootMargin: '0px 0px -50px 0px' });

  var fertig = new WeakSet();
  function einrichten(wurzel) {
    var treffer = (wurzel.matches && wurzel.matches('.einblenden') ? [wurzel] : []).concat(Array.prototype.slice.call(wurzel.querySelectorAll('.einblenden')));
    treffer.forEach(function (w) {
      if (fertig.has(w)) return;
      fertig.add(w);
      w.classList.add('ist-bereit');
      Array.prototype.forEach.call(w.querySelectorAll('.einblenden__teil'), function (t) { io.observe(t); });
    });
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', function (e) { einrichten(e.target instanceof Element ? e.target : document); });
})();

} catch (fehler) { console.warn("marke.js · system/einblenden.js", fehler); } }

/* system/formular-zeichenzaehler.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.feld:has(.zeichenzaehler)') ? [wurzel] : []), ...wurzel.querySelectorAll('.feld:has(.zeichenzaehler)')];
for (const feld of treffer) {
  if (fertig.has(feld)) continue;
  fertig.add(feld);

  const eingabe = feld.querySelector('textarea[maxlength], input[maxlength]');
  const zaehler = feld.querySelector('.zeichenzaehler');
  const ist = zaehler?.querySelector('.zeichenzaehler__ist');
  const meldung = feld.querySelector('.zeichenzaehler__meldung');
  const max = Number(eingabe?.getAttribute('maxlength'));
  if (!eingabe || !ist || !max) continue;

  const schwelle = Number(eingabe.dataset.warnung) || Math.round(max / 6);

  const texte = {
    ruhig: '',
    warn: `Weniger als ${schwelle} Zeichen übrig.`,
    grenze: `Die Grenze von ${max} Zeichen ist erreicht.`,
  };

  let stand = null;

  const zeige = () => {
    const laenge = eingabe.value.length;
    const rest = max - laenge;
    ist.textContent = String(laenge);

    const neu = rest <= 0 ? 'grenze' : rest <= schwelle ? 'warn' : 'ruhig';

    zaehler.classList.toggle('ist-warn', neu === 'warn');
    zaehler.classList.toggle('ist-fail', neu === 'grenze');

    if (neu === stand) return;
    stand = neu;
    if (!meldung) return;
    meldung.textContent = texte[neu];
    meldung.classList.toggle('ist-fail', neu === 'grenze');
  };

  eingabe.addEventListener('input', zeige);
  zeige();
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/formular-zeichenzaehler.js", fehler); } }

/* system/einstellungszeile.js */
{ try {
(() => {
const FELDER = 'input, select, textarea';

const lesen = (el) => (el.type === 'checkbox' || el.type === 'radio' ? String(el.checked) : el.value);
const setzen = (el, wert) => {
  if (el.type === 'checkbox' || el.type === 'radio') el.checked = wert === 'true';
  else el.value = wert;
};

const gespeichert = new WeakMap();
const standard = new WeakMap();

const standardVon = (el) => el.dataset.standard ?? standard.get(el) ?? lesen(el);

const stellen = (zeile) => {
  const felder = [...zeile.querySelectorAll(FELDER)];
  const abweichend = felder.some((el) => lesen(el) !== standardVon(el));
  const offen = felder.some((el) => lesen(el) !== gespeichert.get(el));
  zeile.dataset.geaendert = abweichend ? 'ja' : 'nein';
  if (zeile.querySelector('.einstellungszeile__leiste')) zeile.dataset.offen = offen ? 'ja' : 'nein';
  for (const knopf of zeile.querySelectorAll('.einstellungszeile__zurueck')) knopf.inert = !abweichend;
};

const merken = (zeile) => {
  for (const el of zeile.querySelectorAll(FELDER)) gespeichert.set(el, lesen(el));
  stellen(zeile);
};

const zuruecknehmen = (zeile, aufStandard) => {
  for (const el of zeile.querySelectorAll(FELDER)) {
    setzen(el, aufStandard ? standardVon(el) : gespeichert.get(el));
  }
  for (const el of zeile.querySelectorAll('input[type="radio"]:checked')) {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (zeile.querySelector('.einstellungszeile__leiste')) stellen(zeile);
  else merken(zeile);
};

const kennen = (el) => {
  if (!standard.has(el)) standard.set(el, lesen(el));
  if (!gespeichert.has(el)) gespeichert.set(el, lesen(el));
};

const aufsetzen = (zeile) => {
  for (const el of zeile.querySelectorAll(FELDER)) kennen(el);
  stellen(zeile);
};

for (const zeile of document.querySelectorAll('.einstellungszeile')) aufsetzen(zeile);

new MutationObserver((eintraege) => {
  for (const e of eintraege) {
    for (const knoten of e.addedNodes) {
      if (knoten.nodeType !== 1) continue;
      if (knoten.matches('.einstellungszeile')) aufsetzen(knoten);
      for (const zeile of knoten.querySelectorAll('.einstellungszeile')) aufsetzen(zeile);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('input', (e) => {
  const zeile = e.target.closest?.('.einstellungszeile');
  if (!zeile) return;
  const sofort = !zeile.querySelector('.einstellungszeile__leiste');
  if (sofort) merken(zeile);
  else stellen(zeile);
});

document.addEventListener('click', (e) => {
  const zeile = e.target.closest?.('.einstellungszeile');
  if (!zeile) return;
  if (e.target.closest('.einstellungszeile__zurueck')) zuruecknehmen(zeile, true);
  else if (e.target.closest('[data-verwerfen]')) zuruecknehmen(zeile, false);
  else if (e.target.closest('[data-speichern]')) merken(zeile);
});

const pruefeLoeschname = (feld) => {
  const knopf = document.getElementById(feld.dataset.loeschname);
  if (knopf) knopf.disabled = feld.value !== (feld.dataset.name ?? '');
};
const alleLoeschnamen = (wurzel) => {
  if (wurzel.matches?.('[data-loeschname]')) pruefeLoeschname(wurzel);
  for (const f of wurzel.querySelectorAll?.('[data-loeschname]') ?? []) pruefeLoeschname(f);
};
document.addEventListener('input', (e) => {
  if (e.target.matches?.('[data-loeschname]')) pruefeLoeschname(e.target);
});
document.addEventListener('close', (e) => {
  for (const f of e.target.querySelectorAll?.('[data-loeschname]') ?? []) { f.value = ''; pruefeLoeschname(f); }
}, true);
alleLoeschnamen(document);
new MutationObserver((liste) => {
  for (const m of liste) for (const n of m.addedNodes) if (n.nodeType === 1) alleLoeschnamen(n);
}).observe(document.documentElement, { childList: true, subtree: true });
})();

} catch (fehler) { console.warn("marke.js · system/einstellungszeile.js", fehler); } }

/* system/ereignisliste.js */
{ try {
(() => {
  const wurzel = document.documentElement;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (name) => parseFloat(getComputedStyle(wurzel).getPropertyValue(name)) || 0;
  const warte = (t) => new Promise((r) => setTimeout(r, t));

  const fertig = new WeakSet();
  function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.ereignisliste') ? [wurzel] : []), ...wurzel.querySelectorAll('.ereignisliste')];
  for (const abschnitt of treffer) {
    if (fertig.has(abschnitt)) continue;
    fertig.add(abschnitt);

    const liste = abschnitt.querySelector('[data-eintraege]');
    if (!liste) continue;
    const eintraege = [...liste.children];
    const knopf = abschnitt.querySelector('[data-ereignisliste-start]');
    const stand = abschnitt.querySelector('[data-stand]');
    let laeuft = false, angehalten = false, sichtbar = false;
    const zeigeAlles = () => { for (const e of eintraege) e.classList.add('ist-da'); liste.classList.remove('ist-spielend'); liste.removeAttribute('aria-busy'); ansage(); };

    let angesagt = false;
    const ansage = () => { if (stand && !angesagt) { stand.textContent = `${eintraege.length} Aufträge heute eingegangen`; angesagt = true; } };
    const spiele = async () => {
      if (laeuft) return;
      laeuft = true;
      liste.classList.add('ist-spielend');
      liste.setAttribute('aria-busy', 'true');
      for (const e of eintraege) e.classList.remove('ist-da');
      void liste.offsetWidth;
      for (const e of [...eintraege].reverse()) {
        await warte(ms('--t-lang'));
        if (angehalten) break;
        e.classList.add('ist-da');
      }
      if (!angehalten) await warte(ms('--t-slow'));
      zeigeAlles();
      laeuft = false;
      if (!angehalten) { await warte(ms('--t-lang') * 4); if (!angehalten && sichtbar) spiele(); }
    };

    if (knopf) {
      if (ruhig) knopf.hidden = true;
      else {
        knopf.setAttribute('aria-pressed', 'false');
        knopf.addEventListener('click', () => {
          angehalten = !angehalten;
          knopf.setAttribute('aria-pressed', String(angehalten));
          knopf.textContent = angehalten ? knopf.dataset.aus : knopf.dataset.an;
          if (angehalten) zeigeAlles(); else if (!laeuft) spiele();
        });
      }
    }
    if (!ruhig && 'IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        sichtbar = e[0].isIntersecting;
        if (sichtbar && !laeuft && !angehalten) spiele();
      }, { threshold: 0.4 }).observe(liste);
    }
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/ereignisliste.js", fehler); } }

/* system/fadenkreuz.js */
{ try {
(() => {
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const beiThemeWechsel = (fn) => {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
  new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
};


const klemme = (w, a, b) => Math.min(b, Math.max(a, w));
const ZIELE = ['lock', 'glitch', 'none'];
const LINIEN = ['solid', 'dashed', 'dotted'];

const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.fadenkreuz') ? [ort] : []), ...ort.querySelectorAll('.fadenkreuz')];
  for (const host of treffer) {
    if (fertig.has(host)) continue;
    fertig.add(host);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'fadenkreuz__leinwand';
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) continue;

  const einst = {
    thickness: 1,
    opacity: 0.85,
    lineStyle: LINIEN.includes(host.dataset.linie) ? host.dataset.linie : 'solid',
    gap: 0,
    smoothing: 0.35,
    showCoordinates: host.dataset.koordinaten !== 'aus',
    targetEffect: ZIELE.includes(host.dataset.ziel) ? host.dataset.ziel : 'lock',
    targetSelector: 'a, button, [data-fadenkreuz-ziel]',
    clickPulse: true,
  };
  const reduce = reduziert();
  const state = {
    x: 0, y: 0, tx: 0, ty: 0, clientX: 0, clientY: 0,
    inside: false, seen: false, presence: 0, glitch: 0, target: null,
    lock: { x: 0, y: 0, w: 0, h: 0, alpha: 0 }, pulses: [],
  };
  const size = { w: 0, h: 0, dpr: 1 };
  let tinte = '', papier = '', schrift = '';
  let raf = 0, last = 0;

  function farbenLesen() {
    const stil = getComputedStyle(host);
    tinte = stil.color;
    papier = stil.backgroundColor;
    schrift = `${stil.fontWeight} 10px ${stil.fontFamily}`;
    wake();
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    size.dpr = Math.min(window.devicePixelRatio || 1, 2);
    size.w = rect.width;
    size.h = rect.height;
    canvas.width = Math.max(1, Math.round(rect.width * size.dpr));
    canvas.height = Math.max(1, Math.round(rect.height * size.dpr));
    wake();
  };

  const crisp = (v, breite) => {
    const geraet = Math.round(breite * size.dpr);
    return (Math.round(v * size.dpr) + (geraet % 2 ? 0.5 : 0)) / size.dpr;
  };

  const marke = (text, x, y, align) => {
    ctx.font = schrift;
    const b = ctx.measureText(text).width + 10;
    const h = 16;
    let links = align === 'center' ? x - b / 2 : x;
    let oben = align === 'middle' ? y - h / 2 : y;
    links = klemme(links, 4, size.w - b - 4);
    oben = klemme(oben, 4, size.h - h - 4);
    ctx.fillStyle = tinte;
    ctx.beginPath();
    ctx.roundRect(links, oben, b, h, 3);
    ctx.fill();
    ctx.fillStyle = papier;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, links + b / 2, oben + h / 2 + 0.5);
  };

  const strecke = (x1, y1, x2, y2, waagrecht) => {
    const laenge = waagrecht ? x2 - x1 : y2 - y1;
    if (laenge <= 0) return;
    ctx.strokeStyle = tinte;
    ctx.beginPath();
    if (state.glitch > 0.01) {
      const stuecke = Math.max(4, Math.round(laenge / 28));
      for (let i = 0; i < stuecke; i++) {
        const wackel = (Math.random() - 0.5) * 14 * state.glitch;
        const von = i / stuecke, bis = (i + 1) / stuecke;
        if (waagrecht) {
          ctx.moveTo(x1 + laenge * von, y1 + wackel);
          ctx.lineTo(x1 + laenge * bis, y1 + wackel);
        } else {
          ctx.moveTo(x1 + wackel, y1 + laenge * von);
          ctx.lineTo(x1 + wackel, y1 + laenge * bis);
        }
      }
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  };

  const ecken = (x, y, w, h) => {
    const arm = Math.min(14, w / 3, h / 3);
    ctx.strokeStyle = tinte;
    ctx.lineWidth = Math.max(1.5, einst.thickness);
    ctx.setLineDash([]);
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(x, y + arm); ctx.lineTo(x, y); ctx.lineTo(x + arm, y);
    ctx.moveTo(x + w - arm, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + arm);
    ctx.moveTo(x + w, y + h - arm); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - arm, y + h);
    ctx.moveTo(x + arm, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - arm);
    ctx.stroke();
  };

  const zeichnen = () => {
    const s = einst;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    if (state.presence > 0.001) {
      ctx.globalAlpha = state.presence * s.opacity * (1 - 0.6 * state.lock.alpha);
      ctx.lineWidth = s.thickness;
      ctx.lineCap = s.lineStyle === 'dotted' ? 'round' : 'butt';
      if (s.lineStyle === 'dashed') ctx.setLineDash([s.thickness * 6, s.thickness * 5]);
      else if (s.lineStyle === 'dotted') ctx.setLineDash([0, s.thickness * 4]);
      else ctx.setLineDash([]);
      const x = crisp(state.x, s.thickness);
      const y = crisp(state.y, s.thickness);
      strecke(0, y, x - s.gap, y, true);
      strecke(x + s.gap, y, size.w, y, true);
      strecke(x, 0, x, y - s.gap, false);
      strecke(x, y + s.gap, x, size.h, false);
      if (s.showCoordinates && state.lock.alpha < 0.999) {
        ctx.globalAlpha = state.presence * s.opacity * (1 - state.lock.alpha);
        marke(String(Math.round(state.x)), state.x, 8, 'center');
        marke(String(Math.round(state.y)), 8, state.y, 'middle');
      }
    }
    if (state.lock.alpha > 0.001) {
      const { x, y, w, h, alpha } = state.lock;
      ctx.globalAlpha = alpha * s.opacity;
      ecken(x, y, w, h);
      if (s.showCoordinates && state.target) {
        const box = state.target.getBoundingClientRect();
        marke(`${Math.round(box.width)} × ${Math.round(box.height)}`, x + w / 2, y + h + 8, 'center');
      }
    }
    state.pulses.forEach((puls) => {
      const t = puls.age / 0.55;
      const weich = 1 - (1 - t) ** 3;
      ctx.globalAlpha = (1 - t) ** 2 * s.opacity;
      ctx.strokeStyle = tinte;
      ctx.lineWidth = Math.max(1, s.thickness);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(puls.x, puls.y, 3 + 30 * weich, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  };

  const relativ = () => {
    const rect = canvas.getBoundingClientRect();
    state.tx = state.clientX - rect.left;
    state.ty = state.clientY - rect.top;
    return rect;
  };

  const tick = (jetzt) => {
    raf = 0;
    const s = einst;
    const dt = Math.min(0.05, Math.max(0.001, (jetzt - last) / 1000));
    last = jetzt;
    const rect = relativ();
    const folgen = reduce || s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.008 + s.smoothing * 0.16));
    state.x += (state.tx - state.x) * folgen;
    state.y += (state.ty - state.y) * folgen;
    const gewollt = state.inside ? 1 : 0;
    state.presence += (gewollt - state.presence) * (reduce ? 1 : 1 - Math.exp(-dt / (gewollt ? 0.12 : 0.25)));
    if (Math.abs(gewollt - state.presence) < 0.002) state.presence = gewollt;
    const lock = state.lock;
    const gerastet = s.targetEffect === 'lock' && state.inside ? state.target : null;
    let ziel;
    if (gerastet) {
      const box = gerastet.getBoundingClientRect();
      ziel = { x: box.left - rect.left - 6, y: box.top - rect.top - 6, w: box.width + 12, h: box.height + 12 };
    } else {
      ziel = { x: state.x - 10, y: state.y - 10, w: 20, h: 20 };
    }
    const rast = reduce ? 1 : 1 - Math.exp(-dt / 0.085);
    lock.x += (ziel.x - lock.x) * rast;
    lock.y += (ziel.y - lock.y) * rast;
    lock.w += (ziel.w - lock.w) * rast;
    lock.h += (ziel.h - lock.h) * rast;
    const gezeigt = gerastet ? 1 : 0;
    lock.alpha += (gezeigt - lock.alpha) * (reduce ? 1 : 1 - Math.exp(-dt / (gezeigt ? 0.08 : 0.14)));
    if (Math.abs(gezeigt - lock.alpha) < 0.002) lock.alpha = gezeigt;
    state.glitch = reduce ? 0 : Math.max(0, state.glitch - dt / 0.5);
    state.pulses = state.pulses.filter((p) => (p.age += dt) < 0.55);
    zeichnen();
    const beruhigt =
      Math.abs(state.tx - state.x) > 0.05 || Math.abs(state.ty - state.y) > 0.05 ||
      state.presence !== gewollt || lock.alpha !== gezeigt ||
      (gerastet && Math.abs(ziel.w - lock.w) + Math.abs(ziel.x - lock.x) + Math.abs(ziel.y - lock.y) > 0.1) ||
      state.glitch > 0 || state.pulses.length > 0;
    if (beruhigt) raf = requestAnimationFrame(tick);
  };

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  const waehlen = (element) => {
    if (einst.targetEffect === 'none' || !(element instanceof Element)) return null;
    let gefunden = null;
    try { gefunden = element.closest(einst.targetSelector); } catch { gefunden = null; }
    return gefunden && host.contains(gefunden) ? gefunden : null;
  };
  const neuesZiel = (element) => {
    const nächstes = waehlen(element);
    if (nächstes === state.target) return;
    state.target = nächstes;
    if (nächstes && einst.targetEffect === 'glitch') state.glitch = 1;
  };
  const eintreten = () => {
    if (!state.seen) {
      state.seen = true;
      relativ();
      state.x = state.tx; state.y = state.ty;
      state.lock.x = state.x - 10; state.lock.y = state.y - 10;
      state.lock.w = 20; state.lock.h = 20;
    }
    state.inside = true;
  };
  const verlassen = () => { state.inside = false; state.target = null; wake(); };

  host.addEventListener('pointermove', (e) => {
    state.clientX = e.clientX; state.clientY = e.clientY;
    if (e.pointerType === 'touch' && e.buttons === 0) return;
    eintreten();
    neuesZiel(e.target);
    wake();
  });
  host.addEventListener('pointerdown', (e) => {
    state.clientX = e.clientX; state.clientY = e.clientY;
    eintreten();
    neuesZiel(e.target);
    if (einst.clickPulse && !reduce) {
      relativ();
      state.pulses.push({ x: state.tx, y: state.ty, age: 0 });
    }
    wake();
  });
  const loslassen = (e) => { if (e.pointerType !== 'mouse') verlassen(); };
  host.addEventListener('pointerup', loslassen);
  host.addEventListener('pointercancel', loslassen);
  host.addEventListener('pointerleave', verlassen);
  window.addEventListener('scroll', () => {
    if (!state.inside) return;
    neuesZiel(document.elementFromPoint(state.clientX, state.clientY));
    wake();
  }, { capture: true, passive: true });

  new ResizeObserver(resize).observe(canvas);
  beiThemeWechsel(farbenLesen);
  farbenLesen();
  resize();
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/fadenkreuz.js", fehler); } }

/* system/faeden.js */
{ try {
(() => {
const einzeln = (flaeche) => {

const OPT = {
  amplitude: 1.7, distance: 0.4, lineCount: 90, thickness: 0.6, softness: 1.3, speed: 0.6, waves: 1.05,
  split: 0.04, fray: 0.5, angle: 25, seed: 0, parting: 0.4, taper: 0.85, brightness: 1.4, fade: 0.12,
};
const DECKUNG = 0.15;   // Deckkraft der ganzen Fläche, Kontrast ink-muted >= 4.5
const START_ZEIT = 3;
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.createElement('canvas');
canvas.setAttribute('aria-hidden', 'true');
canvas.className = 'faeden__leinwand';
flaeche.prepend(canvas);
const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
if (!gl) return;

const LINE_VERTEX = `#version 300 es
precision highp float;
in vec2 aPoint;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFrame;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;
uniform float uCount;
uniform float uThickness;
uniform float uSoftness;
uniform float uWaves;
uniform float uSplit;
uniform float uFray;
uniform float uSeed;
uniform vec2 uTurn;
uniform vec4 uPart;
uniform float uTaper;
out float vEdge;
out float vBand;
out float vDraw;
out float vAlpha;
out float vIndex;

float Perlin2D(vec2 P) {
  vec2 Pi = floor(P);
  vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 hash_x = fract(Pt * (1.0 / 951.135664));
  vec4 hash_y = fract(Pt * (1.0 / 642.949883));
  vec4 grad_x = hash_x - 0.49999;
  vec4 grad_y = hash_y - 0.49999;
  vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y) * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
  grad_results *= 1.4142135623730950;
  vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
  vec4 blend2 = vec4(blend, vec2(1.0 - blend));
  return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

void main() {
  float perc = float(gl_InstanceID) / uCount;
  float x = aPoint.x;
  float pixel = 1.0 / max(uResolution.x, uResolution.y);
  float splitPoint = uSplit + perc * uFray;
  float amplitudeNormal = smoothstep(splitPoint, max(0.7, splitPoint + 0.2), x);
  float finalAmplitude = amplitudeNormal * 0.5 * uAmplitude * (1.0 + (uMouse.y - 0.5) * 0.2);
  float timeScaled = uTime / 10.0 + (uMouse.x - 0.5);
  float blur = smoothstep(splitPoint, splitPoint + 0.05, x) * perc;
  float xnoise = mix(
    Perlin2D(vec2(timeScaled * 2.5 + uSeed, (x * uWaves + perc) * 2.5)),
    Perlin2D(vec2(timeScaled * 3.5 + uSeed, (x * uWaves + timeScaled) * 3.5)) / 1.5,
    x * 0.3
  );
  float y = 0.5 + (perc - 0.5) * uDistance + xnoise / 2.0 * finalAmplitude;
  vec2 local = vec2((x - 0.5) * uFrame.x, (y - 0.5) * uFrame.y);
  if (uPart.z > 0.0) {
    vec2 delta = local - uPart.xy;
    float reach = uPart.w;
    float pull = exp(-dot(delta, delta) / (reach * reach));
    local.y += delta.y * pull * uPart.z;
  }
  float width = 7.0 * uThickness * pixel * (1.0 - perc);
  float band = (width / 2.0 + 10.0 * uSoftness * pixel * blur) * uFrame.y;
  float draw = max(band, 1.0);
  local.y += aPoint.y * draw;
  vec2 turned = vec2(local.x * uTurn.x - local.y * uTurn.y, local.x * uTurn.y + local.y * uTurn.x);
  gl_Position = vec4(turned / (uResolution * 0.5), 0.0, 1.0);
  vEdge = aPoint.y * draw;
  vBand = band;
  vDraw = draw;
  vAlpha = 1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3)) * uTaper;
  vIndex = perc;
}`;

const LINE_FRAGMENT = `#version 300 es
precision highp float;
in float vEdge;
in float vBand;
in float vDraw;
in float vAlpha;
in float vIndex;
uniform vec3 uColor;
uniform vec3 uAccent;
out vec4 outColor;
void main() {
  float coverage = (1.0 - smoothstep(0.0, vDraw, abs(vEdge))) * (vBand / vDraw) * vAlpha;
  outColor = vec4(mix(uColor, uAccent, vIndex) * coverage, coverage);
}`;

const SCREEN_VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SCREEN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uLines;
uniform vec2 uResolution;
uniform float uFade;
uniform float uOpacity;
uniform float uCurve;
out vec4 outColor;

float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec4 lines = texture(uLines, vUv);
  float alpha = lines.a;
  vec3 color = alpha > 0.0001 ? lines.rgb / alpha : vec3(0.0);
  float mask = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * min(uResolution.x, uResolution.y) * 0.5;
    mask *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    mask *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(color * pow(alpha, uCurve), alpha) * mask;
}`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const MAX_RENDER_DIM = 1920;

function compile(type, source) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
  gl.deleteShader(s);
  return null;
}
function link(vsq, fsq) {
  const v = compile(gl.VERTEX_SHADER, vsq), f = compile(gl.FRAGMENT_SHADER, fsq), p = gl.createProgram();
  if (!v || !f || !p) return null;
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  gl.deleteShader(v); gl.deleteShader(f);
  if (gl.getProgramParameter(p, gl.LINK_STATUS)) return p;
  gl.deleteProgram(p);
  return null;
}
const locate = (p, names) => { const r = {}; for (const n of names) r[n] = gl.getUniformLocation(p, n); return r; };

const lineProgram = link(LINE_VERTEX, LINE_FRAGMENT);
const screenProgram = link(SCREEN_VERTEX, SCREEN_FRAGMENT);
if (!lineProgram || !screenProgram) return;
const lineUniforms = locate(lineProgram, ['uTime', 'uResolution', 'uFrame', 'uAmplitude', 'uDistance', 'uMouse', 'uCount',
  'uThickness', 'uSoftness', 'uWaves', 'uSplit', 'uFray', 'uSeed', 'uTurn', 'uPart', 'uTaper', 'uColor', 'uAccent']);
const screenUniforms = locate(screenProgram, ['uLines', 'uResolution', 'uFade', 'uOpacity', 'uCurve']);

const lineVao = gl.createVertexArray();
const lineBuffer = gl.createBuffer();
gl.bindVertexArray(lineVao);
gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
const pointLocation = gl.getAttribLocation(lineProgram, 'aPoint');
gl.enableVertexAttribArray(pointLocation);
gl.vertexAttribPointer(pointLocation, 2, gl.FLOAT, false, 0, 0);

const screenVao = gl.createVertexArray();
const screenBuffer = gl.createBuffer();
gl.bindVertexArray(screenVao);
gl.bindBuffer(gl.ARRAY_BUFFER, screenBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const positionLocation = gl.getAttribLocation(screenProgram, 'aPosition');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

const target = gl.createTexture();
const framebuffer = gl.createFramebuffer();
gl.bindTexture(gl.TEXTURE_2D, target);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const probeStift = probe.getContext('2d', { willReadFrequently: true });
const state = {
  time: START_ZEIT, width: 1, height: 1, segments: 0, color: [1, 1, 1],
  mouse: [0.5, 0.5], targetMouse: [0.5, 0.5], pointer: [0, 0], targetPointer: [0, 0],
  presence: 0, inside: false,
};
function farbeLesen() {
  probeStift.clearRect(0, 0, 1, 1);
  probeStift.fillStyle = getComputedStyle(flaeche).color;
  probeStift.fillRect(0, 0, 1, 1);
  const d = probeStift.getImageData(0, 0, 1, 1).data;
  state.color = [d[0] / 255, d[1] / 255, d[2] / 255];
}

function buildStrip(segments) {
  if (segments === state.segments) return;
  state.segments = segments;
  const points = new Float32Array((segments + 1) * 4);
  for (let i = 0; i <= segments; i++) { const u = i / segments; points.set([u, -1, u, 1], i * 4); }
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
}

function resize() {
  const width = Math.max(1, flaeche.clientWidth), height = Math.max(1, flaeche.clientHeight);
  const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
  const longest = Math.max(width, height) * baseDpr;
  const dpr = longest > MAX_RENDER_DIM ? (baseDpr * MAX_RENDER_DIM) / longest : baseDpr;
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  state.width = width; state.height = height;
  gl.bindTexture(gl.TEXTURE_2D, target);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  buildStrip(clamp(Math.round(width / 3), 96, 640));
  render();
}

function render() {
  const s = OPT;
  const w = canvas.width, h = canvas.height;
  const radians = (s.angle * Math.PI) / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  const length = Math.abs(w * cos) + Math.abs(h * sin);
  const across = Math.abs(w * sin) + Math.abs(h * cos);
  const scale = w / state.width;
  const mouse = state.mouse;
  const strength = s.parting * state.presence * 2;
  const px = state.pointer[0] * scale, py = state.pointer[1] * scale;
  const local = [px * cos + py * sin, -px * sin + py * cos];

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(lineProgram);
  gl.uniform1f(lineUniforms.uTime, state.time);
  gl.uniform2f(lineUniforms.uResolution, w, h);
  gl.uniform2f(lineUniforms.uFrame, length, across);
  gl.uniform1f(lineUniforms.uAmplitude, s.amplitude);
  gl.uniform1f(lineUniforms.uDistance, s.distance);
  gl.uniform2f(lineUniforms.uMouse, mouse[0], mouse[1]);
  gl.uniform1f(lineUniforms.uCount, s.lineCount);
  gl.uniform1f(lineUniforms.uThickness, s.thickness);
  gl.uniform1f(lineUniforms.uSoftness, s.softness);
  gl.uniform1f(lineUniforms.uWaves, s.waves);
  gl.uniform1f(lineUniforms.uSplit, s.split);
  gl.uniform1f(lineUniforms.uFray, s.fray);
  gl.uniform1f(lineUniforms.uSeed, s.seed * 13.37);
  gl.uniform2f(lineUniforms.uTurn, cos, sin);
  gl.uniform4f(lineUniforms.uPart, local[0], local[1], strength, Math.min(w, h) * 0.16);
  gl.uniform1f(lineUniforms.uTaper, s.taper);
  gl.uniform3f(lineUniforms.uColor, state.color[0], state.color[1], state.color[2]);
  gl.uniform3f(lineUniforms.uAccent, state.color[0], state.color[1], state.color[2]);
  gl.bindVertexArray(lineVao);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (state.segments + 1) * 2, s.lineCount);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, w, h);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(screenProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, target);
  gl.uniform1i(screenUniforms.uLines, 0);
  gl.uniform2f(screenUniforms.uResolution, w, h);
  gl.uniform1f(screenUniforms.uFade, s.fade);
  gl.uniform1f(screenUniforms.uOpacity, DECKUNG);
  gl.uniform1f(screenUniforms.uCurve, 2 / s.brightness);
  gl.bindVertexArray(screenVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

let raf = 0, last = 0, sichtbar = false;
function frame(now) {
  raf = 0;
  if (!sichtbar || document.hidden || reduziert()) { last = 0; return; }
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  state.time += dt * OPT.speed;
  const follow = 1 - Math.exp(-dt * 3);
  state.mouse[0] += (state.targetMouse[0] - state.mouse[0]) * follow;
  state.mouse[1] += (state.targetMouse[1] - state.mouse[1]) * follow;
  const glide = 1 - Math.exp(-dt * 10);
  state.pointer[0] += (state.targetPointer[0] - state.pointer[0]) * glide;
  state.pointer[1] += (state.targetPointer[1] - state.pointer[1]) * glide;
  state.presence += ((state.inside && OPT.parting > 0 ? 1 : 0) - state.presence) * (1 - Math.exp(-dt * 4));
  render();
  raf = requestAnimationFrame(frame);
}
function wake() { if (!raf && sichtbar && !document.hidden && !reduziert()) raf = requestAnimationFrame(frame); }

function beiBewegung(e) {
  const rect = flaeche.getBoundingClientRect();
  const x = (e.clientX - rect.left) / Math.max(1, rect.width);
  const y = (e.clientY - rect.top) / Math.max(1, rect.height);
  state.targetMouse = [x, 1 - y];
  state.targetPointer = [e.clientX - rect.left - rect.width / 2, rect.height / 2 - (e.clientY - rect.top)];
  if (!state.inside && state.presence < 0.01) state.pointer = [...state.targetPointer];
  state.inside = true;
  
}
function beiAustritt() { state.inside = false; state.targetMouse = [0.5, 0.5]; wake(); }

flaeche.addEventListener('pointermove', beiBewegung, { passive: true });
flaeche.addEventListener('pointerleave', beiAustritt);
new IntersectionObserver((e) => { sichtbar = e.some((x) => x.isIntersecting); if (sichtbar) { last = 0; render(); wake(); } }).observe(flaeche);
new ResizeObserver(resize).observe(flaeche);
const neuLesen = () => { farbeLesen(); render(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', neuLesen);
new MutationObserver(neuLesen).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode', 'class'] });

document.addEventListener('visibilitychange', wake);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { wake(); render(); });
farbeLesen();
resize();
};
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.faeden') ? [wurzel] : []), ...wurzel.querySelectorAll('.faeden')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    einzeln(el);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/faeden.js", fehler); } }

/* system/farbkarte.js */
{ try {
(() => {
const wert = (feld) => getComputedStyle(feld).getPropertyValue('--' + feld.dataset.token).trim().toUpperCase();

const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.farbkarte') ? [wurzel] : []), ...wurzel.querySelectorAll('.farbkarte')];
for (const karte of treffer) {
  if (fertig.has(karte)) continue;
  fertig.add(karte);
  const name = karte.querySelector('.farbkarte__name');
  const ruhe = name ? name.textContent : '';
  for (const feld of karte.querySelectorAll('.farbkarte__feld[data-token]')) {
    feld.style.background = `var(--${feld.dataset.token})`;
    const zeige = () => { if (name) { name.textContent = `--${feld.dataset.token} · ${wert(feld)}`; name.dataset.offen = ''; } };
    const zurueck = () => { if (name) { name.textContent = ruhe; delete name.dataset.offen; } };
    feld.addEventListener('pointerenter', zeige);
    feld.addEventListener('focus', zeige);
    feld.addEventListener('pointerleave', zurueck);
    feld.addEventListener('blur', zurueck);
    feld.addEventListener('click', async () => {
      const hex = wert(feld);
      try { await navigator.clipboard.writeText(hex); window.Zuruf?.zeige(`${hex} kopiert`, { art: 'kopieren' }); }
      catch { window.Zuruf?.zeige('Kopieren nicht erlaubt', { art: 'kopieren' }); }
    });
  }
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/farbkarte.js", fehler); } }

/* system/fenster-dialog.js */
{ try {

(() => {
const KANN_BEFEHLE = 'command' in HTMLButtonElement.prototype;

if (!KANN_BEFEHLE) {
  document.addEventListener('click', (e) => {
    const knopf = e.target.closest?.('button[command][commandfor]');
    if (!knopf) return;

    const ziel = document.getElementById(knopf.getAttribute('commandfor'));
    if (!ziel) return;

    const befehl = knopf.getAttribute('command');

    if (befehl === 'show-modal' && typeof ziel.showModal === 'function') {
      e.preventDefault();
      ziel.showModal();
    } else if (befehl === 'close' && typeof ziel.close === 'function') {
      e.preventDefault();
      ziel.close();
    } else if (befehl === 'show-popover' && typeof ziel.showPopover === 'function') {
      e.preventDefault();
      ziel.showPopover();
    }
  });
}

document.addEventListener('click', (e) => {
  const dlg = e.target;
  if (!(dlg instanceof HTMLDialogElement) || !dlg.open) return;
  if ('closedBy' in dlg) return;              /* der Browser macht es selbst */
  if (dlg.getAttribute('closedby') !== 'any') return;
  dlg.close();
});
})();

} catch (fehler) { console.warn("marke.js · system/fenster-dialog.js", fehler); } }

/* system/fliessmenue.js */
{ try {
(() => {
const einzeln = menue => {

const naeher = (e, el) => {
  const r = el.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const oben = (x - r.width / 2) ** 2 + y ** 2;
  const unten = (x - r.width / 2) ** 2 + (y - r.height) ** 2;
  return oben < unten ? 'oben' : 'unten';
};

menue.querySelectorAll('.fliessmenue__eintrag').forEach(eintrag => {
  const band = eintrag.querySelector('.fliessmenue__band');
  const lauf = eintrag.querySelector('.fliessmenue__lauf');
  const teil = lauf.querySelector('.fliessmenue__teil');
  if (!band || !teil) return;

  const fuellen = () => {
    const breite = teil.offsetWidth;
    if (!breite) return;
    const noetig = Math.max(4, Math.ceil(eintrag.clientWidth / breite) + 2);
    while (lauf.children.length < noetig) lauf.appendChild(teil.cloneNode(true));
    lauf.style.setProperty('--n', lauf.children.length);
  };
  fuellen();
  new ResizeObserver(fuellen).observe(eintrag);

  const oeffnen = kante => {
    eintrag.setAttribute('data-ohne', '');
    eintrag.dataset.kante = kante;
    void band.offsetWidth; // Ausgangslage ohne Übergang festschreiben
    eintrag.removeAttribute('data-ohne');
    eintrag.setAttribute('data-offen', '');
  };
  const schliessen = kante => {
    if (!eintrag.hasAttribute('data-offen')) return; // geschlossen: Kante nicht wechseln, sonst fährt das Band quer durch
    eintrag.dataset.kante = kante;
    eintrag.removeAttribute('data-offen');
  };

  eintrag.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') oeffnen(naeher(e, eintrag)); });
  eintrag.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') schliessen(naeher(e, eintrag)); });
  eintrag.addEventListener('focusin', () => { if (!eintrag.hasAttribute('data-offen')) oeffnen('oben'); });
  eintrag.addEventListener('focusout', () => schliessen('oben'));
});
menue.setAttribute('data-bereit', '');
let imBild = true;
const laufSchalten = () => menue.toggleAttribute('data-im-bild', imBild && !document.hidden);
if ('IntersectionObserver' in window) {
  imBild = false;
  new IntersectionObserver(e => { imBild = e.some(x => x.isIntersecting); laufSchalten(); }).observe(menue);
} else laufSchalten();
document.addEventListener('visibilitychange', laufSchalten);
};
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.fliessmenue') ? [wurzel] : []), ...wurzel.querySelectorAll('.fliessmenue')];
  for (const menue of treffer) {
    if (fertig.has(menue)) continue;
    fertig.add(menue);
    einzeln(menue);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/fliessmenue.js", fehler); } }

/* system/flimmern.js */
{ try {
(function () {
  'use strict';
  var ZEICHEN = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789');
  var TAKT = 50;
  var ruhe = window.matchMedia('(prefers-reduced-motion: reduce)');
  var zufall = function (n) { return Math.floor(Math.random() * n); };

  function token(name, vorgabe) {
    var w = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var z = parseFloat(w);
    if (isNaN(z)) return vorgabe;
    return /ms$/.test(w) ? z : /s$/.test(w) ? z * 1000 : z;
  }

  function start(tafel) {
    var leinwand = tafel.querySelector('.flimmern__tafel');
    var ctx = leinwand.getContext('2d');
    var KLASSEN = ['flimmern__farbe--1', 'flimmern__farbe--2', 'flimmern__farbe--3'];
    var fuehler = KLASSEN.map(function (klasse) {
      var i = document.createElement('i');
      i.className = 'flimmern__farbe ' + klasse; i.setAttribute('aria-hidden', 'true');
      tafel.appendChild(i); return i;
    });
    var palette = [];
    function farbenLesen() {
      palette = fuehler.map(function (f) { return getComputedStyle(f).color; });
    }

    var buchstaben = [], spalten = 0, zeilen = 0, zw = 10, zh = 20, fs = 14, schrift = '';
    var letzterTakt = 0, schleife = 0, sichtbar = false, rahmen = 0;

    function neu() {
      var r = tafel.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      leinwand.width = Math.floor(r.width * dpr); leinwand.height = Math.floor(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cs = getComputedStyle(leinwand);
      fs = parseFloat(cs.fontSize);
      schrift = fs + 'px ' + cs.fontFamily;
      ctx.font = schrift;
      zw = Math.ceil(ctx.measureText('M').width); zh = Math.round(fs * 1.25);
      spalten = Math.ceil(r.width / zw); zeilen = Math.ceil(r.height / zh);
      farbenLesen();
      buchstaben = Array.from({ length: spalten * zeilen }, function () {
        var f = zufall(3);
        return { z: ZEICHEN[zufall(ZEICHEN.length)], von: f, nach: f, t: 1 };
      });
      zeichnen(r.width, r.height);
    }

    function zeichnen(b, h) {
      if (!buchstaben.length) return;
      if (b === undefined) { var r = leinwand.getBoundingClientRect(); b = r.width; h = r.height; }
      ctx.clearRect(0, 0, b, h);
      ctx.font = schrift;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      buchstaben.forEach(function (l, i) {
        var a = palette[l.von], e = palette[l.nach];
        ctx.fillStyle = l.t >= 1 || a === e ? e : 'color-mix(in srgb, ' + e + ' ' + Math.round(l.t * 100) + '%, ' + a + ')';
        ctx.fillText(l.z, (i % spalten) * zw, Math.floor(i / spalten) * zh + zh / 2);
      });
    }

    function tauschen() {
      var n = Math.max(1, Math.floor(buchstaben.length * 0.05));
      for (var k = 0; k < n; k++) {
        var l = buchstaben[zufall(buchstaben.length)];
        l.z = ZEICHEN[zufall(ZEICHEN.length)];
        l.von = l.t >= 0.5 ? l.nach : l.von; /* neue Überblendung beginnt bei der gezeigten Farbe */
        l.nach = zufall(3); l.t = 0;
      }
    }

    function bild(jetzt) {
      schleife = 0;
      if (jetzt - letzterTakt >= TAKT) { tauschen(); letzterTakt = jetzt; }
      var offen = false;
      buchstaben.forEach(function (l) { if (l.t < 1) { l.t = Math.min(1, l.t + 0.05); offen = true; } });
      zeichnen();
      if ((sichtbar && !document.hidden) || offen) anwerfen();
    }
    function anwerfen() { if (!schleife && !ruhe.matches) schleife = requestAnimationFrame(bild); }

    document.addEventListener('visibilitychange', function () { if (!document.hidden && sichtbar) anwerfen(); });
    new IntersectionObserver(function (l) {
      l.forEach(function (e) { sichtbar = e.isIntersecting; if (sichtbar) anwerfen(); });
    }, { threshold: 0 }).observe(tafel);

    new ResizeObserver(function () { cancelAnimationFrame(rahmen); rahmen = requestAnimationFrame(neu); }).observe(tafel);
    function nachFarbe() { farbenLesen(); zeichnen(); }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', nachFarbe);
    new MutationObserver(nachFarbe).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    neu();
  }

  var fertig = new WeakSet();
  function einrichten(wurzel) {
    var treffer = (wurzel.matches && wurzel.matches('.flimmern') ? [wurzel] : []).concat(Array.prototype.slice.call(wurzel.querySelectorAll('.flimmern')));
    treffer.forEach(function (tafel) {
      if (fertig.has(tafel)) return;
      fertig.add(tafel);
      start(tafel);
    });
  }
  function los() { einrichten(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
  document.addEventListener('inhalt-neu', function (e) { einrichten(e.target instanceof Element ? e.target : document); });
})();

} catch (fehler) { console.warn("marke.js · system/flimmern.js", fehler); } }

/* system/fortschrittsring.js */
{ try {
(() => {
  const wurzel = document.documentElement;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (name) => parseFloat(getComputedStyle(wurzel).getPropertyValue(name)) || 0;
  const tausend = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'");

  const schreibe = (ring, prozent) => {
    const max = parseFloat(ring.dataset.max);
    const p = ring.querySelector('[data-prozent]');
    if (p) p.textContent = String(Math.round(prozent));
    ring.querySelectorAll('[data-ist]').forEach((n) => { n.textContent = tausend(Math.round((prozent / 100) * max)); });
  };

  const setze = (ring, wert, animiert) => {
    const max = parseFloat(ring.dataset.max);
    const anteil = Math.round((wert / max) * 100);
    const bogen = ring.querySelector('.fortschrittsring__wert');
    const von = parseFloat(ring.dataset.aktuell || '0');
    ring.setAttribute('aria-valuenow', String(wert));
    ring.dataset.aktuell = String(anteil);
    const nr = (ring._nr = (ring._nr || 0) + 1); // ein neuer Lauf löst den alten ab
    if (!animiert || ruhig) {
      bogen.style.transition = 'none';
      bogen.style.strokeDasharray = `${anteil} 100`;
      schreibe(ring, anteil);
      return;
    }
    const dauer = ms('--t-lang');
    bogen.style.transition = '';
    bogen.style.strokeDasharray = `${anteil} 100`;
    const t0 = performance.now();
    const schritt = (jetzt) => {
      if (ring._nr !== nr) return;
      const p = Math.min(1, (jetzt - t0) / dauer);
      const weich = 1 - Math.pow(1 - p, 3); // langsam am Ende, wie --ease
      schreibe(ring, von + (anteil - von) * weich);
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  };

  const fertig = new WeakSet();
  function einrichten(ort) {
    const treffer = [...(ort.matches?.('.fortschrittsring') ? [ort] : []), ...ort.querySelectorAll('.fortschrittsring')];
    for (const wurzelEl of treffer) {
      if (fertig.has(wurzelEl)) continue;
      fertig.add(wurzelEl);
    const ringe = [...wurzelEl.querySelectorAll('[data-ring]')];
    if (!ringe.length) continue;
    const knopf = wurzelEl.querySelector('[data-wechsel]');
    let alt = false;

    for (const r of ringe) {
      r.dataset.aktuell = String(Math.round((parseFloat(r.dataset.ziel) / parseFloat(r.dataset.max)) * 100));
      setze(r, parseFloat(r.dataset.ziel), false);
    }

    const vonNull = () => {
      for (const r of ringe) {
        const bogen = r.querySelector('.fortschrittsring__wert');
        bogen.style.transition = 'none';
        bogen.style.strokeDasharray = '0 100';
        void bogen.getBoundingClientRect();
        r.dataset.aktuell = '0';
        setze(r, parseFloat(r.dataset.ziel), true);
      }
    };
    if (!ruhig && 'IntersectionObserver' in window) {
      const beob = new IntersectionObserver((eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) { beob.disconnect(); vonNull(); }
      }, { threshold: 0.4 });
      beob.observe(ringe[0]);
    }

    if (knopf) {
      knopf.addEventListener('click', () => {
        alt = !alt;
        const haupt = ringe[0];
        const ziel = parseFloat(alt ? haupt.dataset.zielAlt : haupt.dataset.ziel);
        setze(haupt, ziel, true);
        const offen = tausend(parseFloat(haupt.dataset.max) - ziel);
        wurzelEl.querySelectorAll('[data-offen]').forEach((n) => { n.textContent = offen; });
        wurzelEl.querySelectorAll('[data-stand-text]').forEach((n) => { n.textContent = alt ? n.dataset.alt : n.dataset.neu; });
        knopf.textContent = alt ? knopf.dataset.zurueck : knopf.dataset.hin;
      });
    }
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/fortschrittsring.js", fehler); } }

/* system/formular-fragebogen.js */
{ try {
(() => {
const eingerichtet = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.fragebogen') ? [wurzel] : []), ...wurzel.querySelectorAll('.fragebogen')];
for (const bogen of treffer) {
  if (eingerichtet.has(bogen)) continue;
  eingerichtet.add(bogen);
  const schritte = [...bogen.querySelectorAll('.fragebogen__schritt')];
  const balken = bogen.querySelector('.fragebogen__balken > span');
  const fertig = bogen.querySelector('.fragebogen__fertig');
  const zurueck = bogen.querySelector('.fragebogen__zurueck');
  const weiter = bogen.querySelector('.fragebogen__weiter');
  const ueberspringen = bogen.querySelector('.fragebogen__ueberspringen');
  if (!schritte.length || !weiter) continue;

  const anzahl = schritte.length;
  let stand = 1;

  const zeige = (mitFokus) => {
    schritte.forEach((s, i) => {
      if (i + 1 === stand) s.setAttribute('data-aktiv', '');
      else s.removeAttribute('data-aktiv');
    });

    if (balken) balken.style.transform = `scaleX(${Math.min(stand, anzahl) / anzahl})`;
    if (fertig) fertig.hidden = stand <= anzahl;

    if (zurueck) zurueck.style.visibility = stand > 1 && stand <= anzahl ? 'visible' : 'hidden';
    if (ueberspringen) ueberspringen.hidden = stand !== anzahl;

    weiter.textContent = stand === anzahl ? 'Anfrage senden' : 'Weiter';
    weiter.hidden = stand > anzahl;

    if (!mitFokus) return;
    const ziel = stand > anzahl ? fertig : schritte[stand - 1];
    ziel?.querySelector('[tabindex="-1"], h4, h3')?.focus?.();
  };

  weiter.addEventListener('click', () => { if (stand <= anzahl) stand += 1; zeige(true); });
  zurueck?.addEventListener('click', () => { if (stand > 1) stand--; zeige(true); });
  ueberspringen?.addEventListener('click', () => { stand = anzahl + 1; zeige(true); });

  zeige(false);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/formular-fragebogen.js", fehler); } }

/* system/zeiger-spur.js */
{ try {
(() => {
const ABSTAND = 46;   // px Weg zwischen zwei Tritten
const TRITTE  = 16;   // Abdrücke im Umlauf; danach wird der älteste überschrieben

const FUSS = `<svg viewBox="0 0 24 40" aria-hidden="true" focusable="false">
  <path d="M12 2c4 0 6.5 3.4 6.5 8.2 0 3.8-1.4 6.3-2.4 9.1-.8 2.2-1.1 3.9-1.1 5.6 0 2.4-1.3 3.8-3 3.8s-3-1.4-3-3.8c0-1.7-.3-3.4-1.1-5.6-1-2.8-2.4-5.3-2.4-9.1C5.5 5.4 8 2 12 2Z"/>
  <ellipse cx="7.6" cy="32.4" rx="2.1" ry="2.4"/>
  <ellipse cx="12.4" cy="34.6" rx="2" ry="2.3"/>
  <ellipse cx="17" cy="33" rx="1.9" ry="2.2"/>
</svg>`;

const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.fussspur') ? [wurzel] : []), ...wurzel.querySelectorAll('.fussspur')];
for (const flaeche of treffer) {
  if (fertig.has(flaeche)) continue;
  fertig.add(flaeche);

  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) continue;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) continue;

  const buehne = document.createElement('div');
  buehne.className = 'fussspur__flaeche';
  flaeche.prepend(buehne);

  const pool = Array.from({ length: TRITTE }, () => {
    const t = document.createElement('i');
    t.className = 'fussspur__tritt';
    t.innerHTML = FUSS;
    buehne.append(t);
    return t;
  });

  let naechster = 0, links = false;
  let letztesX = null, letztesY = null, weg = 0;

  flaeche.addEventListener('pointermove', (e) => {
    const k = flaeche.getBoundingClientRect();
    const x = e.clientX - k.left, y = e.clientY - k.top;

    if (letztesX === null) { letztesX = x; letztesY = y; return; }
    const dx = x - letztesX, dy = y - letztesY;
    const strecke = Math.hypot(dx, dy);
    letztesX = x; letztesY = y;
    weg += strecke;
    if (weg < ABSTAND || strecke === 0) return;
    weg = 0;

    const winkel = Math.atan2(dy, dx);
    const seite = links ? -1 : 1;
    links = !links;
    const versatz = 9;
    const px = x + Math.cos(winkel + Math.PI / 2) * versatz * seite;
    const py = y + Math.sin(winkel + Math.PI / 2) * versatz * seite;

    const tritt = pool[naechster];
    naechster = (naechster + 1) % TRITTE;

    tritt.style.setProperty('--x', px + 'px');
    tritt.style.setProperty('--y', py + 'px');
    tritt.style.setProperty('--dreh', (winkel * 180 / Math.PI - 90) + 'deg');
    tritt.style.setProperty('--seite', seite);
    tritt.classList.remove('ist-frisch');
    void tritt.offsetWidth;
    tritt.classList.add('ist-frisch');
  });

  flaeche.addEventListener('pointerleave', () => { letztesX = null; weg = 0; });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/zeiger-spur.js", fehler); } }

/* system/geisterfasern.js */
{ try {
(() => {
const fasernEinrichten = (flaeche) => {

const PARAM = {
  speed: 0.2, scale: 2, rotation: 0, rotationSpeed: 0.25, layers: 4,
  waveAmplitude: 0.015, waveFrequency: 3, waveSpeed: 0.15, layerSpeed: 0.08,
  twist: 0.1, twistFrequency: 5, twistSpeed: 1.2, lineFrequency: 5, lineSpacing: 2,
  lineSharpness: 16, vignette: 0.8,
};
const DECKUNG = 0.15;   // höchste Deckkraft der Fasern; Kontrast ink-muted auf Fläche bleibt >= 4.5
const START_ZEIT = 6;   // Standbild: ein Moment mit gut verteilten Fasern
const MAX_DIM = 1920;
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const leinwand = document.createElement('canvas');
leinwand.setAttribute('aria-hidden', 'true');
leinwand.className = 'geisterfasern__leinwand';
flaeche.prepend(leinwand);
const gl = leinwand.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
if (!gl) return; // ohne WebGL2: ruhige Fläche

const VERT = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uLayers;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uLayerSpeed;
uniform float uTwist;
uniform float uTwistFrequency;
uniform float uTwistSpeed;
uniform float uLineFrequency;
uniform float uLineSpacing;
uniform float uLineSharpness;
uniform float uVignette;
uniform float uRotationSpeed;
uniform float uDeckung;
uniform vec3 uInk;
out vec4 fragColor;
#define MAX_LAYERS 10
mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}
void main() {
  vec2 resolution = max(uResolution, vec2(1.0));
  vec2 uv = (2.0 * gl_FragCoord.xy - resolution) / resolution.y;
  float time = uTime * uSpeed;
  vec2 p = uv;
  p /= max(uScale, 0.05);
  p = rotate2d(radians(uRotation) + time * uRotationSpeed) * p;
  float fiberField = 0.0;
  for (int index = 0; index < MAX_LAYERS; index++) {
    float fi = float(index) + 1.0;
    if (fi > uLayers) break;
    p += uWaveAmplitude * sin(p.yx * fi * uWaveFrequency + time * (uWaveSpeed + fi * uLayerSpeed));
    float radius = length(p);
    float polarAngle = atan(p.y, p.x);
    polarAngle += sin(radius * uTwistFrequency - time * uTwistSpeed + fi) * uTwist;
    p = vec2(cos(polarAngle), sin(polarAngle)) * radius;
    float lines = abs(sin(p.x * (uLineFrequency + fi * uLineSpacing) + sin(p.y * 3.0 + time)));
    lines = pow(max(0.0, 1.0 - lines), uLineSharpness);
    fiberField += lines / fi;
  }
  float vignette = 1.0 - smoothstep(0.35, 1.45, length(uv));
  float edgeFade = mix(1.0 - uVignette, 1.0, vignette);
  float fibers = pow(smoothstep(0.12, 1.05, fiberField) * edgeFade, 1.5);
  float a = fibers * uDeckung;
  fragColor = vec4(uInk * a, a);
}`;

function shader(typ, quelle) {
  const s = gl.createShader(typ);
  gl.shaderSource(s, quelle);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}
const vs = shader(gl.VERTEX_SHADER, VERT), fs = shader(gl.FRAGMENT_SHADER, FRAG);
const prog = gl.createProgram();
if (!vs || !fs || !prog) return;
gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
gl.useProgram(prog);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const ort = gl.getAttribLocation(prog, 'position');
gl.enableVertexAttribArray(ort);
gl.vertexAttribPointer(ort, 2, gl.FLOAT, false, 0, 0);

const U = {};
for (const n of ['uResolution', 'uTime', 'uSpeed', 'uScale', 'uRotation', 'uLayers', 'uWaveAmplitude', 'uWaveFrequency',
  'uWaveSpeed', 'uLayerSpeed', 'uTwist', 'uTwistFrequency', 'uTwistSpeed', 'uLineFrequency', 'uLineSpacing',
  'uLineSharpness', 'uVignette', 'uRotationSpeed', 'uDeckung', 'uInk']) U[n] = gl.getUniformLocation(prog, n);
gl.uniform1f(U.uSpeed, PARAM.speed);
gl.uniform1f(U.uScale, PARAM.scale);
gl.uniform1f(U.uRotation, PARAM.rotation);
gl.uniform1f(U.uRotationSpeed, PARAM.rotationSpeed);
gl.uniform1f(U.uLayers, PARAM.layers);
gl.uniform1f(U.uWaveAmplitude, PARAM.waveAmplitude);
gl.uniform1f(U.uWaveFrequency, PARAM.waveFrequency);
gl.uniform1f(U.uWaveSpeed, PARAM.waveSpeed);
gl.uniform1f(U.uLayerSpeed, PARAM.layerSpeed);
gl.uniform1f(U.uTwist, PARAM.twist);
gl.uniform1f(U.uTwistFrequency, PARAM.twistFrequency);
gl.uniform1f(U.uTwistSpeed, PARAM.twistSpeed);
gl.uniform1f(U.uLineFrequency, PARAM.lineFrequency);
gl.uniform1f(U.uLineSpacing, PARAM.lineSpacing);
gl.uniform1f(U.uLineSharpness, PARAM.lineSharpness);
gl.uniform1f(U.uVignette, PARAM.vignette);
gl.uniform1f(U.uDeckung, DECKUNG);

const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const probeStift = probe.getContext('2d', { willReadFrequently: true });
function farbeLesen() {
  probeStift.clearRect(0, 0, 1, 1);
  probeStift.fillStyle = getComputedStyle(flaeche).color;
  probeStift.fillRect(0, 0, 1, 1);
  const d = probeStift.getImageData(0, 0, 1, 1).data;
  gl.uniform3f(U.uInk, d[0] / 255, d[1] / 255, d[2] / 255);
}

let zeit = START_ZEIT;
function zeichnen() {
  gl.uniform1f(U.uTime, zeit);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function groesse() {
  const b = Math.max(1, flaeche.clientWidth), h = Math.max(1, flaeche.clientHeight);
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const lang = Math.max(b, h) * dpr;
  if (lang > MAX_DIM) dpr *= MAX_DIM / lang;
  leinwand.width = Math.max(1, Math.round(b * dpr));
  leinwand.height = Math.max(1, Math.round(h * dpr));
  gl.viewport(0, 0, leinwand.width, leinwand.height);
  gl.uniform2f(U.uResolution, leinwand.width, leinwand.height);
  zeichnen();
}

let sichtbar = false, laeuft = false, letzte = 0;
function bild(jetzt) {
  if (!sichtbar || document.hidden || reduziert()) { laeuft = false; return; }
  const dt = Math.min((jetzt - letzte) / 1000, 0.1);
  letzte = jetzt;
  zeit += dt;
  zeichnen();
  requestAnimationFrame(bild);
}
function starten() {
  if (laeuft || !sichtbar || document.hidden || reduziert()) return;
  laeuft = true;
  letzte = performance.now();
  requestAnimationFrame(bild);
}
document.addEventListener('visibilitychange', starten);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { starten(); zeichnen(); });
new IntersectionObserver((e) => { sichtbar = e.some((x) => x.isIntersecting); if (sichtbar) { zeichnen(); starten(); } }).observe(flaeche);
new ResizeObserver(groesse).observe(flaeche);
const neuLesen = () => { farbeLesen(); zeichnen(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', neuLesen);
new MutationObserver(neuLesen).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode', 'class'] });

farbeLesen();
groesse();
};
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.geisterfasern') ? [wurzel] : []), ...wurzel.querySelectorAll('.geisterfasern')];
  for (const flaeche of treffer) {
    if (fertig.has(flaeche)) continue;
    fertig.add(flaeche);
    fasernEinrichten(flaeche);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/geisterfasern.js", fehler); } }

/* system/leiste-ausweich.js */
{ try {
(() => {
const MEHR = '<svg class="symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
  + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';

function ausweichen(leiste) {
  const alle = [...leiste.children];

  const mehr = document.createElement('details');
  mehr.className = 'klappe';
  mehr.hidden = true;
  mehr.innerHTML = `<summary aria-label="Weitere Werkzeuge">${MEHR}</summary>`
    + '<div class="menue" role="menu"></div>';
  const fach = mehr.querySelector('.menue');
  leiste.append(mehr);

  const messen = () => {
    for (const k of alle) if (k.parentElement !== leiste) leiste.insertBefore(k, mehr);
    mehr.hidden = true;
    mehr.open = false;
    leiste.dataset.ausweichBereit = '';

    const platz = leiste.clientWidth;
    if (leiste.scrollWidth <= platz + 1) return;

    mehr.hidden = false;
    const reserve = mehr.getBoundingClientRect().width;
    for (let i = alle.length - 1; i >= 0; i--) {
      if (leiste.scrollWidth <= platz - reserve + 1) break;
      fach.prepend(alle[i]);
    }
    if (!fach.children.length) mehr.hidden = true;
  };

  let geplant = false;
  const anstossen = () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; messen(); });
  };

  new ResizeObserver(anstossen).observe(leiste);
  anstossen();
  return anstossen;
}

const laeufe = [];
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('[data-ausweich]') ? [wurzel] : []), ...wurzel.querySelectorAll('[data-ausweich]')];
  for (const leiste of treffer) {
    if (fertig.has(leiste)) continue;
    fertig.add(leiste);
    laeufe.push(ausweichen(leiste));
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));

if (document.fonts) document.fonts.ready.then(() => { for (const neu of laeufe) neu(); });
})();

} catch (fehler) { console.warn("marke.js · system/leiste-ausweich.js", fehler); } }

/* system/hinweisband.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.hinweisband') ? [wurzel] : []), ...wurzel.querySelectorAll('.hinweisband')];
  for (const band of treffer) {
    if (fertig.has(band)) continue;
    fertig.add(band);
    const merken = band.hasAttribute('data-merken') && band.id;
    const schluessel = 'hinweisband:' + band.id;
    if (merken) {
      try { if (sessionStorage.getItem(schluessel)) { band.hidden = true; continue; } } catch (e) { /* ohne Speicher */ }
    }
    band.querySelector('.hinweisband__schliessen')?.addEventListener('click', () => {
      band.hidden = true;
      if (merken) {
        try { sessionStorage.setItem(schluessel, '1'); } catch (e) { /* ohne Speicher */ }
      }
      const ziel = document.querySelector('[data-nach-hinweisband]');
      if (ziel) { ziel.tabIndex = -1; ziel.focus({ preventScroll: true }); }
    });
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/hinweisband.js", fehler); } }

/* system/infoknopf.js */
{ try {
(() => {
'use strict';
const KNOPF = '.hinweis-wickel > button[aria-controls]';

function setze(knopf, auf) {
  knopf.setAttribute('aria-expanded', String(auf));
  knopf.parentElement.toggleAttribute('data-zu', !auf);
}

function alleZu(ausser) {
  for (const k of document.querySelectorAll(`${KNOPF}[aria-expanded="true"]`)) if (k !== ausser) setze(k, false);
}

document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.(KNOPF);
  if (!knopf) { alleZu(); return; }
  const auf = knopf.getAttribute('aria-expanded') !== 'true';
  alleZu(knopf);
  setze(knopf, auf);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  let zu = false;
  for (const k of document.querySelectorAll(KNOPF)) {
    const w = k.parentElement;
    if (w.hasAttribute('data-zu')) continue;
    if (k.getAttribute('aria-expanded') === 'true' || w.matches(':hover, :focus-within')) { setze(k, false); zu = true; }
  }
  if (zu) e.preventDefault();
});

function loesen(w) {
  if (!w?.hasAttribute('data-zu') || w.matches(':hover, :focus-within')) return;
  w.removeAttribute('data-zu');
}
document.addEventListener('pointerout', (e) => {
  if (e.pointerType !== 'mouse') return;
  const w = e.target.closest?.('.hinweis-wickel');
  if (w && !w.contains(e.relatedTarget)) setTimeout(() => loesen(w), 0);
});
document.addEventListener('focusout', (e) => {
  const w = e.target.closest?.('.hinweis-wickel');
  if (w) setTimeout(() => loesen(w), 0);
});
})();

} catch (fehler) { console.warn("marke.js · system/infoknopf.js", fehler); } }

/* system/inhaltsverzeichnis.js */
{ try {
(() => {
const GRENZE = 0.25;
const RUHE_MS = 1500;
const verzeichnisse = new Map();

function ziele(nav) {
  const liste = [];
  for (const a of nav.querySelectorAll('a[href^="#"]')) {
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const el = id && document.getElementById(id);
    if (el) liste.push([el, a]);
  }
  return liste.sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

function zeige(nav, z, a) {
  if (nav.matches(':hover, :focus-within') || performance.now() - z.eigeneBewegung < RUHE_MS) return;
  const gruppe = a.closest('details');
  if (gruppe !== z.aufgeklappt) {
    if (z.aufgeklappt && z.vonUns) z.aufgeklappt.removeAttribute('open');
    z.vonUns = !!gruppe && !gruppe.open;
    gruppe?.setAttribute('open', '');
    z.aufgeklappt = gruppe;
  }
  if (nav.scrollHeight <= nav.clientHeight) return;
  const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect(), rand = n.height / 5;
  if (r.top < n.top + rand || r.bottom > n.bottom - rand) {
    nav.scrollTo({ top: nav.scrollTop + (r.top - n.top) - n.height / 3, behavior: 'instant' });
  }
}

function markiere(nav) {
  const z = verzeichnisse.get(nav);
  if (!z) return;
  z.rahmen = 0;
  if (!z.liste) z.liste = ziele(nav);
  const bereich = nav.dataset.bereich && document.querySelector(nav.dataset.bereich);
  const b = bereich ? bereich.getBoundingClientRect() : { top: 0, height: innerHeight };
  let grenze = b.top + b.height * GRENZE;
  let aktuell = null;
  const r = bereich ?? document.scrollingElement;
  const rest = r.scrollHeight - r.clientHeight - r.scrollTop, strecke = b.height * (1 - GRENZE);
  if (r.scrollTop > 0 && rest < strecke) grenze += strecke - Math.max(rest, 0);
  for (const [el, a] of z.liste) {
    if (el.hidden || !el.isConnected) continue;
    if (el.getBoundingClientRect().top <= grenze - 1) aktuell = a; else break;
  }
  if (aktuell === z.markiert) return;
  z.markiert?.removeAttribute('aria-current');
  if (aktuell) { aktuell.setAttribute('aria-current', 'location'); zeige(nav, z, aktuell); }
  z.markiert = aktuell;
}

function einrichten(nav) {
  if (verzeichnisse.has(nav)) return;
  const z = { liste: null, markiert: null, aufgeklappt: null, vonUns: false, eigeneBewegung: 0, rahmen: 0 };
  verzeichnisse.set(nav, z);
  for (const art of ['wheel', 'touchmove', 'keydown', 'pointerdown']) {
    nav.addEventListener(art, () => { z.eigeneBewegung = performance.now(); }, { passive: true });
  }
  markiere(nav);
}

const alleNeu = () => { for (const [nav, z] of verzeichnisse) z.rahmen ||= requestAnimationFrame(() => markiere(nav)); };
addEventListener('scroll', alleNeu, { passive: true, capture: true });
addEventListener('resize', alleNeu);
new MutationObserver((liste) => {
  for (const m of liste) for (const n of m.addedNodes) if (n.nodeType === 1) {
    for (const nav of n.matches('nav.inhaltsverzeichnis') ? [n] : n.querySelectorAll?.('nav.inhaltsverzeichnis') ?? []) einrichten(nav);
  }
  for (const z of verzeichnisse.values()) z.liste = null;
  alleNeu();
}).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
for (const nav of document.querySelectorAll('nav.inhaltsverzeichnis')) einrichten(nav);

document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.('[data-inhalt-schalter]');
  const nav = knopf && document.getElementById(knopf.getAttribute('aria-controls'));
  if (!nav) return;
  const offen = knopf.getAttribute('aria-expanded') !== 'false';
  knopf.setAttribute('aria-expanded', String(!offen));
  nav.hidden = offen;
});

window.Inhaltsverzeichnis = { einrichten, markiere };
})();

} catch (fehler) { console.warn("marke.js · system/inhaltsverzeichnis.js", fehler); } }

/* system/kartenstapel.js */
{ try {
(() => {
const einzeln = aussen => {
const wurzel = aussen.querySelector('.kartenstapel__stapel');
if (!wurzel) return;

const ORIGINS = { fan: [0.9, 0.9], cascade: [0.5, 0.5], deck: [0.5, 0], pile: [0.5, 0.5] };
const EXITS = { fan: [1, -0.3], cascade: [0.8, 0.6], deck: [0, 1] };
const CLICK_SLOP = 6;
const FLICK_SPEED = 650;
const LEAN_SPEED = 1300;
const LEAN_REACH = 260;
const PRESS_SCALE = 1.035;
const SPRINGS = {
  place: [260, 24], settle: [320, 34], tuck: [240, 28], face: [240, 30],
  lean: [240, 28], press: [420, 34], fling: [650, 42]
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const noise = seed => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
const token = name => {
  const t = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return t.endsWith('ms') ? parseFloat(t) / 1000 : parseFloat(t);
};

const karten = [...wurzel.querySelectorAll(':scope > .kartenstapel__karte')];
const anzahl = karten.length;
if (anzahl < 2) return;

const num = (name, vorgabe) => { const w = parseFloat(wurzel.dataset[name]); return Number.isFinite(w) ? w : vorgabe; };
const form = ORIGINS[wurzel.dataset.layout] ? wurzel.dataset.layout : 'fan';
const einst = {
  layout: form,
  visible: clamp(Math.round(num('sichtbar', 4)), 1, anzahl),
  spread: clamp(num('streuung', 0.5), 0, 2),
  depth: clamp(num('tiefe', 0.5), 0, 1),
  tilt: clamp(num('neigung', 30), 0, 89),
  threshold: Math.max(num('schwelle', 90), 0),
  speed: clamp(num('tempo', 1), 0.2, 4),
  klick: wurzel.dataset.klick !== 'aus',
  autoplay: wurzel.dataset.autoplay !== 'aus',
  takt: Math.max(300, num('takt', 3000))
};

const placement = (layout, position, card, spread, depth) => {
  if (layout === 'cascade') return { x: -position * spread * 28, y: -position * spread * 28, rotate: 0, scale: 1 - position * depth * 0.07 };
  if (layout === 'deck') return { x: 0, y: -position * spread * 32, rotate: 0, scale: 1 - position * depth * 0.1 };
  if (layout === 'pile') {
    return {
      x: (noise(card + 1) - 0.5) * spread * 56, y: (noise(card + 2) - 0.5) * spread * 44,
      rotate: (noise(card + 3) - 0.5) * spread * 40, scale: 1 - position * depth * 0.03
    };
  }
  return { x: 0, y: 0, rotate: position * spread * 8, scale: 1 - position * depth * 0.12 };
};

const releaseVelocity = (samples, time) => {
  const recent = samples.filter(s => time - s[2] <= 100);
  if (recent.length < 2) return [0, 0];
  const a = recent[0], b = recent[recent.length - 1];
  const dt = Math.max((b[2] - a[2]) / 1000, 0.008);
  return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt];
};

const aktiv = new Set();
const schmutzig = new Set();
let schleife = 0, zuletzt = 0;

class Wert {
  constructor(start, karte) { this.v = start; this.karte = karte; this.ziel = start; this.vel = 0; this.art = null; }
  get() { return this.v; }
  getVelocity() { return this.vel; }
  setzen(v) { this.stop(); this.v = v; this.vel = 0; schmutzig.add(this.karte); anstossen(); }
  stop() { this.art = null; aktiv.delete(this); }
  animieren(ziel, opt) {
    this.ziel = ziel;
    if (opt.velocity !== undefined) this.vel = opt.velocity;
    this.start = performance.now() + (opt.delay || 0) * 1000;
    if (opt.k !== undefined) { this.art = 'feder'; this.k = opt.k; this.d = opt.d; }
    else { this.art = 'weg'; this.dauer = opt.dauer * 1000; this.von = null; }
    aktiv.add(this);
    anstossen();
  }
  schritt(jetzt, dt) {
    if (jetzt < this.start) return;
    if (this.art === 'weg') {
      if (this.von === null) this.von = this.v;
      const p = clamp((jetzt - this.start) / this.dauer, 0, 1);
      this.v = mix(this.von, this.ziel, 1 - (1 - p) * (1 - p));
      this.vel = 0;
      if (p >= 1) { this.v = this.ziel; this.stop(); }
    } else {
      let rest = dt;
      while (rest > 1e-9) {
        const h = Math.min(rest, 1 / 120);
        this.vel += (-this.k * (this.v - this.ziel) - this.d * this.vel) * h;
        this.v += this.vel * h;
        rest -= h;
      }
      if (Math.abs(this.vel) < 0.5 && Math.abs(this.v - this.ziel) < 0.01) { this.v = this.ziel; this.vel = 0; this.stop(); }
    }
    schmutzig.add(this.karte);
  }
}

function anstossen() {
  if (!schleife) { zuletzt = performance.now(); schleife = requestAnimationFrame(takt); }
}

function takt(jetzt) {
  const dt = Math.min((jetzt - zuletzt) / 1000, 1 / 30);
  zuletzt = jetzt;
  for (const w of [...aktiv]) w.schritt(jetzt, dt);
  schmutzig.forEach(zeichne);
  schmutzig.clear();
  sortieren();
  schleife = aktiv.size ? requestAnimationFrame(takt) : 0;
}

const [ox, oy] = ORIGINS[form];
let reihenfolge = karten.map((_, i) => i);
const fliegend = new Map();
let zug = null;
let lebt = true;

const sofort = () => ruhig.matches;

karten.forEach((el, index) => {
  const k = { el, index, face: el.querySelector('.kartenstapel__flaeche'), z: anzahl - index };
  const pos = index;
  const start = placement(einst.layout, sofort() ? Math.min(pos, einst.visible - 1) : 0, index, einst.spread, einst.depth);
  k.v = {
    x: new Wert(start.x, k), y: new Wert(start.y, k), rotate: new Wert(start.rotate, k), scale: new Wert(start.scale, k),
    tiltX: new Wert(0, k), tiltY: new Wert(0, k), spin: new Wert(0, k), lift: new Wert(1, k),
    opacity: new Wert(pos < einst.visible ? 1 : 0, k), grabX: 0.5, grabY: 0.5
  };
  el.style.transformOrigin = `${ox * 100}% ${oy * 100}%`;
  el._k = k;
  el.addEventListener('pointerdown', e => beiDruck(e, index));
});
const kartenObj = karten.map(el => el._k);

function sortieren() {
  const soll = [...kartenObj].sort((a, b) => a.z - b.z || a.index - b.index);
  soll.forEach((k, i) => { if (wurzel.children[i] !== k.el) wurzel.insertBefore(k.el, wurzel.children[i]); });
}

function zeichne(k) {
  const v = k.v;
  k.el.style.transform = `translate(${v.x.v}px, ${v.y.v}px) rotate(${v.rotate.v}deg) scale(${v.scale.v})`;
  k.el.style.opacity = v.opacity.v;
  k.face.style.transform = `perspective(800px) rotateX(${v.tiltX.v}deg) rotateY(${v.tiltY.v}deg) rotate(${v.spin.v}deg) scale(${v.lift.v})`;
  k.face.style.transformOrigin = `${v.grabX * 100}% ${v.grabY * 100}%`;
}

const feder = (art, extra = {}) => {
  if (sofort()) return { dauer: token('--t-fast'), delay: extra.delay || 0 };
  const [k, d] = SPRINGS[art];
  return { k: k * einst.speed * einst.speed, d: d * einst.speed, ...extra };
};
const blende = delay => ({ dauer: sofort() ? token('--t-fast') : token('--t-base') / einst.speed, delay });

function settleFace(v, delay = 0) {
  const t = feder('face', { delay });
  v.tiltX.animieren(0, t); v.tiltY.animieren(0, t); v.spin.animieren(0, t); v.lift.animieren(1, t);
}

function placeCard(index, position, { delay = 0, lift = 0, kind = 'place', velocity = null, keepZ = false } = {}) {
  const k = kartenObj[index];
  const v = k.v;
  const shown = Math.min(position, einst.visible - 1);
  const ziel = placement(einst.layout, shown, index, einst.spread, einst.depth);
  if (lift > 0 && shown > 0) {
    const vor = placement(einst.layout, shown - 1, index, einst.spread, einst.depth);
    ziel.x = mix(ziel.x, vor.x, lift); ziel.y = mix(ziel.y, vor.y, lift);
    ziel.rotate = mix(ziel.rotate, vor.rotate, lift); ziel.scale = mix(ziel.scale, vor.scale, lift);
  }
  const t = feder(kind, { delay });
  if (!keepZ) { k.z = anzahl - position; schmutzig.add(k); anstossen(); }
  v.x.animieren(ziel.x, velocity ? { ...t, velocity: velocity[0] } : t);
  v.y.animieren(ziel.y, velocity ? { ...t, velocity: velocity[1] } : t);
  v.rotate.animieren(ziel.rotate, t);
  v.scale.animieren(ziel.scale, t);
  settleFace(v, delay);
  v.opacity.animieren(position < einst.visible ? 1 : 0, blende(delay));
}

function placeAll({ stagger = 0, lift = 0, released = -1, velocity = null, kind = 'place' } = {}) {
  reihenfolge.forEach((index, position) => {
    const flug = fliegend.get(index);
    if (flug && !flug.turned) return;
    if (zug && zug.moved && zug.card === index) return;
    const frei = index === released;
    placeCard(index, position, {
      delay: position * stagger, lift: position > 0 ? lift : 0,
      kind: flug ? 'tuck' : frei ? 'settle' : kind, velocity: frei ? velocity : null, keepZ: !!flug
    });
  });
}

const stand = aussen.querySelector('[data-stapel-stand]');
let sichtbar = false, darueber = false, uhr = 0;
function planen() {
  clearTimeout(uhr);
  if (!einst.autoplay || sofort() || !sichtbar || darueber || zug || document.hidden) return;
  uhr = setTimeout(() => sendToBack(null), einst.takt);
}
function festschreiben() {
  planen();
  const oben = reihenfolge[0];
  karten.forEach((el, i) => {
    const ist = i === oben;
    el.toggleAttribute('data-oben', ist);
    if (ist) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
  });
  if (stand) stand.textContent = `Oben: ${karten[oben].dataset.name}, Karte ${(anzahl - oben) % anzahl + 1} von ${anzahl}`;  // gezählt in Wischrichtung: die nächste ist die darunter
}

function sendToBack(richtung, velocity = null) {
  if (reihenfolge.length < 2) return;
  const top = reihenfolge[0];
  if (fliegend.has(top)) return;
  const next = [...reihenfolge.slice(1), top];
  if (sofort()) { reihenfolge = next; festschreiben(); placeAll(); return; }
  let [dx, dy] = richtung || EXITS[einst.layout] || [Math.cos(noise(top + 9) * 6.283), Math.sin(noise(top + 9) * 6.283)];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const box = wurzel.getBoundingClientRect();
  const breite = box.width || 240, hoehe = box.height || 240;
  const abstand = Math.min(breite / Math.max(Math.abs(dx), 0.01), hoehe / Math.max(Math.abs(dy), 0.01));
  const home = placement(einst.layout, 0, top, einst.spread, einst.depth);
  const weg = abstand * 1.12 + 40;
  const aus = [home.x + dx * weg, home.y + dy * weg];
  const k = kartenObj[top], v = k.v;
  const start = feder('fling');
  const flug = { turned: false };
  fliegend.set(top, flug);
  k.z = anzahl + 1;
  v.x.animieren(aus[0], velocity ? { ...start, velocity: velocity[0] } : start);
  v.y.animieren(aus[1], velocity ? { ...start, velocity: velocity[1] } : start);
  settleFace(v);
  reihenfolge = next;
  festschreiben();
  placeAll();
  const spanne = Math.max(Math.hypot(aus[0] - v.x.get(), aus[1] - v.y.get()), 1);
  let gelandet = false;
  const wenden = () => {
    flug.turned = true;
    const pos = reihenfolge.indexOf(top);
    if (pos >= 0) placeCard(top, pos, { kind: 'tuck', keepZ: !gelandet });
  };
  const landen = () => {
    gelandet = true;
    if (fliegend.get(top) === flug) fliegend.delete(top);
    const pos = reihenfolge.indexOf(top);
    if (pos >= 0) { k.z = anzahl - pos; schmutzig.add(k); anstossen(); }
  };
  const notfall = setTimeout(() => { if (!flug.turned) wenden(); if (!gelandet) landen(); }, 1500 / einst.speed);
  const frei = () => {
    const meine = k.el.getBoundingClientRect();
    for (const [i, fremd] of kartenObj.entries()) {
      if (i === top || fliegend.has(i) || fremd.v.opacity.get() < 0.5) continue;
      const b = fremd.el.getBoundingClientRect();
      if (meine.left < b.right && meine.right > b.left && meine.top < b.bottom && meine.bottom > b.top) return false;
    }
    return true;
  };
  const beobachten = () => {
    if (!lebt || (flug.turned && gelandet)) { clearTimeout(notfall); return; }
    const x = v.x.get(), y = v.y.get();
    const hinaus = v.x.getVelocity() * dx + v.y.getVelocity() * dy;
    if (!flug.turned && (Math.hypot(aus[0] - x, aus[1] - y) <= spanne * 0.06 || hinaus < 0)) wenden();
    if (!gelandet && (frei() || (flug.turned && hinaus < 0))) landen();
    requestAnimationFrame(beobachten);
  };
  requestAnimationFrame(beobachten);
}

function zurueck() {
  if (reihenfolge.length < 2 || fliegend.size) return;
  reihenfolge = [reihenfolge[reihenfolge.length - 1], ...reihenfolge.slice(0, -1)];
  festschreiben();
  placeAll();
}

function lean(z) {
  if (sofort()) return;
  const v = kartenObj[z.card].v;
  const ox2 = v.x.get() - z.homeX, oy2 = v.y.get() - z.homeY;
  const seitlich = clamp(z.vx / LEAN_SPEED, -1, 1) * 0.7 + clamp(ox2 / LEAN_REACH, -1, 1) * 0.3;
  const hoch = clamp(-z.vy / LEAN_SPEED, -1, 1) * 0.7 + clamp(-oy2 / LEAN_REACH, -1, 1) * 0.3;
  const t = feder('lean');
  v.tiltY.animieren(seitlich * einst.tilt, t);
  v.tiltX.animieren(hoch * einst.tilt, t);
  v.spin.animieren(clamp(ox2 / LEAN_REACH, -1, 1) * 6, t);
}

function beiBewegung(e) {
  if (!zug || e.pointerId !== zug.id) return;
  const dx = e.clientX - zug.startX, dy = e.clientY - zug.startY;
  const v = kartenObj[zug.card].v;
  if (!zug.moved) {
    if (Math.hypot(dx, dy) < CLICK_SLOP) return;
    if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.5) { abbrechen(); return; }
    zug.moved = true;
    v.x.stop(); v.y.stop();
    zug.originX = v.x.get() - dx; zug.originY = v.y.get() - dy;
    try { zug.element.setPointerCapture(zug.id); } catch { /* ohne Fang weiter */ }
    wurzel.classList.add('ist-zieht');
  }
  v.x.setzen(zug.originX + dx); v.y.setzen(zug.originY + dy);
  zug.samples.push([e.clientX, e.clientY, e.timeStamp]);
  if (zug.samples.length > 12) zug.samples.shift();
  [zug.vx, zug.vy] = releaseVelocity(zug.samples, e.timeStamp);
  lean(zug);
  clearTimeout(zug.idle);
  const dieser = zug;
  zug.idle = setTimeout(() => { if (zug !== dieser) return; dieser.vx = 0; dieser.vy = 0; lean(dieser); }, 70);
  const fortschritt = clamp(Math.hypot(dx, dy) / Math.max(einst.threshold, 1), 0, 1);
  if (Math.abs(fortschritt - zug.progress) > 0.02) { zug.progress = fortschritt; placeAll({ lift: fortschritt * 0.4, kind: 'settle' }); }
}

function entfernen() {
  window.removeEventListener('pointermove', beiBewegung);
  window.removeEventListener('pointerup', beiLoslassen);
  window.removeEventListener('pointercancel', beiLoslassen);
}
function abbrechen() {
  if (!zug) return;
  clearTimeout(zug.idle);
  entfernen();
  settleFace(kartenObj[zug.card].v);
  zug = null;
}

function beiLoslassen(e) {
  if (!zug || e.pointerId !== zug.id) return;
  const z = zug;
  zug = null;
  clearTimeout(z.idle);
  entfernen();
  planen();
  try { z.element.releasePointerCapture(z.id); } catch { /* egal */ }
  if (!z.moved) {
    if (e.type === 'pointerup' && einst.klick) sendToBack(null);
    else settleFace(kartenObj[z.card].v);
    return;
  }
  wurzel.classList.remove('ist-zieht');
  const dx = e.clientX - z.startX, dy = e.clientY - z.startY;
  const [vx, vy] = releaseVelocity(z.samples, e.timeStamp);
  const strecke = Math.hypot(dx, dy), tempo = Math.hypot(vx, vy);
  const wurf = tempo > FLICK_SPEED && strecke > 16 && vx * dx + vy * dy > 0;
  if (e.type === 'pointerup' && anzahl > 1 && (strecke > einst.threshold || wurf)) {
    sendToBack(tempo > 300 ? [vx, vy] : [dx, dy], [vx, vy]);
  } else {
    placeAll({ released: z.card, velocity: [clamp(vx, -3000, 3000), clamp(vy, -3000, 3000)] });
  }
}

function beiDruck(e, index) {
  if (e.button !== 0 || zug) return;
  if (reihenfolge[0] !== index || fliegend.has(index)) return;
  const k = kartenObj[index];
  const home = placement(einst.layout, 0, index, einst.spread, einst.depth);
  const box = e.currentTarget.getBoundingClientRect();
  k.v.grabX = clamp((e.clientX - box.left) / Math.max(box.width, 1), 0, 1);
  k.v.grabY = clamp((e.clientY - box.top) / Math.max(box.height, 1), 0, 1);
  if (!sofort()) k.v.lift.animieren(PRESS_SCALE, feder('press'));
  clearTimeout(uhr);
  zug = {
    card: index, id: e.pointerId, element: e.currentTarget, startX: e.clientX, startY: e.clientY,
    originX: 0, originY: 0, homeX: home.x, homeY: home.y, vx: 0, vy: 0, idle: 0, moved: false, progress: 0,
    samples: [[e.clientX, e.clientY, e.timeStamp]]
  };
  if (e.pointerType === 'mouse') e.preventDefault();
  window.addEventListener('pointermove', beiBewegung);
  window.addEventListener('pointerup', beiLoslassen);
  window.addEventListener('pointercancel', beiLoslassen);
}

wurzel.addEventListener('keydown', e => {
  if (e.target !== wurzel) return;
  if (['ArrowRight', 'ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); sendToBack(null); }
  else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); zurueck(); }
});
aussen.querySelector('[data-stapel-weiter]')?.addEventListener('click', () => sendToBack(null));
aussen.querySelector('[data-stapel-zurueck]')?.addEventListener('click', zurueck);

wurzel.setAttribute('data-bereit', '');
festschreiben();
karten.forEach((_, i) => zeichne(kartenObj[i]));
sortieren();

let erstes = true;
const auffaechern = () => placeAll({ stagger: sofort() ? 0 : 0.06 });
wurzel.addEventListener('pointerenter', () => { darueber = true; planen(); });
wurzel.addEventListener('pointerleave', () => { darueber = false; planen(); });
if (!('IntersectionObserver' in window)) { sichtbar = true; auffaechern(); planen(); }
else {
  new IntersectionObserver(eintraege => {
    sichtbar = eintraege.some(x => x.isIntersecting);
    if (sichtbar && erstes) { erstes = false; auffaechern(); }
    planen();
  }, { threshold: 0.4 }).observe(wurzel);
}
if (sofort()) auffaechern();
addEventListener('pagehide', () => { lebt = false; });
document.addEventListener('visibilitychange', planen);
};
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.kartenstapel') ? [wurzel] : []), ...wurzel.querySelectorAll('.kartenstapel')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    einzeln(el);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/kartenstapel.js", fehler); } }

/* system/kartentausch.js */
{ try {
(() => {
const einzeln = aussen => {
const buehne = aussen.querySelector('.kartentausch__stapel');
if (!buehne) return;
const karten = [...buehne.querySelectorAll(':scope > .kartentausch__karte')];
const n = karten.length;
if (n < 2) return;

const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
const wurzel = getComputedStyle(document.documentElement);
const ms = name => parseFloat(wurzel.getPropertyValue(name));
const DROP = ms('--t-slow'), MOVE = ms('--t-slow'), RETURN = ms('--t-slow'), STAFFEL = ms('--t-fast');
const UEBERLAPP = 0.45, RUECKKEHR = 0.2;

const stand = aussen.querySelector('[data-tausch-stand]');
let reihenfolge = karten.map((_, i) => i);
let beschaeftigt = false;
let timer = [];

function nachHinten(el) {
  const lage = getComputedStyle(el).transform; // Lage mitten im Fall, bevor der Übergang abbricht
  buehne.insertBefore(el, buehne.firstElementChild);
  el.style.transition = 'none';
  el.style.transform = lage;
  el.getBoundingClientRect(); // diese Lage festschreiben, damit der nächste Übergang von dort startet
  el.style.transition = '';
  el.style.transform = '';
}

function legen(pos, idx, verz = 0) {
  const k = karten[idx];
  k.style.setProperty('--p', pos);
  k.style.setProperty('--verz', `${verz}ms`);
}

function beschriften() {
  const vorn = karten[reihenfolge[0]];
  karten.forEach(k => { if (k === vorn) k.removeAttribute('aria-hidden'); else k.setAttribute('aria-hidden', 'true'); });
  if (stand) stand.textContent = `Vorne: ${vorn.dataset.name}`;
}

function tausch() {
  if (beschaeftigt) return;
  const [vorn, ...rest] = reihenfolge;
  const el = karten[vorn];
  if (ruhig.matches) {
    reihenfolge = [...rest, vorn];
    nachHinten(el);
    reihenfolge.forEach((idx, pos) => legen(pos, idx));
    beschriften();
    return;
  }
  beschaeftigt = true;
  el.style.setProperty('--verz', '0ms');
  el.style.setProperty('--fall', '1');
  const aufruecken = DROP * (1 - UEBERLAPP);
  timer.push(setTimeout(() => {
    rest.forEach((idx, i) => legen(i, idx, i * STAFFEL));
  }, aufruecken));
  const zurueck = aufruecken + MOVE * RUECKKEHR;
  timer.push(setTimeout(() => {
    nachHinten(el);
    el.style.setProperty('--p', n - 1);
    el.style.setProperty('--fall', '0');
    reihenfolge = [...rest, vorn];
    beschriften();
  }, zurueck));
  const ende = Math.max(aufruecken + (n - 2) * STAFFEL + MOVE, zurueck + RETURN);
  timer.push(setTimeout(() => { beschaeftigt = false; timer = []; }, ende + 50));
}

[...karten].reverse().forEach(k => buehne.append(k));
reihenfolge.forEach((idx, pos) => legen(pos, idx));
beschriften();
buehne.setAttribute('data-bereit', '');

karten.forEach((k, i) => k.addEventListener('click', () => { if (reihenfolge[0] === i) tausch(); }));
buehne.addEventListener('keydown', e => {
  if (e.target !== buehne) return;
  if (['ArrowRight', 'ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); tausch(); }
});
aussen.querySelector('[data-tausch-weiter]')?.addEventListener('click', tausch);

const TAKT = 5000;
let sichtbar = false, pause = false, uhr = 0;
function planen() {
  clearTimeout(uhr);
  if (ruhig.matches || !sichtbar || pause || document.hidden) return;
  uhr = setTimeout(() => { tausch(); planen(); }, TAKT);
}
buehne.addEventListener('pointerenter', () => { pause = true; planen(); });
buehne.addEventListener('pointerleave', () => { pause = false; planen(); });
buehne.addEventListener('focusin', () => { pause = true; planen(); });
buehne.addEventListener('focusout', () => { pause = false; planen(); });
ruhig.addEventListener('change', planen);
document.addEventListener('visibilitychange', planen);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(eintraege => {
    const war = sichtbar;
    sichtbar = eintraege.some(x => x.isIntersecting);
    if (sichtbar && !war) setTimeout(tausch, 400);
    planen();
  }, { threshold: 0.6 }).observe(buehne);
}
};
const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.kartentausch') ? [ort] : []), ...ort.querySelectorAll('.kartentausch')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    einzeln(el);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/kartentausch.js", fehler); } }

/* system/kasse.js */
{ try {
(() => {
  const chf = (r) => 'CHF ' + r.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const fertig = new WeakSet();
  function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.kasse') ? [wurzel] : []), ...wurzel.querySelectorAll('.kasse')];
  for (const kasse of treffer) {
    if (fertig.has(kasse)) continue;
    fertig.add(kasse);
    const zwischen = Number(kasse.dataset.zwischen);
    const rechnen = () => {
      const w = kasse.querySelector('input[name="versand"]:checked');
      const versand = w ? Number(w.dataset.preis) : 0;
      const total = zwischen + versand;
      const mwst = (total * 0.081) / 1.081;
      kasse.querySelector('[data-versand]').textContent = versand === 0 ? 'gratis' : chf(versand);
      kasse.querySelector('[data-mwst]').textContent = chf(mwst);
      kasse.querySelector('[data-total]').textContent = chf(total);
    };
    kasse.addEventListener('change', rechnen);
    rechnen();
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/kasse.js", fehler); } }

/* system/klappmenue-flaeche.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.klappmenue--flaeche') ? [wurzel] : []), ...wurzel.querySelectorAll('.klappmenue--flaeche')];
for (const flaeche of treffer) {
  if (fertig.has(flaeche)) continue;
  fertig.add(flaeche);
  const ausloeser = flaeche.querySelector('summary');
  const menue = flaeche.querySelector('.menue');
  if (!ausloeser || !menue) continue;

  ausloeser.addEventListener('click', (e) => {
    if (!e.clientX && !e.clientY) return;           // Tastatur: Vorgabe behalten

    const kasten = flaeche.getBoundingClientRect();
    const breite = menue.offsetWidth || 224;
    const hoehe = menue.offsetHeight || 200;

    let x = e.clientX - kasten.left;
    let y = e.clientY - kasten.top;

    const maxX = Math.min(kasten.width, window.innerWidth - kasten.left) - breite;
    if (x > maxX) x = Math.max(0, maxX);

    const maxY = window.innerHeight - kasten.top - hoehe;
    if (y > maxY) y = Math.max(0, maxY);

    menue.style.setProperty('--x', x + 'px');
    menue.style.setProperty('--y', y + 'px');
  });

  flaeche.addEventListener('toggle', () => {
    if (!flaeche.open) {
      menue.style.removeProperty('--x');
      menue.style.removeProperty('--y');
    }
  });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/klappmenue-flaeche.js", fehler); } }

/* system/knopf-roll.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.knopf-roll--staffel') ? [wurzel] : []), ...wurzel.querySelectorAll('.knopf-roll--staffel')];
for (const knopf of treffer) {
  if (fertig.has(knopf)) continue;
  fertig.add(knopf);
  const text = (knopf.dataset.staffel ?? knopf.textContent).trim();
  if (!text) continue;

  knopf.setAttribute('aria-label', text);

  const zeichen = [...text].map((z, i) => {
    const halter = document.createElement('span');
    halter.className = 'knopf-roll__zeichen';
    halter.setAttribute('aria-hidden', 'true');
    halter.style.setProperty('--i', String(i));
    const innen = document.createElement('i');
    innen.textContent = z === ' ' ? ' ' : z;
    halter.append(innen);
    return halter;
  });

  knopf.replaceChildren(...zeichen);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/knopf-roll.js", fehler); } }

/* system/knopf-sammeln.js */
{ try {
(() => {
const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
const FLUG = 600;     // ms, Dauer der Flugbahn
const FEDERN = 480;   // ms, Nachfedern der Ablage

const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.knopf-sammeln') ? [ort] : []), ...ort.querySelectorAll('.knopf-sammeln')];
  for (const halter of treffer) {
    if (fertig.has(halter)) continue;
    fertig.add(halter);
  const knopf = halter.querySelector('.knopf-sammeln__knopf');
  const ablage = halter.querySelector('.knopf-sammeln__ablage');
  const zahl = halter.querySelector('.knopf-sammeln__zahl');
  if (!knopf || !ablage || !zahl) continue;

  const fertigText = knopf.dataset.fertig ?? 'Hinzugefügt';
  const beschriftung = knopf.querySelector('.knopf-sammeln__knopf-text');
  const offenText = beschriftung ? beschriftung.textContent : '';
  knopf.setAttribute('aria-pressed', 'false');

  function ankommen() {
    if (knopf.classList.contains('ist-fertig')) return;
    zahl.textContent = String(Number(zahl.textContent) + 1);
    if (!ruhig.matches) {
      ablage.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }],
        { duration: FEDERN, easing: 'ease-out' }
      );
    }
    knopf.classList.add('ist-fertig');
    knopf.setAttribute('aria-pressed', 'true');
    if (beschriftung) beschriftung.textContent = fertigText;
  }

  function herausnehmen() {
    if (!knopf.classList.contains('ist-fertig')) return;
    zahl.textContent = String(Math.max(0, Number(zahl.textContent) - 1));
    knopf.classList.remove('ist-fertig');
    knopf.setAttribute('aria-pressed', 'false');
    if (beschriftung) beschriftung.textContent = offenText;
  }

  knopf.addEventListener('click', () => {
    if (knopf.classList.contains('ist-fertig')) { herausnehmen(); return; }
    if (ruhig.matches) { ankommen(); return; }

    const a = knopf.getBoundingClientRect();
    const z = ablage.getBoundingClientRect();
    const x0 = a.left + a.width / 2;
    const y0 = a.top + a.height / 2;
    const x1 = z.left + z.width / 2;
    const y1 = z.top + z.height / 2;

    const punkt = document.createElement('span');
    punkt.className = 'knopf-sammeln__flug';
    punkt.setAttribute('aria-hidden', 'true');
    document.body.append(punkt);

    const cx = (x0 + x1) / 2;
    const cy = Math.min(y0, y1) - 80;
    const schritte = 24;
    const bilder = [];
    for (let i = 0; i <= schritte; i++) {
      const t = i / schritte;
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      bilder.push({ transform: `translate(${x}px, ${y}px) scale(${1 - t * 0.4})` });
    }

    const lauf = punkt.animate(bilder, { duration: FLUG, easing: 'cubic-bezier(.45,0,.55,1)' });
    const landen = () => { punkt.remove(); ankommen(); };
    lauf.finished.then(landen, landen);
    setTimeout(landen, FLUG + 300);
  });

  const leeren = halter.querySelector('[data-sammeln-leeren]');
  if (leeren) {
    const zeigen = () => { leeren.hidden = Number(zahl.textContent) === 0; };
    new MutationObserver(zeigen).observe(zahl, { childList: true, characterData: true, subtree: true });
    zeigen();
    leeren.addEventListener('click', () => {
      herausnehmen();
      zahl.textContent = '0';
      knopf.focus();
    });
  }
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/knopf-sammeln.js", fehler); } }

/* system/formular-kompakt.js */
{ try {
(() => {
'use strict';
const SCHLUESSEL = 'formular-label-w';
try { const w = Number(localStorage.getItem(SCHLUESSEL)); if (w) document.documentElement.style.setProperty('--label-w-eigen', w + 'px'); } catch (_) {}
const dazu = (w, sel) => [...(w.matches?.(sel) ? [w] : []), ...(w.querySelectorAll?.(sel) || [])];
const griffe = (wurzel = document) => dazu(wurzel, '.formular--kompakt').forEach(f => {
  if (!f.querySelector(':scope > .kompakt-griff')) f.insertAdjacentHTML('beforeend', '<span class="kompakt-griff" aria-hidden="true" title="Ziehen ändert die Breite der Beschriftungen"></span>'); });
const hoehe = (g, ev) => g.style.setProperty('--griff-y', Math.round(ev.clientY - g.getBoundingClientRect().top) + 'px');
document.addEventListener('pointermove', (e) => { const g = e.target.closest?.('.kompakt-griff'); if (g && !g.hasAttribute('data-zieht')) hoehe(g, e); }, { passive: true });
document.addEventListener('pointerdown', (e) => {
  const g = e.target.closest?.('.kompakt-griff'); if (!g) return; e.preventDefault();
  const links = g.parentElement.getBoundingClientRect().left, root = document.documentElement; let w = 0; g.setAttribute('data-zieht', '');
  const zieh = (ev) => { w = Math.round(Math.min(Math.max(ev.clientX - links, 96), 320)); root.style.setProperty('--label-w-eigen', w + 'px'); hoehe(g, ev); };
  const los = () => { document.removeEventListener('pointermove', zieh); document.removeEventListener('pointerup', los); g.removeAttribute('data-zieht');
    if (w) try { localStorage.setItem(SCHLUESSEL, w); } catch (_) {} };
  document.addEventListener('pointermove', zieh); document.addEventListener('pointerup', los);
});
const ORDNUNG_SCHLUESSEL = 'formular-feldordnung';
let ordnungListe = []; try { ordnungListe = JSON.parse(localStorage.getItem(ORDNUNG_SCHLUESSEL) || '[]'); } catch (_) {}
const BESCHRIFTUNG = ':scope > .feld__eingabe > label, :scope > .feld__kopf > span, :scope > label:not(.haken), :scope > .haken > span:last-child, :scope > .datumsfeld > .feld__eingabe > label';
const feldName = (f) => { const l = f.querySelector(BESCHRIFTUNG); return (l?.dataset.nameOrig || l?.textContent || '').trim(); };
const behaelter = (w) => dazu(w, '.formular--kompakt, .formular--kompakt .raster, .formular--kompakt .eigenschaften-karte');
const felderIn = (b) => [...b.children].filter((x) => x.matches('.feld') && !x.querySelector('textarea') && feldName(x));
const ordne = (wurzel = document) => {
  for (const b of behaelter(wurzel)) {
    const f = felderIn(b); if (f.length < 2) continue;
    for (const x of f) {
      const l = x.querySelector(BESCHRIFTUNG);
      if (l && !l.classList.contains('feld-griff')) { l.classList.add('feld-griff'); l.title = 'Ziehen ändert die Reihenfolge'; }
    }
    if (!ordnungListe.length) continue;
    const rang = (x) => { const i = ordnungListe.indexOf(feldName(x)); return i < 0 ? 1e6 : i; };
    const sortiert = f.map((x, i) => [x, i]).sort((a, c) => rang(a[0]) - rang(c[0]) || a[1] - c[1]).map((x) => x[0]);
    if (sortiert.every((x, i) => x === f[i])) continue;
    const plaetze = f.map((x) => { const m = document.createComment(''); x.replaceWith(m); return m; });
    sortiert.forEach((x, i) => plaetze[i].replaceWith(x));
  }
};
document.addEventListener('pointerdown', (e) => {
  const l = e.target.closest?.('.formular--kompakt .feld-griff'); if (!l || !window.Bewegung) return;
  const feld = l.closest('.feld'), box = feld?.parentElement; if (!box) return;
  Bewegung.ziehen(e, feld, {
    behaelter: () => box,
    kinder: () => felderIn(box).filter((f) => f !== feld && !f.hidden),
    setze: (b, vor, el) => b.insertBefore(el, vor || felderIn(b).at(-1)?.nextSibling || null),
    ende: () => {
      const hier = felderIn(box).map(feldName), rest = ordnungListe.filter((n) => !hier.includes(n));
      const anker = ordnungListe.findIndex((n) => hier.includes(n));
      ordnungListe = anker < 0 ? [...rest, ...hier] : [...rest.slice(0, anker), ...hier, ...rest.slice(anker)];
      try { localStorage.setItem(ORDNUNG_SCHLUESSEL, JSON.stringify(ordnungListe)); } catch (_) {}
      box.dispatchEvent(new CustomEvent('felder-geordnet', { bubbles: true, detail: { reihenfolge: [...ordnungListe] } }));
      return true;
    },
  });
});
const ordnung = (liste) => { ordnungListe = [...liste]; ordne(); };

const einrichten = (wurzel) => { griffe(wurzel); ordne(wurzel); };
const start = () => einrichten(document);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
window.FormularKompakt = { griffe, ordne, ordnung };
})();

} catch (fehler) { console.warn("marke.js · system/formular-kompakt.js", fehler); } }

/* system/textkarte.js */
{ try {
(() => {
'use strict';
const SCHLUESSEL = 'textkarte-hoehe';
try { const h = localStorage.getItem(SCHLUESSEL); if (h) document.documentElement.style.setProperty('--fe-hoehe', h); } catch (_) {}

let zug = null;
document.addEventListener('pointerdown', (e) => {
  const fe = e.target.closest?.('.feld .fe'); if (!fe || fe.closest('.fe-voll')) return;
  const r = fe.getBoundingClientRect();
  if (e.clientX > r.right - 18 && e.clientY > r.bottom - 18) zug = fe;
});
document.addEventListener('pointerup', () => {
  if (!zug) return;
  const h = Math.round(zug.getBoundingClientRect().height) + 'px';
  zug.style.removeProperty('height'); zug.style.removeProperty('block-size');
  document.documentElement.style.setProperty('--fe-hoehe', h);
  try { localStorage.setItem(SCHLUESSEL, h); } catch (_) {}
  zug = null;
});

const VOLL = '<path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/>';
const KLEIN = '<path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/>';
const zeichen = (d) => `<svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
let fenster = null, platz = null;
const vollFenster = () => {
  if (fenster) return fenster;
  fenster = document.createElement('dialog');
  fenster.className = 'fenster fe-voll-fenster';
  fenster.setAttribute('closedby', 'any');
  document.body.append(fenster);
  fenster.addEventListener('close', () => {
    const f = fenster.querySelector('.feld'); if (!f || !platz) return;
    f.classList.remove('fe-voll'); platz.replaceWith(f); platz = null;
    const k = f.querySelector('[data-fw="voll"]');
    if (k) { k.innerHTML = zeichen(VOLL); k.setAttribute('aria-label', 'Volle Ansicht'); k.title = 'Volle Ansicht'; k.focus(); }
  });
  return fenster;
};
function voll(k) {
  const f = k.closest('.feld'), d = vollFenster(); if (!f) return;
  if (d.open && d.contains(f)) { d.close(); return; }
  const titel = f.querySelector('.feld__eingabe > label')?.textContent.trim() || 'Text';
  d.setAttribute('aria-label', `${titel}, volle Ansicht`);
  platz = document.createComment('textkarte'); f.replaceWith(platz); d.append(f); f.classList.add('fe-voll');
  k.innerHTML = zeichen(KLEIN); k.setAttribute('aria-label', 'Volle Ansicht schliessen'); k.title = 'Volle Ansicht schliessen';
  d.showModal(); f.querySelector('.fe')?.focus();
}

const UM = { fett: ['**', '**', 'fett'], kursiv: ['_', '_', 'kursiv'], durch: ['~~', '~~', 'durch'], code: ['`', '`', 'code'] };
const ZEILE = { liste: () => '- ', check: () => '- [ ] ', nummer: (i) => `${i + 1}. ` };
function befehl(ta, art) {
  if (art === 'zurueck' || art === 'vor') { ta.focus(); document.execCommand(art === 'zurueck' ? 'undo' : 'redo'); return true; }
  const a = ta.selectionStart, b = ta.selectionEnd, wahl = ta.value.slice(a, b);
  let neu;
  if (UM[art]) neu = UM[art][0] + (wahl || UM[art][2]) + UM[art][1];
  else if (art === 'link') neu = `[${wahl || 'Text'}](https://)`;
  else if (ZEILE[art]) neu = (wahl || 'Punkt').split('\n').map((z, i) => ZEILE[art](i) + z).join('\n');
  else return false;
  ta.focus();
  if (!document.execCommand('insertText', false, neu)) ta.setRangeText(neu, a, b, 'end');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

document.addEventListener('pointerdown', (e) => { if (e.target.closest?.('.fe-werkzeug [data-fw]')) e.preventDefault(); });
document.addEventListener('click', (e) => {
  const k = e.target.closest?.('.fe-werkzeug [data-fw]'); if (!k) return;
  if (k.dataset.fw === 'voll') { voll(k); return; }
  const fe = k.closest('.feld')?.querySelector('.fe');
  if (fe?.matches('textarea')) befehl(fe, k.dataset.fw);
});

window.Textkarte = { voll, befehl };
})();

} catch (fehler) { console.warn("marke.js · system/textkarte.js", fehler); } }

/* system/kopf-video.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.kopf-video') ? [ort] : []), ...ort.querySelectorAll('.kopf-video')];
for (const wurzel of treffer) {
  if (fertig.has(wurzel)) continue;
  fertig.add(wurzel);
  const video = wurzel.querySelector('.kopf-video__film');
  const knopf = wurzel.querySelector('.kopf-video__schalter');
  if (!video || !knopf) continue;
  const pause = knopf.querySelector('[data-zeichen="pause"]');
  const play = knopf.querySelector('[data-zeichen="play"]');
  const zeigen = (laeuft) => {
    pause.hidden = !laeuft;
    play.hidden = laeuft;
    knopf.setAttribute('aria-label', laeuft ? 'Video anhalten' : 'Video abspielen');
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.play().then(() => { knopf.hidden = false; zeigen(true); }).catch(() => {});
  }
  knopf.addEventListener('click', () => {
    if (video.paused) { video.play(); zeigen(true); } else { video.pause(); zeigen(false); }
  });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/kopf-video.js", fehler); } }

/* system/kopfzeile-mega.js */
{ try {
(() => {
  const fertig = new WeakSet();
  function einrichten(wurzel) {
  const SEL = '.kopfzeile-mega, .kopfzeile-kompakt';
  const treffer = [...(wurzel.matches?.(SEL) ? [wurzel] : []), ...wurzel.querySelectorAll(SEL)];
  for (const kopf of treffer) {
    if (fertig.has(kopf)) continue;
    fertig.add(kopf);
    const klappen = [...kopf.querySelectorAll('details.klappe')];
    const abgleich = (d) => d.querySelector(':scope > summary')?.setAttribute('aria-expanded', String(d.open));
    for (const d of klappen) {
      abgleich(d);
      d.addEventListener('toggle', () => abgleich(d));
    }
    const zu = (zurueck) => {
      for (const d of klappen) {
        if (!d.open) continue;
        d.open = false;
        if (zurueck) d.querySelector(':scope > summary')?.focus();
      }
    };
    kopf.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && klappen.some((d) => d.open)) { e.preventDefault(); zu(true); }
    });
    document.addEventListener('pointerdown', (e) => { if (!kopf.contains(e.target)) zu(false); });
    kopf.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !kopf.contains(e.relatedTarget)) zu(false);
    });
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/kopfzeile-mega.js", fehler); } }

/* system/ladering.js */
{ try {
(() => {
const RUHIG = window.matchMedia('(prefers-reduced-motion: reduce)');

for (const zeile of document.querySelectorAll('[data-saetze]')) {
  const text = zeile.querySelector('[role="status"]');
  const saetze = zeile.dataset.saetze.split('|').map((s) => s.trim()).filter(Boolean);
  if (!text || saetze.length < 2 || RUHIG.matches) continue;
  let i = Math.max(0, saetze.indexOf(text.textContent.trim()));
  setInterval(() => {
    i = (i + 1) % saetze.length;
    text.textContent = saetze[i];
  }, 2200);
}
})();

} catch (fehler) { console.warn("marke.js · system/ladering.js", fehler); } }

/* system/laufband.js */
{ try {
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var fertig = new WeakSet();
  function einrichten(wurzel) {
  var baender = (wurzel.matches && wurzel.matches('.laufband') ? [wurzel] : []).concat(Array.prototype.slice.call(wurzel.querySelectorAll('.laufband')));
  baender.forEach(function (band) {
    if (fertig.has(band)) return;
    fertig.add(band);
    Array.prototype.forEach.call(band.querySelectorAll('.laufband__reihe'), function (reihe) {
      var block = reihe.querySelector('.laufband__block');
      var k = block.cloneNode(true);
      k.setAttribute('aria-hidden', 'true');
      k.setAttribute('inert', '');
      reihe.appendChild(k);
    });
    band.classList.add('ist-bereit');
    var buehne = band.querySelector('.laufband__buehne');
    var reihen = Array.prototype.slice.call(band.querySelectorAll('.laufband__reihe'));
    var versatz = 0;
    function schiebe(dx) {
      versatz += dx;
      reihen.forEach(function (r) {
        var halb = r.scrollWidth / 2 || 1;
        var v = ((versatz % halb) + halb) % halb - halb;
        r.style.transform = 'translateX(' + v + 'px)';
      });
    }
    if (buehne) {
      buehne.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        schiebe(-e.deltaX);
      }, { passive: false });
      var zug = null;
      buehne.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        zug = { x: e.clientX, id: e.pointerId, bewegt: false };
      });
      buehne.addEventListener('pointermove', function (e) {
        if (!zug || e.pointerId !== zug.id) return;
        var dx = e.clientX - zug.x;
        if (!zug.bewegt && Math.abs(dx) < 4) return;
        if (!zug.bewegt) { zug.bewegt = true; buehne.setPointerCapture(e.pointerId); buehne.classList.add('ist-gezogen'); }
        zug.x = e.clientX;
        schiebe(dx);
      });
      var ende = function () { zug = null; buehne.classList.remove('ist-gezogen'); };
      buehne.addEventListener('pointerup', ende);
      buehne.addEventListener('pointercancel', ende);
    }

    var knopf = band.querySelector('[data-laufband-halt]');
    if (!knopf) return;
    var text = knopf.querySelector('[data-laufband-text]');
    var aus = knopf.querySelector('[data-laufband-symbol="aus"]');
    var an = knopf.querySelector('[data-laufband-symbol="an"]');
    function anzeigen(steht) {
      band.setAttribute('data-lauf', steht ? 'aus' : 'an');
      knopf.setAttribute('aria-pressed', steht ? 'true' : 'false');
      text.textContent = steht ? 'Band abspielen' : 'Band anhalten';
      aus.hidden = steht;
      an.hidden = !steht;
    }
    anzeigen(false);
    knopf.addEventListener('click', function () { anzeigen(band.getAttribute('data-lauf') !== 'aus'); });
  });
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', function (e) { einrichten(e.target instanceof Element ? e.target : document); });
})();

} catch (fehler) { console.warn("marke.js · system/laufband.js", fehler); } }

/* system/lichtgeschwindigkeit.js */
{ try {
(() => {
const flaecheEinrichten = (flaeche) => {

const mitAkzent = flaeche.dataset.farbe === 'akzent';
const TRAVEL = 400, MAX_CARS = 160, MAX_POLES = 80, MAX_DUST = 1500, MAX_COLORS = 8;
const S = {
  curvature: 1, speed: 1, boost: 3, fov: 90, boostFov: 130, lanes: 3, roadWidth: 10, medianWidth: 2,
  density: 40, trailLength: 1, lightSize: 1, poles: 20, poleHeight: 1, dust: 100, steer: 0.35,
  // Deckkraft: Strasse ganz leise, Streifen kräftig (der Text steht auf einer Platte)
  roadBase: 0.05, roadMark: 0.16, streak: 0.8, pole: 0.7, dustAlpha: 0.35,
};
const START_ZEIT = 7;
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const leinwand = document.createElement('canvas');
leinwand.setAttribute('aria-hidden', 'true');
leinwand.className = 'lichtgeschwindigkeit__leinwand';
flaeche.prepend(leinwand);
const gl = leinwand.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
if (!gl) return;

const BEND = `
  uniform float uTime;
  uniform float uCurvature;
  uniform vec4 uCurveA;
  uniform float uCurveB;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uPixel;
  #define PI 3.14159265358979
  float nsin(float v) { return sin(v) * 0.5 + 0.5; }
  vec3 gentle(float p) {
    return vec3(
      cos(p * PI * 5.0 + uTime) * 25.0 - cos(0.02 * PI * 5.0 + uTime) * 25.0,
      sin(p * PI * 2.0 + PI * 0.5 + uTime) * 15.0 - sin(0.02 * PI * 2.0 + PI * 0.5 + uTime) * 15.0,
      0.0
    );
  }
  float windX(float p) { return cos(PI * p * 4.0 + uTime) * 25.0 + pow(cos(PI * p * 8.0 + uTime * 2.0), 2.0) * 5.0; }
  float windY(float p) { return -nsin(PI * p * 8.0 + uTime) * 10.0 - pow(nsin(PI * p + uTime / 8.0), 5.0) * 10.0; }
  vec3 winding(float p) { return vec3(windX(p) - windX(0.0125), windY(p) - windY(0.0125), 0.0); }
  vec3 hills(float p) {
    return vec3(
      cos(p * PI * 3.0 + uTime) * 30.0 - cos(0.02 * PI * 3.0 + uTime) * 30.0,
      nsin(p * PI * 6.0 + uTime) * 30.0 - nsin(0.02 * PI * 6.0 + uTime) * 30.0,
      nsin(p * PI * 10.0 + uTime) * 20.0 - nsin(0.02 * PI * 10.0 + uTime) * 20.0
    );
  }
  vec3 racing(float p) {
    return vec3(
      sin(p * PI * 2.0 + uTime) * 35.0 - sin(0.0125 * PI * 2.0 + uTime) * 35.0,
      sin(p * PI * 3.0 + uTime) * 10.0 - sin(0.0125 * PI * 3.0 + uTime) * 10.0,
      0.0
    );
  }
  float deepX(float p) { return sin(p * PI * 4.0 + uTime) * 10.0; }
  float deepY(float p) { return pow(abs(p * 10.0), 2.0) + sin(p * PI * 8.0 + uTime) * 20.0; }
  vec3 deep(float p) { return vec3(deepX(p) - deepX(0.02), deepY(p) - deepY(0.02), 0.0); }
  vec3 bend(float p) {
    vec3 d = gentle(p) * uCurveA.x + winding(p) * uCurveA.y + hills(p) * uCurveA.z + racing(p) * uCurveA.w + deep(p) * uCurveB;
    return d * uCurvature;
  }
`;

const STREAK_VERTEX = `
  ${BEND}
  attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
  attribute vec4 aSeedA;
  attribute vec4 aSeedB;
  attribute float aPair;
  attribute float aTone;
  uniform float uTravel;
  uniform float uRoadX;
  uniform float uRoadWidth;
  uniform float uLanes;
  uniform float uDirection;
  uniform vec2 uSpeedRange;
  uniform float uTrail;
  uniform float uStretch;
  uniform float uSize;
  uniform vec3 uColors[${MAX_COLORS}];
  uniform float uColorCount;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vThin;
  void main() {
    float laneWidth = uRoadWidth / uLanes;
    float lane = min(floor(aSeedA.x * uLanes), uLanes - 1.0);
    float laneX = (lane + 0.5) * laneWidth - uRoadWidth * 0.5 + (aSeedA.y - 0.5) * 0.5 * laneWidth;
    float carWidth = mix(0.3, 0.5, aSeedA.z) * laneWidth;
    float radius = mix(0.05, 0.14, aSeedA.w) * uSize;
    float len = mix(0.03, 0.2, aSeedB.x) * uTravel * uTrail * (1.0 + uStretch);
    float speed = mix(uSpeedRange.x, uSpeedRange.y, aSeedB.y) * uDirection;
    vec3 center = vec3(
      uRoadX + laneX + aPair * carWidth,
      aSeedB.w * 0.8 + radius * 1.3,
      position.z * len + len - mod(uTime * speed + aSeedB.z * uTravel, uTravel)
    );
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = radius;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, position.y * shown, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    vUv = uv;
    vColor = uColors[int(min(floor(aTone * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`;

const STREAK_FRAGMENT = `
  uniform vec2 uFade;
  uniform float uIntensity;
  uniform float uSharp;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float alpha = pow(facing, uSharp) * smoothstep(uFade.x, uFade.y, vUv.x) * uIntensity * vThin * (1.0 - vFog);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vColor, min(alpha, 1.0));
  }
`;

const POLE_VERTEX = `
  ${BEND}
  attribute vec3 position; attribute vec3 normal;
  attribute vec4 aSeed;
  attribute float aIndex;
  attribute float aSide;
  uniform float uTravel;
  uniform float uCount;
  uniform float uEdge;
  uniform float uHeight;
  uniform vec3 uColors[${MAX_COLORS}];
  uniform float uColorCount;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vHeight;
  varying float vThin;
  void main() {
    vHeight = position.y + 0.5;
    float width = mix(0.08, 0.22, aSeed.y);
    float height = mix(1.3, 1.9, aSeed.z) * uHeight;
    float spacing = uTravel / max(uCount, 1.0);
    vec3 center = vec3(
      aSide * uEdge,
      vHeight * height,
      -uTravel + mod(uTime * 120.0 + (aIndex + aSeed.x * 0.6) * spacing, uTravel)
    );
    center += bend(abs(center.z / uTravel));
    float depth = max(0.1, -(modelViewMatrix * vec4(center, 1.0)).z);
    float wanted = width;
    float shown = max(wanted, depth * uPixel * 0.75);
    vThin = wanted / shown;
    vec3 p = center + vec3(position.x * shown, 0.0, position.z * shown);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    vColor = uColors[int(min(floor(aSeed.w * uColorCount), uColorCount - 1.0))];
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`;

const POLE_FRAGMENT = `
  uniform float uIntensity;
  uniform float uSharp;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vColor;
  varying float vFog;
  varying float vHeight;
  varying float vThin;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float ends = smoothstep(0.0, 0.08, vHeight) * smoothstep(1.0, 0.9, vHeight);
    float alpha = pow(facing, uSharp) * ends * uIntensity * vThin * (1.0 - vFog);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vColor, min(alpha, 1.0));
  }
`;

const DUST_VERTEX = `
  ${BEND}
  attribute vec4 aSeed;
  attribute float aEnd;
  uniform float uTravel;
  uniform float uStretch;
  uniform float uSpread;
  varying float vAlpha;
  void main() {
    float x = (aSeed.x - 0.5) * uSpread;
    float y = mix(1.0, 42.0, aSeed.y * aSeed.y);
    float speed = mix(140.0, 260.0, aSeed.w);
    float z = -uTravel + mod(uTime * speed + aSeed.z * uTravel, uTravel);
    float len = (0.6 + uStretch * 7.0) * mix(0.6, 1.4, aSeed.w);
    vec3 p = vec3(x, y, z + aEnd * len);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = aEnd * (1.0 - smoothstep(uFogNear, uFogFar, -mv.z));
  }
`;

const DUST_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(uColor, vAlpha * uIntensity); }
`;

const ROAD_VERTEX = `
  ${BEND}
  attribute vec3 position;
  uniform float uTravel;
  uniform float uWidth;
  varying vec2 vRoad;
  varying float vFog;
  void main() {
    vec3 p = position;
    p.x *= uWidth;
    vRoad = vec2(p.x, p.z);
    p += bend(abs(p.z / uTravel));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  }
`;

const ROAD_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uInk;
  uniform float uRoadWidth;
  uniform float uMedian;
  uniform float uLanes;
  uniform float uBase;
  uniform float uMark;
  varying vec2 vRoad;
  varying float vFog;
  float stripe(float d, float w) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(w - aa, w + aa, d);
  }
  void main() {
    float rx = abs(vRoad.x) - uMedian * 0.5;
    float a = rx < 0.0 ? uBase * 1.6 : uBase;
    if (rx >= 0.0) {
      float laneWidth = uRoadWidth / uLanes;
      float shoulder = max(stripe(abs(rx - 0.3), 0.07), stripe(abs(rx - (uRoadWidth - 0.3)), 0.07));
      float nearest = floor(rx / laneWidth + 0.5);
      float inner = step(0.5, nearest) * step(nearest, uLanes - 0.5);
      float dash = step(0.5, fract((vRoad.y - uTime * 120.0) / 14.0));
      float marks = max(shoulder, stripe(abs(rx - nearest * laneWidth), 0.06) * inner * dash);
      a = mix(a, uMark, marks);
    }
    a *= 1.0 - vFog;
    gl_FragColor = vec4(uInk, a);
  }
`;

const VKOPF = '#version 300 es\nprecision highp float;\nuniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix;\n';
const FKOPF = '#version 300 es\nprecision highp float;\nout vec4 fragColor;\n';
const vert300 = (q) => VKOPF + q.replace(/\battribute\b/g, 'in').replace(/\bvarying\b/g, 'out');
const frag300 = (q) => FKOPF + q.replace(/\bvarying\b/g, 'in').replace(/gl_FragColor/g, 'fragColor');

function baue(vq, fq) {
  const mach = (typ, q) => { const s = gl.createShader(typ); gl.shaderSource(s, q); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const v = mach(gl.VERTEX_SHADER, vert300(vq)), f = mach(gl.FRAGMENT_SHADER, frag300(fq)), p = gl.createProgram();
  if (!v || !f) return null;
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}
const pStreak = baue(STREAK_VERTEX, STREAK_FRAGMENT);
const pPole = baue(POLE_VERTEX, POLE_FRAGMENT);
const pDust = baue(DUST_VERTEX, DUST_FRAGMENT);
const pRoad = baue(ROAD_VERTEX, ROAD_FRAGMENT);
if (!pStreak || !pPole || !pDust || !pRoad) return; // Shader nicht übersetzbar: ruhige Fläche

const orte = new Map();
function loc(p, n) { let m = orte.get(p); if (!m) orte.set(p, (m = {})); return n in m ? m[n] : (m[n] = gl.getUniformLocation(p, n)); }
const u1 = (p, n, x) => { const l = loc(p, n); if (l) gl.uniform1f(l, x); };
const u2 = (p, n, x, y) => { const l = loc(p, n); if (l) gl.uniform2f(l, x, y); };
const u3 = (p, n, v) => { const l = loc(p, n); if (l) gl.uniform3fv(l, v); };
const u4 = (p, n, x, y, z, w) => { const l = loc(p, n); if (l) gl.uniform4f(l, x, y, z, w); };
const um4 = (p, n, m) => { const l = loc(p, n); if (l) gl.uniformMatrix4fv(l, false, m); };
const um3 = (p, n, m) => { const l = loc(p, n); if (l) gl.uniformMatrix3fv(l, false, m); };

function puffer(daten, typ = gl.ARRAY_BUFFER) {
  const b = gl.createBuffer();
  gl.bindBuffer(typ, b);
  gl.bufferData(typ, daten, gl.STATIC_DRAW);
  return b;
}
function vaoFuer(prog, attribs, index) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  for (const [name, [buf, size, teiler]] of Object.entries(attribs)) {
    const l = gl.getAttribLocation(prog, name);
    if (l < 0) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(l, teiler);
  }
  if (index) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bindVertexArray(null);
  return vao;
}

// Rohr (wie TubeGeometry für eine Linie von z=0 nach z=-1): 24 Ringe, 7 Seiten, Radius 1
const TUBULAR = 24, RADIAL = 7;
const tubePos = [], tubeNor = [], tubeUv = [], tubeIdx = [];
for (let j = 0; j <= TUBULAR; j++) {
  for (let i = 0; i <= RADIAL; i++) {
    const v = (i / RADIAL) * Math.PI * 2;
    const nx = Math.sin(v), ny = Math.cos(v);
    tubePos.push(nx, ny, -j / TUBULAR);
    tubeNor.push(nx, ny, 0);
    tubeUv.push(j / TUBULAR, i / RADIAL);
  }
}
for (let j = 1; j <= TUBULAR; j++) {
  for (let i = 1; i <= RADIAL; i++) {
    const a = (RADIAL + 1) * (j - 1) + (i - 1), b = (RADIAL + 1) * j + (i - 1), c = (RADIAL + 1) * j + i, d = (RADIAL + 1) * (j - 1) + i;
    tubeIdx.push(a, b, d, b, c, d);
  }
}
const tubeBuf = { position: [puffer(new Float32Array(tubePos)), 3, 0], normal: [puffer(new Float32Array(tubeNor)), 3, 0], uv: [puffer(new Float32Array(tubeUv)), 2, 0] };
const tubeIndex = puffer(new Uint16Array(tubeIdx), gl.ELEMENT_ARRAY_BUFFER);

// Zylinder (offen, Radius 1, Höhe 1, 8 Seiten), wie CylinderGeometry
const CYL = 8;
const cylPos = [], cylNor = [], cylIdx = [];
for (let y = 0; y <= 1; y++) {
  for (let x = 0; x <= CYL; x++) {
    const th = (x / CYL) * Math.PI * 2;
    cylPos.push(Math.sin(th), -y + 0.5, Math.cos(th));
    cylNor.push(Math.sin(th), 0, Math.cos(th));
  }
}
for (let x = 0; x < CYL; x++) {
  const a = x, b = (CYL + 1) + x, c = (CYL + 1) + x + 1, d = x + 1;
  cylIdx.push(a, b, d, b, c, d);
}
const cylBuf = { position: [puffer(new Float32Array(cylPos)), 3, 0], normal: [puffer(new Float32Array(cylNor)), 3, 0] };
const cylIndex = puffer(new Uint16Array(cylIdx), gl.ELEMENT_ARRAY_BUFFER);

// Strasse: 221 Ringe von z=0 bis z=-400, links und rechts x=-0.5 und 0.5 (Streifen)
const ROWS = 221;
const roadPos = new Float32Array(ROWS * 2 * 3);
for (let r = 0; r < ROWS; r++) {
  const z = -(r / (ROWS - 1)) * TRAVEL;
  roadPos.set([-0.5, 0, z, 0.5, 0, z], r * 6);
}
const roadVao = vaoFuer(pRoad, { position: [puffer(roadPos), 3, 0] });

// Streifen-Gruppen: Samen je Instanz
function streifenGruppe(direction, fade, speedRange) {
  const seedA = new Float32Array(MAX_CARS * 2 * 4), seedB = new Float32Array(MAX_CARS * 2 * 4);
  const pair = new Float32Array(MAX_CARS * 2), tone = new Float32Array(MAX_CARS * 2);
  for (let i = 0; i < MAX_CARS; i++) {
    const a = [Math.random(), Math.random(), Math.random(), Math.random()];
    const b = [Math.random(), Math.random(), Math.random(), Math.random() * Math.random()];
    const shade = Math.random();
    for (let side = 0; side < 2; side++) {
      const k = i * 2 + side;
      seedA.set(a, k * 4); seedB.set(b, k * 4);
      pair[k] = side ? 0.5 : -0.5;
      tone[k] = shade;
    }
  }
  const vao = vaoFuer(pStreak, {
    ...tubeBuf,
    aSeedA: [puffer(seedA), 4, 1], aSeedB: [puffer(seedB), 4, 1], aPair: [puffer(pair), 1, 1], aTone: [puffer(tone), 1, 1],
  }, tubeIndex);
  return { vao, direction, fade, speedRange, farben: new Float32Array(MAX_COLORS * 3), anzahl: 1 };
}
const tail = streifenGruppe(1, [0, 0.6], [60, 80]);
const head = streifenGruppe(-1, [1, 0.4], [120, 160]);

const poleSeed = new Float32Array(MAX_POLES * 2 * 4), poleIndex = new Float32Array(MAX_POLES * 2), poleSide = new Float32Array(MAX_POLES * 2);
for (let i = 0; i < MAX_POLES; i++) {
  for (let side = 0; side < 2; side++) {
    const k = i * 2 + side;
    poleSeed.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
    poleIndex[k] = i + (side ? 0.5 : 0);
    poleSide[k] = side ? 1 : -1;
  }
}
const poleVao = vaoFuer(pPole, { ...cylBuf, aSeed: [puffer(poleSeed), 4, 1], aIndex: [puffer(poleIndex), 1, 1], aSide: [puffer(poleSide), 1, 1] }, cylIndex);
const poleFarben = new Float32Array(MAX_COLORS * 3);

const dustSeed = new Float32Array(MAX_DUST * 2 * 4), dustEnd = new Float32Array(MAX_DUST * 2);
for (let i = 0; i < MAX_DUST; i++) {
  const seed = [Math.random(), Math.random(), Math.random(), Math.random()];
  dustSeed.set(seed, i * 8); dustSeed.set(seed, i * 8 + 4);
  dustEnd[i * 2 + 1] = 1;
}
const dustVao = vaoFuer(pDust, { aSeed: [puffer(dustSeed), 4, 0], aEnd: [puffer(dustEnd), 1, 0] });

const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const probeStift = probe.getContext('2d', { willReadFrequently: true });
function token(name) {
  // Der Tokenwert kommt aus dem berechneten Stil, ein 1-Pixel-Canvas macht jedes Farbformat zu 0..255
  probeStift.clearRect(0, 0, 1, 1);
  probeStift.fillStyle = 'transparent';
  probeStift.fillStyle = getComputedStyle(flaeche).getPropertyValue(name).trim() || 'transparent';
  probeStift.fillRect(0, 0, 1, 1);
  const d = probeStift.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}
let farbInk = [0, 0, 0];
function farbenLesen() {
  const ink = token('--ink'), muted = token('--ink-muted'), faint = token('--ink-faint'), akz = token('--accent');
  farbInk = ink;
  const fuell = (arr, farbe) => { for (let i = 0; i < MAX_COLORS; i++) arr.set(farbe, i * 3); };
  fuell(head.farben, mitAkzent ? akz : ink);
  fuell(tail.farben, muted);
  fuell(poleFarben, faint);
}

function perspektive(fovGrad, aspekt, nah, fern) {
  const f = 1 / Math.tan((fovGrad * Math.PI) / 360), nf = 1 / (nah - fern);
  return new Float32Array([f / aspekt, 0, 0, 0, 0, f, 0, 0, 0, 0, (fern + nah) * nf, -1, 0, 0, 2 * fern * nah * nf, 0]);
}
function schauen(e, z) { // Ansicht-Matrix (Spaltenreihenfolge)
  let fx = e[0] - z[0], fy = e[1] - z[1], fz = e[2] - z[2]; // zeigt von Ziel zur Kamera (Kamera blickt entlang -z)
  let l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l;
  let rx = fz, ry = 0, rz = -fx; // rechts = oben (0,1,0) x f
  l = Math.hypot(rx, ry, rz) || 1; rx /= l; ry /= l; rz /= l;
  const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
  return new Float32Array([
    rx, ux, fx, 0, ry, uy, fy, 0, rz, uz, fz, 0,
    -(rx * e[0] + ry * e[1] + rz * e[2]), -(ux * e[0] + uy * e[1] + uz * e[2]), -(fx * e[0] + fy * e[1] + fz * e[2]), 1,
  ]);
}
const normalAus = (m) => new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);

const { PI, cos, sin } = Math;
const nsin = (v) => sin(v) * 0.5 + 0.5;
const windX = (q, t) => cos(PI * q * 4 + t) * 25 + cos(PI * q * 8 + t * 2) ** 2 * 5;
const windY = (q, t) => -nsin(PI * q * 8 + t) * 10 - nsin(PI * q + t / 8) ** 5 * 10;
function blickWinding(t, curvature) {
  const p = 0.025;
  return [(windX(p, t) - windX(p + 0.007, t)) * curvature * -2, (windY(p, t) - windY(p + 0.007, t)) * curvature * -5, -10];
}

const st = {
  zeit: START_ZEIT, fov: S.fov, fovV: 0, boost: 0, over: false, held: false,
  px: 0, py: 0, sx: 0, sy: 0, breite: 1, hoehe: 1,
};

function zeichnen() {
  const w = leinwand.width, h = leinwand.height;
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  const cam = [st.sx * S.roadWidth * 0.45, 8 - st.sy * 2.5, -5];
  const blick = blickWinding(st.zeit, S.curvature);
  const ziel = [blick[0] + st.sx * 2.5 + cam[0], blick[1] + cam[1], blick[2] + cam[2]];
  const ansicht = schauen(cam, ziel);
  const proj = perspektive(st.fov, w / h, 0.1, 10000);
  const nm = normalAus(ansicht);
  const pixel = (2 * Math.tan((st.fov * Math.PI) / 360)) / Math.max(1, h);
  const halfRoad = S.roadWidth / 2 + S.medianWidth / 2;
  const stretch = st.boost * 1.1;

  // gemeinsame Uniforms: eine Funktion, weil jedes Programm seine eigenen Orte hat
  const gemeinsam = (p) => {
    gl.useProgram(p);
    um4(p, 'modelViewMatrix', ansicht); um4(p, 'projectionMatrix', proj); um3(p, 'normalMatrix', nm);
    u1(p, 'uTime', st.zeit); u1(p, 'uCurvature', S.curvature);
    u4(p, 'uCurveA', 0, 1, 0, 0); u1(p, 'uCurveB', 0); // Biegung 'winding'
    u1(p, 'uFogNear', TRAVEL * 0.22); u1(p, 'uFogFar', TRAVEL * 0.95);
    u1(p, 'uPixel', pixel); u1(p, 'uTravel', TRAVEL); u1(p, 'uStretch', stretch);
  };

  // Strasse
  gemeinsam(pRoad);
  u1(pRoad, 'uWidth', S.roadWidth * 2 + S.medianWidth + 3);
  u3(pRoad, 'uInk', farbInk);
  u1(pRoad, 'uRoadWidth', S.roadWidth); u1(pRoad, 'uMedian', S.medianWidth); u1(pRoad, 'uLanes', S.lanes);
  u1(pRoad, 'uBase', S.roadBase); u1(pRoad, 'uMark', S.roadMark);
  gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(roadVao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, ROWS * 2);
  gl.enable(gl.CULL_FACE);

  // Rücklichter und Scheinwerfer
  gemeinsam(pStreak);
  u1(pStreak, 'uLanes', S.lanes); u1(pStreak, 'uRoadWidth', S.roadWidth);
  u1(pStreak, 'uTrail', S.trailLength); u1(pStreak, 'uSize', S.lightSize);
  u1(pStreak, 'uIntensity', S.streak * (1 + 0.35 * st.boost)); u1(pStreak, 'uSharp', 0.85);
  [tail, head].forEach((g, i) => {
    u1(pStreak, 'uRoadX', i ? halfRoad : -halfRoad);
    u1(pStreak, 'uDirection', g.direction);
    u2(pStreak, 'uSpeedRange', g.speedRange[0], g.speedRange[1]);
    u2(pStreak, 'uFade', g.fade[0], g.fade[1]);
    u3(pStreak, 'uColors', g.farben); u1(pStreak, 'uColorCount', g.anzahl);
    gl.bindVertexArray(g.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, tubeIdx.length, gl.UNSIGNED_SHORT, 0, S.density * 2);
  });

  // Masten
  gemeinsam(pPole);
  u1(pPole, 'uCount', Math.max(1, S.poles)); u1(pPole, 'uEdge', S.roadWidth + S.medianWidth / 2 + 0.8);
  u1(pPole, 'uHeight', S.poleHeight); u3(pPole, 'uColors', poleFarben); u1(pPole, 'uColorCount', 1);
  u1(pPole, 'uIntensity', S.pole); u1(pPole, 'uSharp', 0.8);
  gl.bindVertexArray(poleVao);
  gl.drawElementsInstanced(gl.TRIANGLES, cylIdx.length, gl.UNSIGNED_SHORT, 0, S.poles * 2);

  // Staublinien
  gemeinsam(pDust);
  u1(pDust, 'uSpread', (S.roadWidth * 2 + S.medianWidth) * 5);
  u3(pDust, 'uColor', farbInk); u1(pDust, 'uIntensity', S.dustAlpha * (1 + st.boost));
  gl.disable(gl.CULL_FACE);
  gl.bindVertexArray(dustVao);
  gl.drawArrays(gl.LINES, 0, S.dust * 2);
  gl.bindVertexArray(null);
}

function groesse() {
  const b = Math.max(1, flaeche.clientWidth), hh = Math.max(1, flaeche.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  leinwand.width = Math.max(1, Math.round(b * dpr));
  leinwand.height = Math.max(1, Math.round(hh * dpr));
  st.breite = b; st.hoehe = hh;
  zeichnen();
}

let sichtbar = false, laeuft = false, letzte = 0;
function bild(jetzt) {
  if (!sichtbar || document.hidden || reduziert()) { laeuft = false; return; }
  const dt = Math.min(0.05, Math.max(0.001, (jetzt - letzte) / 1000));
  letzte = jetzt;
    const boostZiel = st.held ? 1 : 0;
  st.boost += (boostZiel - st.boost) * (1 - Math.exp(-dt / (boostZiel > st.boost ? 0.28 : 0.85)));
  // Fahrt wie im Original, dreifaches Tempo bei gedrückter Taste
  st.zeit += dt * S.speed * (1 + (S.boost - 1) * st.boost);
  const fovZiel = S.fov + (S.boostFov - S.fov) * st.boost;
  st.fovV += ((fovZiel - st.fov) * 90 - st.fovV * 13) * dt;
  st.fov += st.fovV * dt;
  const folgen = 1 - Math.exp(-dt / 0.35);
  const lenken = st.over ? S.steer : 0;
  st.sx += (st.px * lenken - st.sx) * folgen;
  st.sy += (st.py * lenken - st.sy) * folgen;
  zeichnen();
  requestAnimationFrame(bild);
}
function wecken() {
  if (laeuft || !sichtbar || reduziert()) return;
  laeuft = true;
  letzte = performance.now();
  requestAnimationFrame(bild);
}

function lage(e) {
  const r = flaeche.getBoundingClientRect();
  st.px = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
  st.py = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
}
flaeche.addEventListener('pointermove', (e) => { lage(e); st.over = true; wecken(); }, { passive: true });
flaeche.addEventListener('pointerenter', () => { st.over = true; wecken(); });
flaeche.addEventListener('pointerleave', () => { st.over = false; st.held = false; st.px = 0; st.py = 0; wecken(); });
flaeche.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (e.target.closest('a, button')) return; // ein Klick auf den Knopf beschleunigt nicht
  lage(e); st.over = true; st.held = true; wecken();
});
const loslassen = () => { if (st.held) { st.held = false; wecken(); } };
addEventListener('pointerup', loslassen);
addEventListener('pointercancel', loslassen);
addEventListener('blur', loslassen);
flaeche.addEventListener('contextmenu', (e) => { if (st.held) e.preventDefault(); });

new IntersectionObserver((e) => { sichtbar = e.some((x) => x.isIntersecting); if (sichtbar) { zeichnen(); wecken(); } }).observe(flaeche);
new ResizeObserver(groesse).observe(flaeche);
const neuLesen = () => { farbenLesen(); zeichnen(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', neuLesen);
new MutationObserver(neuLesen).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode', 'class'] });

document.addEventListener('visibilitychange', wecken);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { wecken(); zeichnen(); });
farbenLesen();
groesse();
};
const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.lichtgeschwindigkeit') ? [ort] : []), ...ort.querySelectorAll('.lichtgeschwindigkeit')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    flaecheEinrichten(el);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/lichtgeschwindigkeit.js", fehler); } }

/* system/karten-zeiger.js */
{ try {
(() => {
const KARTEN = '.lichtkarte';

document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;

  const karte = e.target.closest?.(KARTEN);
  if (!karte) return;

  const kasten = karte.getBoundingClientRect();
  if (!kasten.width || !kasten.height) return;

  karte.style.setProperty('--zx', ((e.clientX - kasten.left) / kasten.width * 100).toFixed(2) + '%');
  karte.style.setProperty('--zy', ((e.clientY - kasten.top) / kasten.height * 100).toFixed(2) + '%');
}, { passive: true });

document.addEventListener('pointerout', (e) => {
  const karte = e.target.closest?.(KARTEN);
  if (!karte || karte.contains(e.relatedTarget)) return;
  karte.style.removeProperty('--zx');
  karte.style.removeProperty('--zy');
}, { passive: true });
})();

} catch (fehler) { console.warn("marke.js · system/karten-zeiger.js", fehler); } }

/* system/fenster-lichtkasten.js */
{ try {
(() => {
const GRUPPE = '[data-lichtkasten]';

let offen = null;
let stelle = 0;

function bilder(gruppe) {
  return [...gruppe.querySelectorAll('[data-bild]')];
}

function kastenVon(gruppe) {
  return document.getElementById(gruppe.getAttribute('data-lichtkasten'));
}

function zeige(nr) {
  if (!offen) return;
  const liste = bilder(offen.gruppe);
  if (!liste.length) return;

  stelle = (nr % liste.length + liste.length) % liste.length;
  const quelle = liste[stelle];

  const titel = quelle.getAttribute('data-titel') || '';
  const adresse = quelle.getAttribute('data-quelle') || '';
  const bild = offen.kasten.querySelector('.lichtkasten__bild > img');

  if (bild) {
    if (adresse) { bild.src = adresse; bild.alt = titel; bild.hidden = false; }
    else { bild.removeAttribute('src'); bild.hidden = true; }
  }

  const titelEl = offen.kasten.querySelector('.lichtkasten__titel');
  if (titelEl) titelEl.textContent = titel;

  const zaehler = offen.kasten.querySelector('.lichtkasten__zaehler');
  if (zaehler) zaehler.textContent = `${stelle + 1} von ${liste.length}`;

  const vorschauen = [...offen.kasten.querySelectorAll('.lichtkasten__vorschau')];
  vorschauen.forEach((v, i) => {
    if (i === stelle) v.setAttribute('aria-current', 'true');
    else v.removeAttribute('aria-current');
  });

  vorschauen[stelle]?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function oeffne(gruppe, nr) {
  const kasten = kastenVon(gruppe);
  if (!kasten || typeof kasten.showModal !== 'function') return;

  const leiste = kasten.querySelector('.lichtkasten__leiste');
  if (leiste) {
    leiste.replaceChildren(...bilder(gruppe).map((b, i) => {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'lichtkasten__vorschau';
      knopf.dataset.zuBild = String(i);
      const bild = b.querySelector('img, .verhaeltnis');
      if (bild) knopf.append(bild.cloneNode(true));
      const name = document.createElement('span');
      name.className = 'visually-hidden';
      name.textContent = b.getAttribute('data-titel') || `Bild ${i + 1}`;
      knopf.append(name);
      return knopf;
    }));
  }

  offen = { gruppe, kasten };
  zeige(nr);
  kasten.showModal();
}


document.addEventListener('click', (e) => {
  const ziel = e.target;

  const quelle = ziel.closest?.('[data-bild]');
  if (quelle) {
    const gruppe = quelle.closest(GRUPPE);
    if (gruppe) { oeffne(gruppe, bilder(gruppe).indexOf(quelle)); return; }
  }

  if (!offen) return;

  const vorschau = ziel.closest?.('[data-zu-bild]');
  if (vorschau) { zeige(Number(vorschau.dataset.zuBild)); return; }

  const pfeil = ziel.closest?.('[data-lichtkasten-schritt]');
  if (pfeil) zeige(stelle + Number(pfeil.dataset.lichtkastenSchritt));
});

document.addEventListener('keydown', (e) => {
  if (!offen || !offen.kasten.open) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); zeige(stelle - 1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); zeige(stelle + 1); }
});

document.addEventListener('close', (e) => {
  if (offen && e.target === offen.kasten) offen = null;
}, true);
})();

} catch (fehler) { console.warn("marke.js · system/fenster-lichtkasten.js", fehler); } }

/* system/lupe.js */
{ try {
(() => {
let zaehler = 0;
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.lupe__flaeche') ? [wurzel] : []), ...wurzel.querySelectorAll('.lupe__flaeche')];
for (const el of treffer) {
  if (fertig.has(el)) continue;
  fertig.add(el);
  const bild = el.querySelector('.lupe__bild');
  if (!bild) continue;

  const glas = document.createElement('div');
  glas.className = 'lupe__glas';
  glas.setAttribute('aria-hidden', 'true');
  const innen = document.createElement('div');
  innen.className = 'lupe__innen';
  innen.append(bild.cloneNode(true));
  glas.append(innen);
  const ring = document.createElement('span');
  ring.className = 'lupe__ring';
  ring.setAttribute('aria-hidden', 'true');
  el.append(glas, ring);

  const hinweis = el.parentElement?.querySelector('.lupe__hinweis');
  if (hinweis) {
    if (!hinweis.id) hinweis.id = `lupe-hinweis-${++zaehler}`;
    el.setAttribute('aria-describedby', hinweis.id);
  }

  let fx = 0.5, fy = 0.5;
  const setzen = () => {
    el.style.setProperty('--lupe-x', `${(fx * 100).toFixed(2)}%`);
    el.style.setProperty('--lupe-y', `${(fy * 100).toFixed(2)}%`);
  };
  const an = () => { el.dataset.lupe = 'an'; };
  const aus = () => { el.dataset.lupe = 'aus'; };
  const zeiger = (e) => {
    const r = el.getBoundingClientRect();
    fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setzen();
  };
  setzen();
  aus();

  el.addEventListener('pointerenter', (e) => { zeiger(e); an(); });
  el.addEventListener('pointermove', (e) => { zeiger(e); an(); });
  el.addEventListener('pointerdown', (e) => { zeiger(e); an(); });
  el.addEventListener('pointerleave', aus);
  el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') aus(); });
  el.addEventListener('pointercancel', aus);

  const schritt = 0.06;
  el.addEventListener('focus', () => { if (el.matches(':focus-visible')) an(); });
  el.addEventListener('blur', aus);
  el.addEventListener('keydown', (e) => {
    const bewegung = { ArrowLeft: [-schritt, 0], ArrowRight: [schritt, 0], ArrowUp: [0, -schritt], ArrowDown: [0, schritt] }[e.key];
    if (bewegung) {
      e.preventDefault();
      fx = Math.min(1, Math.max(0, fx + bewegung[0]));
      fy = Math.min(1, Math.max(0, fy + bewegung[1]));
      setzen(); an();
    } else if (e.key === 'Escape') {
      aus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.dataset.lupe === 'an' ? aus() : an();
    } else if (e.key === 'Home') {
      e.preventDefault(); fx = 0.5; fy = 0.5; setzen(); an();
    }
  });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/lupe.js", fehler); } }

/* system/markierung.js */
{ try {
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var fertig = new WeakSet();
  function einrichten(wurzel) {
  var wurzeln = Array.prototype.slice.call(wurzel.querySelectorAll('.markierung'));
  if (wurzel.matches && wurzel.matches('.markierung')) wurzeln.unshift(wurzel);

  wurzeln.forEach(function (bereich) {
    if (fertig.has(bereich)) return;
    fertig.add(bereich);
    var marken = Array.prototype.slice.call(bereich.querySelectorAll('.markierung__text'));
    if (!marken.length) return;
    var folie = document.createElementNS(NS, 'svg');
    folie.setAttribute('class', 'markierung__folie');
    folie.setAttribute('aria-hidden', 'true');
    bereich.insertBefore(folie, bereich.firstChild);
    bereich.classList.add('ist-bereit');

    function zeichnen() {
      while (folie.firstChild) folie.removeChild(folie.firstChild);
      var br = bereich.getBoundingClientRect();
      var zaehler = 0;
      marken.forEach(function (marke) {
        Array.prototype.slice.call(marke.getClientRects()).forEach(function (r) {
          if (r.width < 2) return;
          var dicke = r.height * 0.82;
          var rand = Math.min(dicke / 2, r.width / 2);
          var ueber = r.height * 0.12;
          var x0 = r.left - br.left + rand - ueber;
          var x1 = r.right - br.left - rand + ueber;
          var y = r.top - br.top + r.height / 2;
          var schief = r.height * 0.05 * (zaehler % 2 ? 1 : -1);
          var p = document.createElementNS(NS, 'path');
          p.setAttribute('d', 'M' + x0 + ' ' + (y + schief) + ' Q' + ((x0 + x1) / 2) + ' ' + (y - schief * 2) + ' ' + x1 + ' ' + (y - schief));
          p.setAttribute('pathLength', '1');
          p.setAttribute('stroke-width', dicke);
          p.setAttribute('class', 'markierung__strich');
          p.style.setProperty('--strich-nr', zaehler);
          folie.appendChild(p);
          zaehler++;
        });
      });
    }
    zeichnen();
    if ('ResizeObserver' in window) new ResizeObserver(zeichnen).observe(bereich);
    else window.addEventListener('resize', zeichnen);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(zeichnen);

    if (!('IntersectionObserver' in window)) { bereich.classList.add('ist-da'); return; }
    var io = new IntersectionObserver(function (liste) {
      if (liste[0].isIntersecting) { bereich.classList.add('ist-da'); io.disconnect(); }
    }, { rootMargin: '-10% 0px' });
    io.observe(bereich);
  });
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', function (e) { einrichten(e.target instanceof Element ? e.target : document); });
})();

} catch (fehler) { console.warn("marke.js · system/markierung.js", fehler); } }

/* system/mauerwerk.js */
{ try {
(() => {
const MQ = matchMedia('(prefers-reduced-motion: reduce)');
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
const STAFFEL = 50;   // ms
const DAUER = 800;    // ms
const WEG = 6;        // rem

function spalten(breite) {
  const r = breite / rem();
  return r >= 72 ? 5 : r >= 52 ? 4 : r >= 34 ? 3 : r >= 20 ? 2 : 1;
}

function starten(liste) {
  // Höhe geteilt durch Breite kommt aus den Massen des Fotos.
  const kacheln = [...liste.querySelectorAll('.mauerwerk__kachel')].map(li => {
    const f = li.querySelector('img');
    const b = Number(f && f.getAttribute('width')), h = Number(f && f.getAttribute('height'));
    return { li, format: b && h ? h / b : 1 };
  });
  let eingelaufen = false;
  let plaetze = [];

  liste.classList.add('mauerwerk__liste--an');
  if (!MQ.matches) kacheln.forEach(k => k.li.classList.add('ist-wartend'));

  function ordnen() {
    const breite = liste.clientWidth;
    if (!breite) return;
    const n = spalten(breite);
    const sp = breite / n;
    const hoehen = new Array(n).fill(0);
    plaetze = kacheln.map(k => {
      const c = hoehen.indexOf(Math.min(...hoehen));
      const h = sp * k.format;
      const p = { x: sp * c, y: hoehen[c], w: sp, h };
      hoehen[c] += h;
      return p;
    });
    liste.style.height = `${Math.max(...hoehen)}px`;
    kacheln.forEach((k, i) => {
      const p = plaetze[i];
      k.li.style.width = `${p.w}px`;
      k.li.style.height = `${p.h}px`;
      k.li.style.transform = `translate(${p.x}px, ${p.y}px)`;
    });
  }

  function einlaufen() {
    if (eingelaufen) return;
    eingelaufen = true;
    const ruhig = MQ.matches;
    let offen = kacheln.length;
    kacheln.forEach((k, i) => {
      k.li.classList.remove('ist-wartend');
      const p = plaetze[i];
      const fertig = () => { k.li.classList.add('ist-bereit'); offen--; };
      if (ruhig || !k.li.animate) { fertig(); return; }
      const weg = WEG * rem();
      const a = k.li.animate(
        [
          { opacity: 0, transform: `translate(${p.x}px, ${p.y + weg}px)` },
          { opacity: 1, transform: `translate(${p.x}px, ${p.y}px)` }
        ],
        { duration: DAUER, delay: i * STAFFEL, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
      );
      a.onfinish = fertig;
      a.oncancel = fertig;
    });
  }

  new ResizeObserver(() => ordnen()).observe(liste);
  ordnen();

  new IntersectionObserver((eintraege, io) => {
    if (eintraege.some(e => e.isIntersecting)) { einlaufen(); io.disconnect(); }
  }, { threshold: 0.1 }).observe(liste);
}

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.mauerwerk__liste') ? [wurzel] : []), ...wurzel.querySelectorAll('.mauerwerk__liste')];
  for (const liste of treffer) {
    if (fertig.has(liste)) continue;
    fertig.add(liste);
    starten(liste);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/mauerwerk.js", fehler); } }

/* system/modusschalter.js */
{ try {
(() => {
const wurzel = document.documentElement;
const alleSchalter = () => document.querySelectorAll('.modusschalter');
const geraetDunkel = matchMedia('(prefers-color-scheme: dark)');
const istDunkel = () => {
  const modus = wurzel.getAttribute('data-mode');
  if (modus === 'light') return false;
  if (modus === 'dark') return true;
  const schema = getComputedStyle(wurzel).colorScheme.split(/\s+/);
  return !(schema.includes('light') && !schema.includes('dark'));
};

const abgleichen = () => {
  const dunkel = String(istDunkel());
  for (const s of alleSchalter()) {
    if (s.getAttribute('aria-checked') !== dunkel) s.setAttribute('aria-checked', dunkel);
    if (!s.hasAttribute('data-abgeglichen')) s.setAttribute('data-abgeglichen', '');
  }
};
abgleichen();
new MutationObserver(abgleichen).observe(wurzel, { attributes: true, attributeFilter: ['data-mode'] });
geraetDunkel.addEventListener('change', abgleichen);
addEventListener('load', abgleichen);
new MutationObserver((liste) => {
  if (liste.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches('.modusschalter') || n.querySelector?.('.modusschalter'))))) abgleichen();
}).observe(wurzel, { childList: true, subtree: true });

document.addEventListener('click', async (e) => {
  const schalter = e.target.closest?.('.modusschalter');
  if (!schalter) return;
  const dunkel = !istDunkel();
  for (const s of alleSchalter()) s.setAttribute('aria-checked', String(dunkel));
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dauer = ruhig ? 0 : (parseFloat(getComputedStyle(wurzel).getPropertyValue('--t-base')) || 0);
  await new Promise((fertig) => setTimeout(fertig, dauer));
  wurzel.setAttribute('data-mode', dunkel ? 'dark' : 'light');
  abgleichen();
  requestAnimationFrame(() => {
    document.dispatchEvent(new CustomEvent('modus', { bubbles: true, detail: { dunkel } }));
  });
});
})();

} catch (fehler) { console.warn("marke.js · system/modusschalter.js", fehler); } }

/* system/nachoben.js */
{ try {
(() => {
const DAUER_MS = 700;
const kurve = (t) => 1 - Math.pow(1 - t, 3);

const sanft = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

function laufeNachOben(ziel) {
  const start = window.scrollY;
  const weg = start - ziel;
  if (weg <= 0) return;
  const t0 = performance.now();
  const schritt = (jetzt) => {
    const anteil = Math.min((jetzt - t0) / DAUER_MS, 1);
    window.scrollTo({ top: start - weg * kurve(anteil), behavior: 'instant' });
    if (anteil < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.('.nachoben');
  if (!knopf) return;
  if (!sanft()) return;                  // Sprung, wie der Browser ihn macht
  e.preventDefault();
  laufeNachOben(0);
  const anfang = document.getElementById('top') || document.body;
  anfang.setAttribute('tabindex', '-1');
  anfang.focus({ preventScroll: true });
});
})();

} catch (fehler) { console.warn("marke.js · system/nachoben.js", fehler); } }

/* system/organigramm.js */
{ try {
(() => {
const MASS_MIN = 0.5, MASS_MAX = 1.4, MASS_SCHRITT = 0.1;

function waehle(org, id) {
  const karte = org.querySelector(`.organigramm__karte[data-id="${CSS.escape(id)}"]`);
  if (!karte) return;
  for (const k of org.querySelectorAll('.organigramm__karte[aria-current]')) k.removeAttribute('aria-current');
  karte.setAttribute('aria-current', 'true');
  for (let ast = karte.closest('ul')?.closest('li'); ast; ast = ast.parentElement?.closest('li')) {
    const auf = ast.querySelector(':scope > .organigramm__auf');
    if (auf) klappe(auf, true);
  }
  for (const e of org.querySelectorAll('.organigramm__eintrag[data-fuer]')) e.hidden = e.dataset.fuer !== id;
  hebeHervor(org);
}

const woerter = (s) => (s || '').split(/\s+/).filter(Boolean);
function hebeHervor(org) {
  const ansicht = org.querySelector('.organigramm__ansicht input:checked')?.value || 'hierarchie';
  org.dataset.ansicht = ansicht;
  const feld = org.querySelector('.organigramm__datei');
  if (feld) feld.hidden = ansicht !== 'zugriff';
  const datei = feld?.querySelector('select')?.value;
  const gewaehlt = org.querySelector('.organigramm__karte[aria-current="true"]');
  const partner = woerter(gewaehlt?.dataset.spricht);
  for (const k of org.querySelectorAll('.organigramm__karte')) {
    const hervor = ansicht === 'zugriff' ? woerter(k.dataset.liest).includes(datei)
      : ansicht === 'kommunikation' ? partner.includes(k.dataset.id) : false;
    k.toggleAttribute('data-hervor', hervor);
    k.toggleAttribute('data-isoliert', ansicht === 'kommunikation' && k.hasAttribute('data-spricht') && !woerter(k.dataset.spricht).length);
  }
}

function vollbild(org, an) {
  org.classList.toggle('ist-vollbild', an);
  const knopf = org.querySelector('[data-organigramm-vollbild]');
  if (knopf) { knopf.setAttribute('aria-pressed', String(an)); knopf.setAttribute('aria-label', an ? 'Vollbild schliessen' : 'Vollbild'); }
  if (an) org.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement === org) document.exitFullscreen?.().catch(() => {});
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const org of document.querySelectorAll('.organigramm.ist-vollbild')) vollbild(org, false);
});
document.addEventListener('fullscreenchange', () => {
  for (const org of document.querySelectorAll('.organigramm.ist-vollbild')) if (document.fullscreenElement !== org) vollbild(org, false);
});

function zeigeLeser(org, datei) {
  const wahl = org.querySelector('.organigramm__ansicht input[value="zugriff"]');
  const select = org.querySelector('.organigramm__datei select');
  if (!wahl || !select) return;
  wahl.checked = true;
  select.value = datei;
  hebeHervor(org);
}

function klappe(auf, offen) {
  auf.setAttribute('aria-expanded', String(offen));
  auf.setAttribute('aria-label', offen ? 'Zuklappen' : 'Aufklappen');
  const ast = auf.nextElementSibling;
  if (ast?.tagName === 'UL') ast.hidden = !offen;
}

function zoome(org, richtung) {
  const jetzt = parseFloat(org.style.getPropertyValue('--organigramm-mass')) || 1;
  const neu = Math.min(MASS_MAX, Math.max(MASS_MIN, Math.round((jetzt + richtung * MASS_SCHRITT) * 10) / 10));
  org.style.setProperty('--organigramm-mass', neu);
}

let zug = null;
document.addEventListener('pointerdown', (e) => {
  const flaeche = e.target.closest?.('.organigramm__flaeche');
  if (!flaeche || e.button !== 0 || e.target.closest('button') || flaeche.closest('.organigramm--waagrecht')) return;
  zug = { flaeche, x: e.clientX, y: e.clientY, l: flaeche.scrollLeft, t: flaeche.scrollTop, gezogen: false };
});
document.addEventListener('pointermove', (e) => {
  if (!zug) return;
  const dx = e.clientX - zug.x, dy = e.clientY - zug.y;
  if (!zug.gezogen && Math.abs(dx) + Math.abs(dy) < 4) return;
  zug.gezogen = true;
  zug.flaeche.classList.add('ist-gezogen');
  zug.flaeche.scrollLeft = zug.l - dx;
  zug.flaeche.scrollTop = zug.t - dy;
});
document.addEventListener('pointerup', () => { zug?.flaeche.classList.remove('ist-gezogen'); zug = null; });

document.addEventListener('click', (e) => {
  const org = e.target.closest?.('.organigramm');
  if (!org) return;
  const auf = e.target.closest('.organigramm__auf');
  if (auf) { klappe(auf, auf.getAttribute('aria-expanded') !== 'true'); return; }
  const zoom = e.target.closest('[data-organigramm-zoom]');
  if (zoom) { zoome(org, Number(zoom.dataset.organigrammZoom)); return; }
  const leser = e.target.closest('[data-organigramm-datei]');
  if (leser) { zeigeLeser(org, leser.dataset.organigrammDatei); return; }
  const voll = e.target.closest('[data-organigramm-vollbild]');
  if (voll) { vollbild(org, !org.classList.contains('ist-vollbild')); return; }
  const ziel = e.target.closest('.organigramm__karte, [data-organigramm-zeige]');
  if (ziel) waehle(org, ziel.dataset.id || ziel.dataset.organigrammZeige);
});

document.addEventListener('change', (e) => {
  const org = e.target.closest?.('.organigramm');
  if (org && e.target.closest('.organigramm__leiste')) hebeHervor(org);
});

function passe(flaeche) {
  flaeche.removeAttribute('data-schmal');
  if (flaeche.scrollWidth > flaeche.clientWidth + 1) flaeche.setAttribute('data-schmal', '');
}
const beobachter = new ResizeObserver((eintraege) => {
  for (const e of eintraege) {
    const flaeche = e.target, breite = Math.round(e.contentRect.width);
    if (flaeche._breite === breite) continue; // nur bei neuer Breite messen, passe() ändert selbst die Höhe
    flaeche._breite = breite;
    passe(flaeche);
  }
});
document.fonts?.ready.then(() => {
  for (const f of document.querySelectorAll('.organigramm--waagrecht > .organigramm__flaeche')) passe(f);
});

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.organigramm') ? [wurzel] : []), ...wurzel.querySelectorAll('.organigramm')];
  for (const org of treffer) {
    if (fertig.has(org)) continue;
    fertig.add(org);
    if (org.classList.contains('organigramm--waagrecht')) {
      const flaeche = org.querySelector('.organigramm__flaeche');
      if (flaeche) { passe(flaeche); beobachter.observe(flaeche); }
      continue;
    }
    const gewaehlt = org.querySelector('.organigramm__karte[aria-current="true"]') || org.querySelector('.organigramm__karte');
    if (gewaehlt) waehle(org, gewaehlt.dataset.id);
    const flaeche = org.querySelector('.organigramm__flaeche');
    if (flaeche) flaeche.scrollLeft = (flaeche.scrollWidth - flaeche.clientWidth) / 2;
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));

window.organigrammSetzen = (org) => { fertig.delete(org); einrichten(org); };
})();

} catch (fehler) { console.warn("marke.js · system/organigramm.js", fehler); } }

/* system/reiter.js */
{ try {
(() => {
const setze = (reiter) => {
  const wert = reiter.querySelector(':scope > .reiter__leiste input[type="radio"]:checked')?.value;
  for (const blatt of reiter.querySelectorAll(':scope > .reiter__blatt[data-fuer]')) {
    blatt.toggleAttribute('data-aktiv', blatt.dataset.fuer === wert);
  }
};

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.reiter') ? [wurzel] : []), ...wurzel.querySelectorAll('.reiter')];
  for (const reiter of treffer) {
    if (fertig.has(reiter)) continue;
    fertig.add(reiter);
    setze(reiter);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));

document.addEventListener('change', (e) => {
  const reiter = e.target.closest?.('.reiter__leiste')?.parentElement;
  if (reiter?.classList.contains('reiter')) setze(reiter);
});

window.reiterSetzen = setze;
})();

} catch (fehler) { console.warn("marke.js · system/reiter.js", fehler); } }

/* system/partikel.js */
{ try {
(() => {
  const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fertig = new WeakSet();
  function einrichten(ort) {
    const treffer = [...(ort.matches?.('.partikel') ? [ort] : []), ...ort.querySelectorAll('.partikel')];
    for (const flaeche of treffer) {
      if (fertig.has(flaeche)) continue;
      fertig.add(flaeche);
    const leinwand = flaeche.querySelector('.partikel__leinwand');
    if (!leinwand) continue;
    const stift = leinwand.getContext('2d');
    const menge = Number(flaeche.dataset.menge) || 100;
    const traegheit = 50;   // wie stark der Zeiger zieht (Magic UI: staticity)
    const weich = 50;       // wie träge die Punkte folgen (Magic UI: ease)
    const radius = 0.8;     // Grundradius, ein Teil der Punkte ist einen Pixel grösser

    let B = 0, H = 0, punkte = [], farbe = '', laeuft = false, drin = false, sichtbar = true, bis = 0, dpr = 1;
    const maus = { x: 0, y: 0 };

    const neu = () => ({
      x: Math.random() * B, y: Math.random() * H, tx: 0, ty: 0,
      r: Math.floor(Math.random() * 2) + radius,
      a: 0, ziel: Math.round((Math.random() * 0.6 + 0.1) * 10) / 10,
      dx: (Math.random() - 0.5) * 0.1, dy: (Math.random() - 0.5) * 0.1,
      mag: 0.1 + Math.random() * 4,
    });
    const umbilden = (wert, a1, e1, a2, e2) => Math.max(0, ((wert - a1) * (e2 - a2)) / (e1 - a1) + a2);

    function zeichnen() {
      stift.setTransform(dpr, 0, 0, dpr, 0, 0);
      stift.clearRect(0, 0, B, H);
      stift.fillStyle = farbe;
      for (const p of punkte) {
        stift.globalAlpha = p.a;
        stift.beginPath();
        stift.arc(p.x + p.tx, p.y + p.ty, p.r, 0, Math.PI * 2);
        stift.fill();
      }
      stift.globalAlpha = 1;
    }

    function messen() {
      const k = flaeche.getBoundingClientRect();
      B = k.width; H = k.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      leinwand.width = Math.max(1, Math.round(B * dpr));
      leinwand.height = Math.max(1, Math.round(H * dpr));
      farbe = getComputedStyle(flaeche).color;
      punkte = Array.from({ length: menge }, () => {
        const p = neu();
        if (reduziert()) p.a = p.ziel; // ohne Bewegung stehen alle Punkte sofort vollständig da
        return p;
      });
      zeichnen();
      if (!reduziert()) anstossen(1400);
    }

    function schritt() {
      let unruhig = false;
      for (let i = 0; i < punkte.length; i++) {
        const p = punkte[i];
        const rand = Math.min(p.x + p.tx - p.r, B - p.x - p.tx - p.r, p.y + p.ty - p.r, H - p.y - p.ty - p.r);
        const nah = umbilden(rand, 0, 20, 0, 1);
        if (nah > 1) { p.a = Math.min(p.ziel, p.a + 0.02); } else { p.a = p.ziel * nah; }
        if (p.a < p.ziel) unruhig = true;
        if (drin) { p.x += p.dx; p.y += p.dy; }
        p.tx += (maus.x / (traegheit / p.mag) - p.tx) / weich;
        p.ty += (maus.y / (traegheit / p.mag) - p.ty) / weich;
        if (Math.abs(maus.x / (traegheit / p.mag) - p.tx) > 0.05 || Math.abs(maus.y / (traegheit / p.mag) - p.ty) > 0.05) unruhig = true;
        if (p.x < -p.r || p.x > B + p.r || p.y < -p.r || p.y > H + p.r) punkte[i] = neu();
      }
      zeichnen();
      return unruhig;
    }

    function schleife(jetzt) {
      if (!sichtbar || reduziert()) { laeuft = false; return; }
      const unruhig = schritt();
      if (drin || unruhig || jetzt < bis) requestAnimationFrame(schleife);
      else laeuft = false;
    }
    function anstossen(ruhe = 0) {
      if (reduziert()) return;
      bis = Math.max(bis, performance.now() + ruhe);
      if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); }
    }

    flaeche.addEventListener('pointermove', (e) => {
      const k = flaeche.getBoundingClientRect();
      maus.x = e.clientX - k.left - B / 2;
      maus.y = e.clientY - k.top - H / 2;
      drin = true;
      anstossen();
    });
    const raus = () => { drin = false; maus.x = 0; maus.y = 0; anstossen(); };
    flaeche.addEventListener('pointerleave', raus);
    flaeche.addEventListener('pointercancel', raus);

    new ResizeObserver(() => { if (flaeche.clientWidth) messen(); }).observe(flaeche);
    new IntersectionObserver((e) => { sichtbar = e.some((x) => x.isIntersecting); if (sichtbar) anstossen(); }).observe(flaeche);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', messen);
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/partikel.js", fehler); } }

/* system/passwortfeld.js */
{ try {
(() => {
const ohneTab = (wurzel = document) => { for (const k of wurzel.querySelectorAll('.feld__sicht')) k.tabIndex = -1; };
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.feld__sicht') ? [wurzel] : []), ...wurzel.querySelectorAll('.feld__sicht')];
  for (const k of treffer) {
    if (fertig.has(k)) continue;
    fertig.add(k);
    k.tabIndex = -1;
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
document.addEventListener('focusin', (e) => { const w = e.target.closest?.('.feld__eingabe'); if (w) ohneTab(w); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'F8' || !e.altKey) return;
  const knopf = e.target.closest?.('.feld__eingabe')?.querySelector('.feld__sicht');
  if (!knopf || knopf.disabled) return;
  e.preventDefault();
  knopf.click();
});
document.addEventListener('click', (e) => {
  const knopf = e.target.closest('.feld__sicht');
  if (!knopf) return;

  const eingabe = knopf.closest('.feld__eingabe')?.querySelector('input');
  if (!eingabe) return;

  const sichtbar = knopf.getAttribute('aria-pressed') === 'true';
  eingabe.type = sichtbar ? 'password' : 'text';
  knopf.setAttribute('aria-pressed', String(!sichtbar));
  const beschriftung = sichtbar ? 'Passwort anzeigen' : 'Passwort verbergen';
  knopf.setAttribute('aria-label', beschriftung);
  knopf.title = beschriftung;

  eingabe.focus();
});
})();

} catch (fehler) { console.warn("marke.js · system/passwortfeld.js", fehler); } }

/* system/pixelaufbau.js */
{ try {
(() => {
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function dauer(token) {
  const probe = document.createElement('i');
  probe.style.transitionDuration = `var(${token})`;
  document.body.append(probe);
  const wert = getComputedStyle(probe).transitionDuration;
  probe.remove();
  return wert.endsWith('ms') ? parseFloat(wert) : parseFloat(wert) * 1000;
}

const fertig = new WeakSet();
function einrichten(ort) {
const treffer = [...(ort.matches?.('.pixelaufbau') ? [ort] : []), ...ort.querySelectorAll('.pixelaufbau')];
for (const wurzel of treffer) {
  if (fertig.has(wurzel)) continue;
  fertig.add(wurzel);
  const el = wurzel.querySelector('.pixelaufbau__flaeche');
  const quelle = el?.querySelector('.pixelaufbau__bild');
  if (!quelle) continue;
  const spalten = Number(wurzel.dataset.spalten) || 8;
  const zeilen = Number(wurzel.dataset.zeilen) || 6;
  let zeitgeber = [];

  function aufbauen() {
    if (reduziert()) return;
    zeitgeber.forEach(clearTimeout);
    zeitgeber = [];
    el.querySelector('.pixelaufbau__stapel')?.remove();
    el.classList.remove('ist-da', 'ist-farbe');
    el.classList.add('ist-aufbau');
    const lang = dauer('--t-lang');
    const stapel = document.createElement('div');
    stapel.className = 'pixelaufbau__stapel';
    stapel.setAttribute('aria-hidden', 'true');
    for (let z = 0; z < zeilen; z++) {
      for (let s = 0; s < spalten; s++) {
        const zelle = document.createElement('div');
        zelle.className = 'pixelaufbau__zelle';
        const o = (z / zeilen) * 100, u = 100 - ((z + 1) / zeilen) * 100;
        const l = (s / spalten) * 100, r = 100 - ((s + 1) / spalten) * 100;
        zelle.style.clipPath = `inset(${o}% ${r}% ${u}% ${l}%)`;
        zelle.style.transitionDelay = `${(Math.random() * lang).toFixed(0)}ms, 0ms`;
        const kopie = quelle.cloneNode(true);
        kopie.removeAttribute('role');
        kopie.removeAttribute('aria-label');
        kopie.setAttribute('aria-hidden', 'true');
        zelle.append(kopie);
        stapel.append(zelle);
      }
    }
    el.append(stapel);
    stapel.getBoundingClientRect(); // Ausgangszustand festschreiben, dann überblenden
    el.classList.add('ist-da');
    zeitgeber.push(setTimeout(() => el.classList.add('ist-farbe'), lang * 1.4));
    zeitgeber.push(setTimeout(() => {
      el.classList.remove('ist-aufbau');
      stapel.remove();
    }, lang * 3));
  }

  if ('IntersectionObserver' in window && !reduziert()) {
    const beobachter = new IntersectionObserver((eintraege) => {
      if (eintraege.some((e) => e.isIntersecting)) { beobachter.disconnect(); aufbauen(); }
    }, { threshold: 0.4 });
    beobachter.observe(el);
  }
  wurzel.querySelector('.pixelaufbau__neu')?.addEventListener('click', aufbauen);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/pixelaufbau.js", fehler); } }

/* system/preisstufen.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.preisstufen') ? [wurzel] : []), ...wurzel.querySelectorAll('.preisstufen')];
for (const stufen of treffer) {
  if (fertig.has(stufen)) continue;
  fertig.add(stufen);
  const pakete = [...stufen.querySelectorAll('.preisstufe')];
  const stand = stufen.querySelector('.preisstufen__stand');

  const melden = () => {
    if (!stand) return;
    const p = pakete.find((x) => x.querySelector('.btn')?.getAttribute('aria-pressed') === 'true');
    if (!p) return;
    const klar = [...p.querySelectorAll('.preisstufe__klartext')]
      .find((e) => getComputedStyle(e).display !== 'none');
    stand.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = p.querySelector('.preisstufe__name').textContent;
    stand.append('Gewählt: ', b, klar ? ' · ' + klar.textContent : '');
  };

  const waehlen = (p) => {
    for (const q of pakete) q.querySelector('.btn')?.setAttribute('aria-pressed', String(q === p));
    melden();
  };

  const weiter = (p) => {
    const ziel = stufen.dataset.ziel && document.querySelector(stufen.dataset.ziel);
    const knopf = p.querySelector('.btn');
    stufen.dispatchEvent(new CustomEvent('preisstufe', {
      bubbles: true,
      detail: { name: p.querySelector('.preisstufe__name')?.textContent.trim(), wert: knopf?.dataset.wert },
    }));
    if (!ziel) return;
    ziel.scrollIntoView({ block: 'start' });
    const erstes = ziel.querySelector('input, select, textarea, button');
    (erstes || ziel).focus({ preventScroll: true });
  };

  for (const p of pakete) {
    p.addEventListener('click', (e) => {
      waehlen(p);
      if (e.target.closest('.btn')) weiter(p);
    });
  }
  stufen.addEventListener('change', melden);
  melden();
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/preisstufen.js", fehler); } }

/* system/querabschnitt.js */
{ try {
(() => {
  if (!CSS.supports('animation-timeline: view()')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function start(wurzel) {
    const haft = wurzel.querySelector('.querabschnitt__haft');
    const spur = wurzel.querySelector('.querabschnitt__spur');
    if (!haft || !spur) return;
    function messen() {
      wurzel.classList.remove('querabschnitt--still');
      const weg = Math.ceil(spur.scrollWidth - haft.clientWidth);
      if (weg <= 8) { wurzel.classList.add('querabschnitt--still'); wurzel.style.removeProperty('--querabschnitt-hoehe'); return; }
      wurzel.style.setProperty('--querabschnitt-hoehe', `${haft.clientHeight + weg}px`);
    }
    messen();
    new ResizeObserver(messen).observe(spur);
    addEventListener('resize', messen, { passive: true });
  }

  const alle = () => document.querySelectorAll('.querabschnitt').forEach(start);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alle, { once: true });
  else alle();
})();

} catch (fehler) { console.warn("marke.js · system/querabschnitt.js", fehler); } }

/* system/rechnungsliste.js */
{ try {
(() => {
  const fertig = new WeakSet();
  function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.rechnungsliste') ? [wurzel] : []), ...wurzel.querySelectorAll('.rechnungsliste')];
  for (const liste of treffer) {
    if (fertig.has(liste)) continue;
    fertig.add(liste);
    const leiste = liste.querySelector('[data-gewaehlt]');
    const tabelle = liste.querySelector('table');
    if (!leiste || !tabelle) continue;
    const zahl = leiste.querySelector('[data-n]');
    const knoepfe = leiste.querySelectorAll('button[data-braucht-auswahl]');
    const angleichen = () => {
      const n = tabelle.querySelectorAll('tbody input[type="checkbox"]:checked').length;
      leiste.dataset.gewaehlt = String(n);
      if (zahl) zahl.textContent = String(n);
      for (const k of knoepfe) k.disabled = n === 0;
    };
    tabelle.addEventListener('change', angleichen);
    angleichen();
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/rechnungsliste.js", fehler); } }

/* system/formular-regler.js */
{ try {
(() => {
const ausgabeZu = (regler) => regler.id && document.querySelector(`.regler__wert[for~="${CSS.escape(regler.id)}"]`);

const text = (ausgabe, wert) => (ausgabe.dataset.einheit ? `${wert} ${ausgabe.dataset.einheit}` : wert);
const fuelle = (ausgabe) => {
  const regler = document.getElementById(ausgabe.getAttribute('for'));
  if (regler instanceof HTMLInputElement && regler.type === 'range') ausgabe.textContent = text(ausgabe, regler.value);
};

document.addEventListener('input', (e) => {
  if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'range') return;
  const ausgabe = ausgabeZu(e.target);
  if (ausgabe) ausgabe.textContent = text(ausgabe, e.target.value);
});

const alleIn = (wurzel) => {
  if (wurzel.matches?.('.regler__wert[for]')) fuelle(wurzel);
  for (const a of wurzel.querySelectorAll?.('.regler__wert[for]') ?? []) fuelle(a);
};
alleIn(document);
new MutationObserver((liste) => {
  for (const m of liste) for (const n of m.addedNodes) if (n.nodeType === 1) alleIn(n);
}).observe(document.documentElement, { childList: true, subtree: true });
})();

} catch (fehler) { console.warn("marke.js · system/formular-regler.js", fehler); } }

/* system/scroll-reihenfolge.js */
{ try {
(() => {
const REIHE = '.reihenfolge';

const ruhig = matchMedia('(prefers-reduced-motion: reduce)');

function zeilen(liste) {
  return [...liste.children];
}

function nachfuehren(liste) {
  const alle = zeilen(liste);
  alle.forEach((li, i) => {
    const platz = li.querySelector('.reihenfolge__platz');
    if (platz) platz.textContent = String(i + 1);
    const hoch = li.querySelector('[data-schritt="-1"]');
    const runter = li.querySelector('[data-schritt="1"]');
    if (hoch) hoch.disabled = i === 0;
    if (runter) runter.disabled = i === alle.length - 1;
  });
}

function umstellen(liste, zeile, schritt) {
  const nachbar = schritt < 0 ? zeile.previousElementSibling : zeile.nextElementSibling;
  if (!nachbar) return;

  const vorher = new Map(zeilen(liste).map((li) => [li, li.getBoundingClientRect().top]));

  if (schritt < 0) liste.insertBefore(nachbar, zeile.nextElementSibling);
  else liste.insertBefore(nachbar, zeile);

  nachfuehren(liste);

  if (!ruhig.matches) {
    for (const li of zeilen(liste)) {
      const weg = vorher.get(li) - li.getBoundingClientRect().top;
      if (!weg) continue;
      li.animate(
        [{ transform: `translateY(${weg}px)` }, { transform: 'none' }],
        { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
    }
  }

  const meldung = zeile.closest(REIHE)?.querySelector('[data-reihenfolge-ansage]');
  if (meldung) {
    const name = zeile.querySelector('b')?.textContent ?? '';
    meldung.textContent = `${name} ist jetzt auf Platz ${zeilen(liste).indexOf(zeile) + 1} von ${zeilen(liste).length}`;
  }
}

document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.('.reihenfolge [data-schritt]');
  if (!knopf || knopf.disabled) return;

  const zeile = knopf.closest('li');
  const liste = zeile?.parentElement;
  if (!zeile || !liste) return;

  umstellen(liste, zeile, Number(knopf.dataset.schritt));

  if (knopf.disabled) {
    const andere = zeile.querySelector('.reihenfolge__knoepfe > button:not([disabled])');
    andere?.focus();
  } else if (document.activeElement !== knopf) {
    knopf.focus();
  }
});

for (const reihe of document.querySelectorAll(REIHE)) {
  const liste = reihe.querySelector('ol');
  if (liste) nachfuehren(liste);
}
})();

} catch (fehler) { console.warn("marke.js · system/scroll-reihenfolge.js", fehler); } }

/* system/ringkarussell.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.ringkarussell') ? [wurzel] : []), ...wurzel.querySelectorAll('.ringkarussell')];
for (const ring of treffer) {
  if (fertig.has(ring)) continue;
  fertig.add(ring);

  const buehne = ring.querySelector('.ringkarussell__buehne');
  const karten = [...ring.querySelectorAll('.ringkarussell__karte')];
  const wahl = ring.querySelector('.seitenwahl');
  const knoepfe = wahl ? [...wahl.querySelectorAll('button[data-ziel]')] : [];
  if (!buehne || karten.length < 3) continue;

  const N = karten.length;
  const SCHRITT = 360 / N;
  let stand = 0;
  let zug = null;

  ring.tabIndex = 0;

  const rund = (k) => ((k % N) + N) % N;

  function zeichne() {
    ring.style.setProperty('--rot', (-stand * SCHRITT) + 'deg');
    const vorn = rund(stand);
    karten.forEach((karte, i) => {
      let abstand = rund(i - vorn);
      abstand = Math.min(abstand, N - abstand);
      karte.style.setProperty('--sicht', abstand === 0 ? 1 : abstand === 1 ? 0.8 : abstand === 2 ? 0.34 : 0.16);
      karte.classList.toggle('ist-vorn', abstand === 0);
      karte.classList.toggle('ist-hinten', abstand > 1);
      karte.tabIndex = abstand === 0 ? 0 : -1;
      karte.setAttribute('aria-hidden', abstand === 0 ? 'false' : 'true');
    });
  }

  function geheZu(ziel) {
    let weg = ziel - rund(stand);
    if (weg > N / 2) weg -= N;
    if (weg < -N / 2) weg += N;
    stand += weg;
    zeichne();
  }

  if (knoepfe.length) {
    const beobachter = new MutationObserver(() => {
      const an = knoepfe.findIndex((k) => k.getAttribute('aria-current') === 'page');
      if (an >= 0) geheZu(an);
    });
    for (const k of knoepfe) beobachter.observe(k, { attributes: true, attributeFilter: ['aria-current'] });
  }

  const blickgruppe = ring.querySelector('.umschaltgruppe[aria-label="Blickwinkel"]');
  if (blickgruppe) {
    const blickknoepfe = [...blickgruppe.querySelectorAll('button[data-blick]')];
    const uebernehmen = () => {
      const an = blickknoepfe.find((b) => b.getAttribute('aria-pressed') === 'true');
      if (an) ring.dataset.blick = an.dataset.blick;
    };
    const blickbeobachter = new MutationObserver(uebernehmen);
    for (const b of blickknoepfe) blickbeobachter.observe(b, { attributes: true, attributeFilter: ['aria-pressed'] });
    uebernehmen();
  }

  function schalte(richtung) {
    if (!knoepfe.length) { stand += richtung; zeichne(); return; }
    knoepfe[rund(stand + richtung)].click();
  }

  ring.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { schalte(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { schalte(-1); e.preventDefault(); }
  });

  buehne.addEventListener('dragstart', (e) => e.preventDefault());
  buehne.addEventListener('pointerdown', (e) => {
    zug = { x: e.clientX, rot: -stand * SCHRITT, gezogen: false, id: e.pointerId };
  });
  addEventListener('pointermove', (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    const dx = e.clientX - zug.x;
    if (!zug.gezogen && Math.abs(dx) > 6) { zug.gezogen = true; ring.classList.add('zieht'); }
    if (zug.gezogen) ring.style.setProperty('--rot', (zug.rot + dx * 0.35) + 'deg');
  });
  addEventListener('pointerup', (e) => {
    if (!zug || e.pointerId !== zug.id) return;
    if (zug.gezogen) {
      ring.classList.remove('zieht');
      const ziel = rund(Math.round(-(zug.rot + (e.clientX - zug.x) * 0.35) / SCHRITT));
      if (knoepfe.length) knoepfe[ziel].click(); else { stand = ziel; zeichne(); }
    }
    const war = zug.gezogen;
    zug = { warZug: war };
    setTimeout(() => { zug = null; }, 0);
  });
  addEventListener('pointercancel', () => {
    if (!zug) return;
    ring.classList.remove('zieht');
    zeichne();
    zug = null;
  });

  ring.addEventListener('click', (e) => {
    const karte = e.target.closest('.ringkarussell__karte');
    if (!karte) return;
    if (zug && zug.warZug) { e.preventDefault(); return; }
    if (!karte.classList.contains('ist-vorn')) {
      e.preventDefault();
      const i = karten.indexOf(karte);
      if (knoepfe.length) knoepfe[i].click(); else geheZu(i);
    }
  });

  zeichne();
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/ringkarussell.js", fehler); } }

/* system/text-effekte.js */
{ try {

(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('[data-rollwoerter]') ? [wurzel] : []), ...wurzel.querySelectorAll('[data-rollwoerter]')];
for (const el of treffer) {
  if (fertig.has(el)) continue;
  fertig.add(el);
  const feld = el.querySelector('.rollwoerter__feld');
  if (!feld) continue;
  const beob = new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) e.target.classList.toggle('ist-mitte', e.isIntersecting);
    },
    { root: feld, rootMargin: '-45% 0px -45% 0px' },
  );
  for (const wort of feld.querySelectorAll('li')) beob.observe(wort);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/text-effekte.js", fehler); } }

/* system/rueckfrage.js */
{ try {
(() => {
let zaehler = 0;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function frage({ titel, text = '', ja = 'Ja', nein = 'Abbrechen', abtippen = '' } = {}) {
  const id = `rueckfrage-${++zaehler}`;
  const d = document.createElement('dialog');
  d.className = 'rueckfrage';
  d.id = id;
  d.setAttribute('closedby', 'any');
  d.setAttribute('aria-labelledby', `${id}-titel`);
  if (text) d.setAttribute('aria-describedby', `${id}-text`);
  const feld = abtippen ? `
    <div class="feld"><span class="feld__eingabe">
      <input id="${id}-name" type="text" autocomplete="off" spellcheck="false" placeholder="${esc(abtippen)}"
             aria-describedby="${id}-hilfe" data-loeschname="${id}-ja" data-name="${esc(abtippen)}">
      <label for="${id}-name">Tippe <span class="gefahrenbereich__name">${esc(abtippen)}</span> zum Bestätigen</label></span>
      <span class="hinweis" id="${id}-hilfe">Gross- und Kleinschreibung zählt.</span></div>` : '';
  d.innerHTML = `<h3 id="${id}-titel">${esc(titel)}</h3>
    ${text ? `<p id="${id}-text">${esc(text)}</p>` : ''}${feld}
    <div class="rueckfrage__fuss">
      <button class="btn btn--klein rueckfrage__gefahr" type="button" id="${id}-ja" data-rueckfrage-ja${abtippen ? ' disabled' : ''}>${esc(ja)}</button>
      <button class="btn btn--zwei btn--klein" type="button" data-rueckfrage-nein>${esc(nein)}</button>
    </div>`;
  document.body.append(d);

  return new Promise((antwort) => {
    let erledigt = false;
    const fertig = (wert) => {
      if (erledigt) return;
      erledigt = true;
      if (d.open) d.close();
      d.remove();
      antwort(wert);
    };
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-rueckfrage-ja]')) fertig(true);
      else if (e.target.closest('[data-rueckfrage-nein]')) fertig(false);
    });
    d.addEventListener('keydown', (e) => {
      const knopf = d.querySelector('[data-rueckfrage-ja]');
      if (e.key === 'Enter' && e.target.matches('input') && !knopf.disabled) { e.preventDefault(); fertig(true); }
    });
    d.addEventListener('close', () => fertig(false));
    d.showModal();
    (d.querySelector('input') || d.querySelector('[data-rueckfrage-nein]')).focus();
  });
}

window.Rueckfrage = { frage };
})();

} catch (fehler) { console.warn("marke.js · system/rueckfrage.js", fehler); } }

/* system/fenster-zuruf.js */
{ try {
(() => {
const VORGABE_MS = 4000;

const uhren = new WeakMap();

function frist(el) {
  const wert = Number(el.dataset.zurufFrist);
  return Number.isFinite(wert) && wert > 0 ? wert : VORGABE_MS;
}

function starten(el) {
  stoppen(el);
  laufe(el, frist(el), true);
}

function laufe(el, rest, vonVorn) {
  el.classList.remove('laeuft');
  void el.offsetWidth;
  el.style.setProperty('--zuruf-frist', rest + 'ms');
  el.style.setProperty('--zuruf-anteil', vonVorn ? 1 : rest / frist(el));
  el.classList.add('laeuft');
  uhren.set(el, {
    uhr: setTimeout(() => {
      uhren.delete(el);
      if (el.matches(':popover-open')) el.hidePopover();
    }, rest),
    rest,
    seit: performance.now(),
  });
}

function stoppen(el) {
  const stand = uhren.get(el);
  if (!stand || !stand.uhr) return;
  clearTimeout(stand.uhr);
  stand.rest = Math.max(0, stand.rest - (performance.now() - stand.seit));
  stand.uhr = null;
  uhren.set(el, stand);
}

function weiter(el) {
  const stand = uhren.get(el);
  if (!stand || stand.uhr) return;          // läuft schon oder wurde nie gestartet
  laufe(el, stand.rest, false);
}

document.addEventListener('toggle', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement) || !el.classList.contains('zuruf')) return;
  if (e.newState === 'open') { starten(el); return; }
  stoppen(el);
  el.classList.remove('laeuft');   // sonst stünde der Balken beim nächsten Mal leer da
}, true);

document.addEventListener('pointerenter', (e) => {
  const el = e.target.closest?.('.zuruf');
  if (el && uhren.has(el)) stoppen(el);
}, true);

document.addEventListener('focusin', (e) => {
  const el = e.target.closest?.('.zuruf');
  if (el) stoppen(el);
});

document.addEventListener('focusout', (e) => {
  const el = e.target.closest?.('.zuruf');
  if (!el) return;
  setTimeout(() => {
    if (el.contains(document.activeElement) || el.matches(':hover')) return;
    if (el.matches(':popover-open')) weiter(el);
  }, 0);
});

document.addEventListener('pointerleave', (e) => {
  const el = e.target.closest?.('.zuruf');
  if (el && el.matches(':popover-open') && !el.contains(document.activeElement)) weiter(el);
}, true);

const ZURUF_ZEICHEN = {
  speichern: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',                       // circle-check-big
  neu: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',                                // circle-plus
  aendern: '<path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>', // pencil-line
  verschieben: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',  // arrow-right-left
  loeschen: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', // trash-2
  kopieren: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>', // clipboard-check
  termin: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>', // calendar-check
};
const zurufTaten = new WeakMap();
const zurufEl = () => document.querySelector('.zuruf[data-zuruf-app]') || document.getElementById('zuruf');

function zeige(text, { art = 'speichern', rueck = null, ziel = null } = {}) {
  const el = zurufEl();
  if (!el) return;
  if (!(art in ZURUF_ZEICHEN)) art = 'speichern';
  el.classList.toggle('zuruf--loeschen', art === 'loeschen');
  const sym = el.querySelector(':scope > .symbol');
  if (sym) sym.innerHTML = ZURUF_ZEICHEN[art];
  const t = el.querySelector('[data-zuruf-text]');
  if (t) { t.textContent = text; t.title = text; }
  const r = el.querySelector('[data-zuruf-rueck]');
  if (r) r.hidden = !rueck;
  const z = el.querySelector('[data-zuruf-ziel]');
  if (z) z.hidden = !ziel;
  zurufTaten.set(el, { rueck, ziel });
  if (el.matches(':popover-open')) el.hidePopover();
  el.showPopover();
}

document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.('[data-zuruf-rueck], [data-zuruf-ziel]');
  const el = knopf?.closest('.zuruf');
  if (!el) return;
  const taten = zurufTaten.get(el);
  if (el.matches(':popover-open')) el.hidePopover();
  const tat = knopf.matches('[data-zuruf-rueck]') ? taten?.rueck : taten?.ziel;
  zurufTaten.delete(el);
  tat?.();
});

window.Zuruf = { zeige, ZEICHEN: ZURUF_ZEICHEN };
})();

} catch (fehler) { console.warn("marke.js · system/fenster-zuruf.js", fehler); } }

/* system/rueckgaengig.js */
{ try {
(() => {
document.addEventListener('click', (e) => {
  const ausloeser = e.target.closest?.('[data-rueckgaengig]');
  if (ausloeser && !ausloeser.disabled) {
    setTimeout(() => { ausloeser.disabled = true; }, 0);
    return;
  }

  const zurueck = e.target.closest?.('.zuruf__handlung');
  if (!zurueck) return;
  const id = zurueck.getAttribute('popovertarget');
  for (const a of document.querySelectorAll(`[data-rueckgaengig="${id}"]`)) a.disabled = false;
});

document.addEventListener('toggle', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement) || !el.classList.contains('zuruf')) return;
  if (e.newState === 'open') return;
  for (const a of document.querySelectorAll(`[data-rueckgaengig="${el.id}"]`)) a.disabled = false;
}, true);
})();

} catch (fehler) { console.warn("marke.js · system/rueckgaengig.js", fehler); } }

/* system/schwerkraftwirbel.js */
{ try {
(() => {
const RUHE = 140;       // ms ohne Bewegung, dann kein Wirbel mehr

function werte(flaeche) {
  const s = getComputedStyle(flaeche);
  const z = (name, ersatz) => { const v = parseFloat(s.getPropertyValue('--wirbel-' + name)); return Number.isFinite(v) ? v : ersatz; };
  return {
    raster: z('raster', 38), radius: z('radius', 180), stoss: z('stoss', 2), zug: z('zug', 0.7), kurve: z('kurve', 1),
    feder: z('feder', 0.010), daempfung: z('daempfung', 0.91),
    punkt: z('punkt', 1.4), deckkraft: z('deckkraft', 0.18),
    tempoTeiler: z('tempo-teiler', 8), tempoPunkt: z('tempo-punkt', 2.6), tempoDeckkraft: z('tempo-deckkraft', 0.38),
    punktZeichen: z('punkt-zeichen', 4.2), groesse: z('zeichen-groesse', 1.15), neigung: z('neigung', 0),
    verlaufVon: z('verlauf-von', 0.5), verlaufBis: z('verlauf-bis', 2.6),
  };
}

function maske(svg, B, H, groesse) {
  const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
  const vw = vb[2], vh = vb[3];
  const s = Math.min(B * 0.7 / vw, H * 1.1 / vh) * groesse;
  const lx = B - vw * s * 0.86, ly = H - vh * s * 0.9;
  const q = 0.5, w = Math.max(1, Math.ceil(B * q)), h = Math.max(1, Math.ceil(H * q));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.setTransform(s * q, 0, 0, s * q, (lx - vb[0] * s) * q, (ly - vb[1] * s) * q);
  for (const pfad of svg.querySelectorAll('path')) {
    if (pfad.closest('clipPath, mask, defs, symbol')) continue;
    x.fill(new Path2D(pfad.getAttribute('d')), pfad.getAttribute('fill-rule') || 'evenodd');
  }
  const roh = x.getImageData(0, 0, w, h).data, sum = new Float32Array((w + 1) * (h + 1));
  for (let j = 0; j < h; j++) { let zeile = 0; for (let i = 0; i < w; i++) { zeile += roh[(j * w + i) * 4 + 3] / 255; sum[(j + 1) * (w + 1) + i + 1] = sum[j * (w + 1) + i + 1] + zeile; } }
  const kl = (v, m) => Math.max(0, Math.min(m, v));
  return (px, py, r) => {
    const x0 = kl(Math.round((px - r) * q), w), x1 = kl(Math.round((px + r) * q), w);
    const y0 = kl(Math.round((py - r) * q), h), y1 = kl(Math.round((py + r) * q), h);
    const n = (x1 - x0) * (y1 - y0); if (n <= 0) return 0;
    return (sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0]) / n;
  };
}
const weich = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.schwerkraftwirbel') ? [wurzel] : []), ...wurzel.querySelectorAll('.schwerkraftwirbel')];
for (const flaeche of treffer) {
  if (fertig.has(flaeche)) continue;
  fertig.add(flaeche);
  const leinwand = document.createElement('canvas');
  leinwand.setAttribute('aria-hidden', 'true');
  flaeche.prepend(leinwand);
  const stift = leinwand.getContext('2d');

  let B = 0, H = 0, punkte = [], laeuft = false, letzteBewegung = 0, w = werte(flaeche);
  let farbe = '';
  const zeiger = { x: -9999, y: -9999, drin: false };
  const muster = flaeche.dataset.muster;   // "zeichen", "verlauf" oder nichts
  let zeichen = null;   // SVG der Marke, geladen aus data-bildmarke

  const darfLaufen = () => !matchMedia('(prefers-reduced-motion: reduce)').matches
    && matchMedia('(hover: hover) and (pointer: fine)').matches
    && !matchMedia('(max-width: 760px)').matches;

  function ruhegroesse(x, y, bedeckung) {
    if (!muster || !bedeckung) return w.punkt;
    const b = bedeckung(x, y, w.raster / 2);
    const imZeichen = w.punkt + (w.punktZeichen - w.punkt) * b;
    if (muster !== 'verlauf') return imZeichen;
    const quer = (x + w.neigung * y) / (B + w.neigung * H);
    const g = w.verlaufVon + (w.verlaufBis - w.verlaufVon) * weich(quer * 1.3 - 0.2);
    const ruhig = weich((x / B * 0.6 + y / H * 0.4 - 0.2) / 0.45);
    return Math.max(g, w.punktZeichen * b * ruhig + g * (1 - b));
  }

  function messen() {
    const k = flaeche.getBoundingClientRect();
    B = k.width; H = k.height; w = werte(flaeche);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    leinwand.width = Math.max(1, Math.round(B * dpr));
    leinwand.height = Math.max(1, Math.round(H * dpr));
    stift.setTransform(dpr, 0, 0, dpr, 0, 0);
    farbe = getComputedStyle(flaeche).color;
    const bedeckung = muster && zeichen && B > 0 && H > 0 ? maske(zeichen, B, H, w.groesse) : null;
    punkte = [];
    for (let y = w.raster / 2; y < H; y += w.raster) {
      for (let x = w.raster / 2; x < B; x += w.raster) {
        punkte.push({ ax: x, ay: y, x, y, vx: 0, vy: 0, r: ruhegroesse(x, y, bedeckung) });
      }
    }
  }

  function malen() {
    stift.clearRect(0, 0, B, H);
    stift.fillStyle = farbe;
    for (const p of punkte) {
      const tempo = Math.min(1, (Math.abs(p.vx) + Math.abs(p.vy)) / w.tempoTeiler);
      stift.globalAlpha = w.deckkraft + tempo * w.tempoDeckkraft;
      stift.beginPath();
      stift.arc(p.x, p.y, p.r + tempo * w.tempoPunkt, 0, Math.PI * 2);
      stift.fill();
    }
    stift.globalAlpha = 1;
  }

  function ruhen() {
    if (muster) { for (const p of punkte) { p.x = p.ax; p.y = p.ay; p.vx = p.vy = 0; } malen(); }
    else stift.clearRect(0, 0, B, H);
  }

  function bild() {
    if (!darfLaufen()) { ruhen(); laeuft = false; return; }
    const wirbelt = zeiger.drin && (performance.now() - letzteBewegung < RUHE);
    let bewegt = false;

    for (const p of punkte) {
      if (wirbelt) {
        const dx = p.x - zeiger.x, dy = p.y - zeiger.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < w.radius) {
          const k = Math.pow(1 - d / w.radius, w.kurve), ux = dx / d, uy = dy / d;
          p.vx += -uy * k * w.stoss + -ux * k * w.zug;
          p.vy += ux * k * w.stoss + -uy * k * w.zug;
        }
      }
      p.vx += (p.ax - p.x) * w.feder;
      p.vy += (p.ay - p.y) * w.feder;
      p.vx *= w.daempfung;
      p.vy *= w.daempfung;
      p.x += p.vx;
      p.y += p.vy;

      const tempo = Math.min(1, (Math.abs(p.vx) + Math.abs(p.vy)) / w.tempoTeiler);
      if (tempo > 0.004 || Math.abs(p.x - p.ax) > 0.35 || Math.abs(p.y - p.ay) > 0.35) bewegt = true;
    }
    malen();

    if (wirbelt || bewegt) requestAnimationFrame(bild); else laeuft = false;
  }

  function anstossen() {
    if (!darfLaufen()) { ruhen(); laeuft = false; return; }
    if (laeuft) return;
    laeuft = true;
    requestAnimationFrame(bild);
  }

  addEventListener('pointermove', (e) => {
    const k = flaeche.getBoundingClientRect();
    zeiger.x = e.clientX - k.left;
    zeiger.y = e.clientY - k.top;
    zeiger.drin = zeiger.x > -w.radius && zeiger.y > -w.radius
      && zeiger.x < k.width + w.radius && zeiger.y < k.height + w.radius;
    letzteBewegung = performance.now();
    if (zeiger.drin) anstossen();
  }, { passive: true });

  new ResizeObserver(() => { messen(); anstossen(); }).observe(flaeche);
  addEventListener('modus', () => { farbe = getComputedStyle(flaeche).color; if (laeuft) return; anstossen(); if (muster) malen(); });

  messen();
  anstossen();
  if (muster && flaeche.dataset.bildmarke) {
    fetch(flaeche.dataset.bildmarke).then(a => a.ok ? a.text() : '').then(text => {
      const svg = new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('svg');
      if (!svg) return;
      zeichen = svg; messen(); laeuft = false; anstossen();
    }).catch(() => {});
  }
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/schwerkraftwirbel.js", fehler); } }

/* system/sprachausgabe.js */
{ try {

(() => {
const KANN_NATIV = 'speechSynthesis' in window;

const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.sprachausgabe') ? [ort] : []), ...ort.querySelectorAll('.sprachausgabe')];
  for (const feld of treffer) {
    if (fertig.has(feld)) continue;
    fertig.add(feld);
  const knopf = feld.querySelector('.sprachausgabe__knopf');
  const text = feld.querySelector('.sprachausgabe__text');
  if (!knopf || !text) continue;

  const art = feld.dataset.stimme || 'nativ';
  if (art === 'nativ' && !KANN_NATIV) { feld.dataset.kann = 'nein'; continue; }

  let laeuft = false;
  let lauf = 0;
  let weg = null;
  let abbruch = null;
  const server = feld.dataset.server;
  const werkzeug = feld.dataset.werkzeug || 'sprechen';
  const stoppWerkzeug = feld.dataset.stopp || 'stopp';

  let mcpVerheissen = null;
  function mcpHolen() {
    if (!mcpVerheissen) {
      mcpVerheissen = Promise.resolve()
        .then(() => (server && window.claude?.use ? window.claude.use('mcp') : null))
        .then((m) => (m && typeof m.callTool === 'function' ? m : null))
        .catch(() => null);
    }
    return mcpVerheissen;
  }
  if (art === 'mcp') {
    mcpHolen().then((m) => { if (!m && !KANN_NATIV) feld.dataset.kann = 'nein'; });
  }

  function zeige(an) {
    laeuft = an;
    knopf.setAttribute('aria-pressed', String(an));
    knopf.setAttribute('aria-label', an ? 'Vorlesen beenden' : 'Vorlesen');
    knopf.title = an ? 'Vorlesen beenden' : 'Vorlesen';
  }

  function spricht(inhalt, nr) {
    if (art === 'mcp') {
      return mcpHolen().then((m) => {
        if (nr !== lauf) return;
        if (!m) return spricht_nativ(inhalt);
        weg = 'mcp';
        abbruch = typeof AbortController === 'function' ? new AbortController() : null;
        return Promise.resolve()
          .then(() => m.callTool(server, werkzeug, { text: inhalt }, { cache: false, signal: abbruch?.signal }))
          .then((antwort) => { if (antwort && antwort.isError) throw new Error('Werkzeug meldet einen Fehler'); })
          .catch(() => {
            if (nr !== lauf) return;
            return spricht_nativ(inhalt);
          });
      });
    }
    if (art === 'dienst') {
      const quelle = feld.dataset.quelle;
      if (!quelle) return Promise.resolve();
      return fetch(quelle, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inhalt }),
      })
        .then((a) => a.blob())
        .then((blob) => new Promise((fertig) => {
          const ton = new Audio(URL.createObjectURL(blob));
          ton.addEventListener('ended', fertig, { once: true });
          feld.__ton = ton;
          ton.play();
        }));
    }

    return spricht_nativ(inhalt);
  }

  function spricht_nativ(inhalt) {
    if (!KANN_NATIV) return Promise.resolve();
    weg = 'nativ';
    return new Promise((fertig) => {
      const rede = new SpeechSynthesisUtterance(inhalt);
      rede.lang = document.documentElement.lang || 'de-CH';
      rede.addEventListener('end', fertig, { once: true });
      rede.addEventListener('error', fertig, { once: true });
      speechSynthesis.speak(rede);
    });
  }

  function beenden() {
    lauf++;
    if (art === 'dienst') { feld.__ton?.pause(); }
    else {
      if (weg === 'mcp') {
        abbruch?.abort();
        mcpHolen().then((m) => m?.callTool(server, stoppWerkzeug, {}, { cache: false })).catch(() => {});
      }
      if (KANN_NATIV) speechSynthesis.cancel();
    }
    weg = null;
    zeige(false);
  }

  knopf.addEventListener('click', () => {
    if (laeuft) { beenden(); return; }
    zeige(true);
    const nr = ++lauf;
    spricht(text.textContent.trim(), nr).then(() => { if (nr === lauf) { weg = null; zeige(false); } });
  });

  addEventListener('pagehide', () => { if (laeuft) beenden(); });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/sprachausgabe.js", fehler); } }

/* system/spracheingabe.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.spracheingabe') ? [wurzel] : []), ...wurzel.querySelectorAll('.spracheingabe')];
for (const feld of treffer) {
  if (fertig.has(feld)) continue;
  fertig.add(feld);
  const knopf = feld.querySelector('.spracheingabe__knopf');
  const stand = feld.querySelector('.spracheingabe__stand');
  if (!knopf) continue;

  knopf.addEventListener('click', () => {
    const laeuft = knopf.getAttribute('aria-pressed') !== 'true';
    knopf.setAttribute('aria-pressed', String(laeuft));
    knopf.setAttribute('aria-label', laeuft ? 'Aufnahme beenden' : 'Aufnahme starten');
    feld.toggleAttribute('data-nimmt-auf', laeuft);
    if (stand) stand.textContent = laeuft ? 'Nimmt auf' : 'Bereit';
  });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/spracheingabe.js", fehler); } }

/* system/strahlen.js */
{ try {
(() => {
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ns = 'http://www.w3.org/2000/svg';

  const fertig = new WeakSet();
  function einrichten(start) {
  const treffer = [...(start.matches?.('.strahlen') ? [start] : []), ...start.querySelectorAll('.strahlen')];
  for (const wurzel of treffer) {
    if (fertig.has(wurzel)) continue;
    fertig.add(wurzel);

    const feld = wurzel.querySelector('.strahlen__feld');
    const svg = wurzel.querySelector('.strahlen__linien');
    const mitte = wurzel.querySelector('[data-mitte]');
    if (!feld || !svg || !mitte) continue;
    const knoten = [...wurzel.querySelectorAll('[data-quelle], [data-ziel]')];
    const knopf = wurzel.querySelector('[data-strahlen-start]');
    const mitteKreis = mitte.querySelector('.strahlen__kreis');

    const paare = knoten.map((k, i) => {
      const bahn = document.createElementNS(ns, 'path');
      bahn.setAttribute('class', 'strahlen__bahn');
      bahn.setAttribute('pathLength', '100');
      const licht = document.createElementNS(ns, 'path');
      licht.setAttribute('class', 'strahlen__licht');
      licht.setAttribute('pathLength', '100');
      licht.style.setProperty('--nr', String(i));
      svg.append(bahn, licht);
      return { k, bahn, licht };
    });

    const zeichne = () => {
      const r = feld.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      const m = mitteKreis.getBoundingClientRect();
      const mx = m.left - r.left + m.width / 2;
      const my = m.top - r.top + m.height / 2;
      for (const { k, bahn, licht } of paare) {
        const b = k.querySelector('.strahlen__kreis').getBoundingClientRect();
        const kx = b.left - r.left + b.width / 2;
        const ky = b.top - r.top + b.height / 2;
        const quelle = k.hasAttribute('data-quelle');
        const [x1, y1, x2, y2] = quelle ? [kx, ky, mx, my] : [mx, my, kx, ky];
        const hx = (x1 + x2) / 2;
        const d = `M${x1},${y1} C${hx},${y1} ${hx},${y2} ${x2},${y2}`;
        bahn.setAttribute('d', d);
        licht.setAttribute('d', d);
      }
    };
    new ResizeObserver(zeichne).observe(feld);
    zeichne();

    if (ruhig) { if (knopf) knopf.hidden = true; continue; }
    feld.classList.add('ist-laeuft');
    let angehalten = false, sichtbar = true;
    const stand = () => feld.classList.toggle('ist-angehalten', angehalten || !sichtbar);
    if (knopf) {
      knopf.setAttribute('aria-pressed', 'false');
      knopf.addEventListener('click', () => {
        angehalten = !angehalten;
        knopf.setAttribute('aria-pressed', String(angehalten));
        knopf.textContent = angehalten ? knopf.dataset.aus : knopf.dataset.an;
        stand();
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { sichtbar = e[0].isIntersecting; stand(); }).observe(feld);
    }
  }
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/strahlen.js", fehler); } }

/* system/formular-suchauswahl.js */
{ try {
(() => {
'use strict';
const teile = (el) => {
  const wurzel = el?.closest?.('.suchauswahl');
  if (!wurzel || wurzel.dataset.suchauswahl === 'eigen') return null;
  const feld = wurzel.querySelector('input[role="combobox"]');
  const liste = wurzel.querySelector('.suchauswahl__liste');
  return feld && liste ? { wurzel, feld, liste, alle: () => [...liste.querySelectorAll('[role="option"]')] } : null;
};
const zeigen = (t, auf) => {
  if (auf && !t.liste.closest('.fenster__inhalt, .rollbereich')) {
    t.liste.style.top = `${t.feld.getBoundingClientRect().bottom - t.wurzel.getBoundingClientRect().top}px`;
  }
  t.liste.hidden = !auf;
  t.feld.setAttribute('aria-expanded', String(auf));
};
const filtern = (t) => {
  const q = t.feld.value.trim().toLowerCase();
  let sichtbar = 0;
  for (const o of t.alle()) {
    const passt = !q || o.textContent.toLowerCase().includes(q);
    o.hidden = !passt;
    if (passt) sichtbar++;
  }
  zeigen(t, sichtbar > 0 && document.activeElement === t.feld);
};
const uebernehmen = (t, o) => {
  t.feld.value = o.textContent.trim();
  zeigen(t, false);
  t.feld.focus();
  t.feld.dataset.suchauswahlGewaehlt = '';
  t.feld.dispatchEvent(new Event('input', { bubbles: true }));
  t.wurzel.dispatchEvent(new CustomEvent('suchauswahl-gewaehlt', { bubbles: true, detail: { option: o, wert: t.feld.value } }));
};

document.addEventListener('input', (e) => {
  if (!e.target.matches?.('input[role="combobox"]')) return;
  if ('suchauswahlGewaehlt' in e.target.dataset) { delete e.target.dataset.suchauswahlGewaehlt; return; }
  const t = teile(e.target); if (t) filtern(t);
});
document.addEventListener('focusin', (e) => { if (!e.target.matches?.('input[role="combobox"]')) return; const t = teile(e.target); if (t) filtern(t); });
document.addEventListener('pointerdown', (e) => {
  for (const w of document.querySelectorAll('.suchauswahl:not([data-suchauswahl="eigen"])')) {
    if (w.contains(e.target)) continue;
    const t = teile(w); if (t && !t.liste.hidden) zeigen(t, false);
  }
});
document.addEventListener('scroll', (e) => {
  for (const w of document.querySelectorAll('.suchauswahl:not([data-suchauswahl="eigen"])')) {
    const t = teile(w); if (!t || t.liste.hidden || t.liste.contains(e.target)) continue;
    if ((e.target === document || e.target.contains?.(w)) && getComputedStyle(t.liste).position === 'fixed') zeigen(t, false);
  }
}, { capture: true, passive: true });
document.addEventListener('click', (e) => {
  const o = e.target.closest?.('.suchauswahl__liste [role="option"]'); if (!o) return;
  const t = teile(o); if (t) uebernehmen(t, o);
});
document.addEventListener('keydown', (e) => {
  if (!e.target.matches?.('input[role="combobox"]')) return;
  const t = teile(e.target); if (!t) return;
  const { feld, liste } = t, alle = t.alle();
  const offen = !liste.hidden;
  const sichtbare = alle.filter((o) => !o.hidden);
  if (e.key === 'Escape') { if (offen) { e.preventDefault(); zeigen(t, false); } return; }
  if (e.key === 'Enter') {
    const aktiv = liste.querySelector('.ist-aktiv:not([hidden])');
    if (offen && aktiv) { e.preventDefault(); uebernehmen(t, aktiv); }
    return;
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  if (!offen) { filtern(t); return; }
  if (!sichtbare.length) return;
  const jetzt = sichtbare.indexOf(liste.querySelector('.ist-aktiv:not([hidden])'));
  const naechst = e.key === 'ArrowDown'
    ? (jetzt + 1) % sichtbare.length
    : (jetzt <= 0 ? sichtbare.length - 1 : jetzt - 1);
  for (const o of alle) o.classList.remove('ist-aktiv');
  const ziel = sichtbare[naechst];
  ziel.classList.add('ist-aktiv');
  ziel.scrollIntoView({ block: 'nearest' });
  feld.setAttribute('aria-activedescendant', ziel.id || (ziel.id = 'suchauswahl-o' + Math.random().toString(36).slice(2, 8)));
});
})();

} catch (fehler) { console.warn("marke.js · system/formular-suchauswahl.js", fehler); } }

/* system/suchfenster.js */
{ try {
(() => {
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (pfade) => `<svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pfade || ''}</svg>`;
const LUPE = '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>';

const falte = (s) => [...String(s ?? '')].map((c) => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0] || c).join('');
const woerterVon = (q) => falte(q).split(/\s+/).filter(Boolean);

let Fuse = null;
import(new URL('vendor/fuse-7.5.0.basic.min.mjs', document.currentScript?.src || (new Error().stack?.match(/https?:\/\/[^\s)]+?\.js/) || [])[0] || location.href).href)
  .then((m) => { Fuse = m.default; }).catch(() => {});
function ungefaehr(alles, wort) {
  if (!Fuse || wort.length < 5) return new Map();
  const f = new Fuse(alles, { keys: ['titel', 'unter', 'text'], threshold: 0.3, ignoreLocation: true, ignoreDiacritics: true, includeMatches: true });
  return new Map(f.search(wort).map((t) => [t.item, t.matches.some((m) => m.key !== 'text') ? 'titel' : 'text']));
}

let A = null;
const S = { q: '', arten: [], i: 0, liste: [], wahl: {}, regeln: [], sort: '', eig: null };
let d = null, menue = null;

const zeichen = (z) => String(z ?? '').trimStart().startsWith('<svg') ? z : svg(z);
const mitMarken = () => !!(A?.filter?.length || A?.eigenschaften || A?.sortierungen);
const sortName = (k) => { const s = A.sortierungen?.[k]; return typeof s === 'string' ? s : s?.name ?? k; };

function zuletzt() {
  if (typeof A?.merken === 'object') { try { return A.merken.lies() ?? []; } catch { return []; } }
  try { return JSON.parse(localStorage.getItem(A?.merken) || '[]'); } catch { return []; }
}
function merke(art, id) {
  if (!A?.merken || !art || !id) return;
  const k = `${art}:${id}`, liste = [k, ...zuletzt().filter((r) => r !== k)].slice(0, 30);
  if (typeof A.merken === 'object') { A.merken.schreib?.(liste); return; }
  try { localStorage.setItem(A.merken, JSON.stringify(liste.slice(0, 20))); } catch { /* privat: dann eben nicht gemerkt */ }
}

function passt(r) {
  if (S.arten.length && !S.arten.includes(r.art)) return false;
  for (const f of A.filter ?? []) { const w = S.wahl[f.name]; if (w && !f.passt(r, w)) return false; }
  return S.regeln.every((g) => g.art === r.art && String(g.wert) === String(eigWert(r, g.k)));
}
const eigWert = (r, k) => { try { return (A.eigenschaften?.(r.art) ?? []).find((x) => x.k === k)?.wert(r) ?? ''; } catch { return ''; } };
function sortiere(liste) {
  const s = A.sortierungen?.[S.sort];
  if (!S.sort || !s?.vergleich) return liste;
  return [...liste].sort(s.vergleich);
}
function treffer() {
  const w = woerterVon(S.q);
  const alles = A.eintraege().filter(passt);
  const gefiltert = S.arten.length || S.regeln.length || Object.values(S.wahl).some(Boolean);
  if (!w.length && (gefiltert || S.sort)) {
    const l = sortiere(alles.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))));
    return l.slice(0, 60).map((r) => ({ ...r, gruppe: S.arten.length === 1 && !S.sort ? A.arten[r.art]?.name ?? r.art : 'Einträge' }));
  }
  if (!w.length) {
    const nach = new Map(alles.map((r) => [`${r.art}:${r.id}`, r]));
    const zu = zuletzt().map((k) => nach.get(k)).filter(Boolean).slice(0, mitMarken() ? 12 : 8).map((r) => ({ ...r, gruppe: 'Zuletzt geöffnet' }));
    const geaendert = alles.filter((r) => A.arten[r.art]?.geaendert && !zu.some((z) => z.art === r.art && z.id === r.id))
      .sort((a, b) => String(b.zeit).localeCompare(String(a.zeit))).slice(0, mitMarken() ? 20 : 12).map((r) => ({ ...r, gruppe: 'Zuletzt geändert' }));
    return [...zu, ...geaendert, ...alles.filter((r) => r.art === 'befehl').map((r) => ({ ...r, gruppe: 'Befehle' }))];
  }
  const nah = w.map((v) => ungefaehr(alles, v));
  const liste = alles.map((r) => {
    const titel = falte(`${r.titel} ${r.unter ?? ''}`);
    const ganz = `${titel} ${falte(r.text)}`;
    const wo = w.map((v, n) => titel.includes(v) ? 'titel' : ganz.includes(v) ? 'text' : nah[n].get(r));
    if (!wo.every(Boolean)) return null;
    const imTitel = wo.filter((x) => x === 'titel').length;
    const ungenau = w.filter((v) => !ganz.includes(v)).length;
    return { ...r, rang: imTitel * 10 + (titel.startsWith(w[0]) ? 5 : 0) - ungenau, gruppe: r.art === 'befehl' ? 'Befehle' : imTitel ? 'Im Titel' : 'Im Text' };
  }).filter(Boolean);
  const reihe = ['Im Titel', 'Im Text', 'Befehle'];
  liste.sort((a, b) => reihe.indexOf(a.gruppe) - reihe.indexOf(b.gruppe) || b.rang - a.rang || String(b.zeit).localeCompare(String(a.zeit)));
  return (S.sort ? sortiere(liste).map((r) => ({ ...r, gruppe: 'Treffer' })) : liste).slice(0, 60);
}

function ausschnitt(text, woerter, laenge = 420) {
  text = String(text || '').replace(/\*\*|__/g, '').replace(/(^|\s)#{1,6}\s/g, '$1').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const f = falte(text);
  const erst = woerter.map((v) => f.indexOf(v)).filter((n) => n >= 0).sort((a, b) => a - b)[0] ?? -1;
  const von = erst > 120 ? text.lastIndexOf(' ', erst - 80) + 1 : 0;
  const stueck = text.slice(von, von + laenge), fs = f.slice(von, von + laenge);
  const marken = [];
  for (const v of woerter) for (let n = fs.indexOf(v); n >= 0; n = fs.indexOf(v, n + v.length)) marken.push([n, n + v.length]);
  marken.sort((a, b) => a[0] - b[0]);
  let aus = '', pos = 0;
  for (const [a, b] of marken) { if (a < pos) continue; aus += esc(stueck.slice(pos, a)) + `<mark>${esc(stueck.slice(a, b))}</mark>`; pos = b; }
  aus += esc(stueck.slice(pos));
  return (von > 0 ? '… ' : '') + aus + (von + laenge < text.length ? ' …' : '');
}

const FORMEN = '<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>';
const PFEIL = '<path d="m6 9 6 6 6-6"/>', ZURUECK = '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', HAKEN = '<path d="M20 6 9 17l-5-5"/>', WEG = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', PLUS = '<path d="M5 12h14"/><path d="M12 5v14"/>';
const eintrag = (attr, inhalt, an) => `<button type="button" class="tabmenue__eintrag" role="${an === undefined ? 'menuitem' : 'menuitemradio'}"${an === undefined ? '' : ` aria-checked="${!!an}"`} ${attr}><span>${inhalt}</span>${an ? `<span class="tabmenue__rechts">${svg(HAKEN)}</span>` : ''}</button>`;
const kopf = (titel, zurueck) => `<div class="tabmenue__kopf${zurueck ? ' tabmenue__kopf--symbol' : ''}">${zurueck ? `<button type="button" class="btn btn--still btn--klein" data-su-eig-zurueck aria-label="Zurück">${svg(ZURUECK)}</button>` : ''}<b>${esc(titel)}</b></div>`;
function zeigeMenue(anker, html) {
  if (!menue) {
    menue = document.createElement('div');
    menue.className = 'tabmenue'; menue.id = 'suchfenster-menue'; menue.setAttribute('popover', 'auto');
    menue.addEventListener('toggle', (e) => { if (e.newState === 'closed') { d?.querySelector('[data-su-menue][aria-expanded="true"]')?.setAttribute('aria-expanded', 'false'); d?.querySelector('input')?.focus({ preventScroll: true }); } });
    menue.addEventListener('click', menueKlick);
  }
  if (menue.parentElement !== d) d.append(menue);
  menue.innerHTML = html;
  if (!menue.matches(':popover-open')) menue.showPopover();
  const r = anker.getBoundingClientRect();
  menue.style.left = `${Math.max(8, Math.min(r.left, innerWidth - menue.offsetWidth - 8))}px`;
  menue.style.top = `${r.bottom + 4}px`;
  anker.setAttribute('aria-expanded', 'true');
  menue.querySelector('.tabmenue__eintrag, button')?.focus({ preventScroll: true });
}
const schliesseMenue = () => menue?.matches(':popover-open') && menue.hidePopover();
function menueHtml(art) {
  if (art === 'art') return kopf('Art') + `<div class="tabmenue__liste" role="menu">${Object.entries(A.arten).filter(([, x]) => !x.ohneFilter)
    .map(([k, x]) => eintrag(`data-su-art="${esc(k)}"`, `${zeichen(x.zeichen)}${esc(x.name)}`, S.arten.includes(k))).join('')}</div>`;
  if (art === 'sort') return kopf('Sortieren') + `<div class="tabmenue__liste" role="menu">${Object.keys(A.sortierungen)
    .map((k) => eintrag(`data-su-sort="${esc(k)}"`, esc(sortName(k)), S.sort === k)).join('')}</div>`;
  if (art === 'eig') {
    const w = S.eig ?? {};
    if (!w.art) {
      const arten = Object.entries(A.arten).filter(([k]) => (A.eigenschaften(k) ?? []).length);
      return kopf('Filter nach Eigenschaft') + `<div class="tabmenue__liste" role="menu">${arten.map(([k, x]) => eintrag(`data-su-eig-art="${esc(k)}"`, `${zeichen(x.zeichen)}${esc(x.name)}`)).join('')}</div>`;
    }
    const spalten = A.eigenschaften(w.art) ?? [];
    if (!w.k) return kopf(A.arten[w.art]?.name ?? w.art, true) + `<div class="tabmenue__liste" role="menu">${spalten.map((x) => eintrag(`data-su-eig-k="${esc(x.k)}"`, `${x.zeichen ? zeichen(x.zeichen) : ''}${esc(x.name)}`)).join('')}</div>`;
    const werte = [...new Set(A.eintraege().filter((r) => r.art === w.art).map((r) => String(eigWert(r, w.k) ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    return kopf(spalten.find((x) => x.k === w.k)?.name ?? w.k, true) + `<div class="tabmenue__liste" role="menu">${werte.map((v) => eintrag(`data-su-eig-wert="${esc(v)}"`, esc(v))).join('') || '<p class="tabmenue__hinweis">Keine Werte.</p>'}</div>`;
  }
  const f = (A.filter ?? []).find((x) => x.name === art);
  return kopf(f.titel) + `<div class="tabmenue__liste" role="menu">${Object.entries(f.werte).map(([k, l]) => eintrag(`data-su-wahl="${esc(f.name)}" data-wert="${esc(k)}"`, esc(l), (S.wahl[f.name] ?? '') === k)).join('')}</div>`;
}
function menueKlick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const neu = () => { S.i = 0; zeichne(); };
  if (b.dataset.suArt !== undefined) { const k = b.dataset.suArt; S.arten = S.arten.includes(k) ? S.arten.filter((x) => x !== k) : [...S.arten, k]; neu(); return zeigeMenue(d.querySelector('[data-su-menue="art"]'), menueHtml('art')); }
  if (b.dataset.suSort !== undefined) { S.sort = b.dataset.suSort; neu(); return schliesseMenue(); }
  if (b.dataset.suWahl !== undefined) { S.wahl[b.dataset.suWahl] = b.dataset.wert; neu(); return schliesseMenue(); }
  const anker = d.querySelector('[data-su-menue="eig"]');
  if (b.dataset.suEigArt !== undefined) { S.eig = { art: b.dataset.suEigArt }; return zeigeMenue(anker, menueHtml('eig')); }
  if (b.dataset.suEigK !== undefined) { S.eig = { ...S.eig, k: b.dataset.suEigK }; return zeigeMenue(anker, menueHtml('eig')); }
  if (b.dataset.suEigWert !== undefined) {
    const { art, k } = S.eig, name = (A.eigenschaften(art) ?? []).find((x) => x.k === k)?.name ?? k;
    S.regeln = [...S.regeln.filter((g) => !(g.art === art && g.k === k)), { art, k, name, wert: b.dataset.suEigWert }];
    S.eig = null; neu(); return schliesseMenue();
  }
  if (b.hasAttribute('data-su-eig-zurueck')) { S.eig = S.eig?.k ? { art: S.eig.art } : null; return zeigeMenue(anker, menueHtml('eig')); }
}

function baue() {
  d = document.createElement('dialog');
  d.className = 'suchfenster';
  d.id = 'suchfenster';
  d.setAttribute('closedby', 'any');
  d.setAttribute('aria-label', 'Suchen');
  d.innerHTML = `<div class="suchfenster__kopf">${svg(LUPE).replace('symbol symbol--klein', 'symbol')}<input id="suchfenster-q" type="search" placeholder="${esc(A.platzhalter ?? 'Suchen')}" autocomplete="off" spellcheck="false" aria-label="Suchen" role="combobox" aria-expanded="true" aria-controls="suchfenster-liste" aria-autocomplete="list"><kbd class="suchfenster__taste">esc</kbd></div>
    <div class="suchfenster__filter"></div>
    <div class="suchfenster__rumpf"><div class="suchfenster__liste" id="suchfenster-liste" role="listbox" aria-label="Treffer"></div><div class="suchfenster__vorschau" aria-live="polite"></div></div>
    <div class="suchfenster__fuss"><span><kbd>↑</kbd><kbd>↓</kbd> wählen</span><span><kbd>↵</kbd> öffnen</span><span><kbd>esc</kbd> schliessen</span></div>`;
  document.body.append(d);
  const feld = d.querySelector('input');
  feld.addEventListener('input', () => { S.q = feld.value; S.i = 0; zeichne(); });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menue?.matches(':popover-open')) { e.preventDefault(); schliesseMenue(); return; }
    if (e.target.closest('.tabmenue')) return;
    if (e.key === 'Escape') { e.preventDefault(); d.close(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); waehle(S.i + (e.key === 'ArrowDown' ? 1 : -1)); }
    else if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); oeffne(); }
  });
  d.addEventListener('close', schliesseMenue);
  d.addEventListener('cancel', (e) => { if (menue?.matches(':popover-open')) { e.preventDefault(); schliesseMenue(); } });
  d.addEventListener('click', (e) => {
    if (e.target.closest('.tabmenue')) return;
    if (e.target === d) { d.close(); return; }
    const t = e.target.closest('[data-su-i]');
    if (t) { oeffne(Number(t.dataset.suI)); return; }
    if (e.target.closest('[data-su-oeffnen]')) { oeffne(); return; }
    const m = e.target.closest('[data-su-menue]');
    if (m) {
      const offen = m.getAttribute('aria-expanded') === 'true' && menue?.matches(':popover-open');
      if (offen) return schliesseMenue();
      if (m.dataset.suMenue === 'eig') S.eig = null;
      return zeigeMenue(m, menueHtml(m.dataset.suMenue));
    }
    const g = e.target.closest('[data-su-regel]');
    if (g) { S.regeln.splice(Number(g.dataset.suRegel), 1); S.i = 0; zeichne(); feld.focus({ preventScroll: true }); return; }
    if (e.target.closest('[data-su-leeren]')) { S.arten = []; S.regeln = []; S.wahl = {}; S.sort = ''; S.i = 0; zeichne(); feld.focus({ preventScroll: true }); return; }
    const a = e.target.closest('[data-su-art]');
    if (a) {
      const k = a.dataset.suArt;
      S.arten = S.arten.includes(k) ? S.arten.filter((x) => x !== k) : [...S.arten, k];
      S.i = 0; zeichne(); feld.focus({ preventScroll: true });
    }
  });
  d.addEventListener('change', (e) => {
    const r = e.target.closest('[data-su-reiter]');
    if (!r) return;
    S.arten = r.value ? [r.value] : [];
    S.i = 0; zeichne();
    d.querySelector(`[data-su-reiter][value="${CSS.escape(r.value)}"]`)?.focus({ preventScroll: true });
  });
  d.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-su-i]');
    if (t && Number(t.dataset.suI) !== S.i) waehle(Number(t.dataset.suI));
  });
}

function marke(art, z, titel, wert) {
  return `<button type="button" class="regel-marke" data-su-menue="${esc(art)}"${wert ? ' data-an' : ''} aria-haspopup="menu" aria-expanded="false">${zeichen(z)}<span>${esc(titel)}${wert ? `: <b>${esc(wert)}</b>` : ''}</span>${svg(PFEIL)}</button>`;
}
function filterzeile() {
  if (!mitMarken()) return '<div class="reiter reiter--klar"><div class="reiter__leiste" role="radiogroup" aria-label="Art">' +
    [['', { name: 'Alle' }], ...Object.entries(A.arten).filter(([, x]) => !x.ohneFilter)].map(([k, x]) =>
      `<label class="reiter__wahl"><input type="radio" name="suchfenster-art" value="${esc(k)}" data-su-reiter class="visually-hidden"${(S.arten.length === 1 ? S.arten[0] : '') === k ? ' checked' : ''}><span>${x.zeichen ? zeichen(x.zeichen) : ''}${esc(x.name)}</span></label>`).join('') +
    '</div></div>';
  const namen = S.arten.map((k) => A.arten[k]?.name ?? k);
  const aktiv = S.arten.length || S.regeln.length || S.sort || Object.values(S.wahl).some(Boolean);
  return marke('art', FORMEN, 'Art', namen.length > 2 ? `${namen.length} Arten` : namen.join(', ')) +
    (A.filter ?? []).map((f) => marke(f.name, f.zeichen, f.titel, S.wahl[f.name] ? f.werte[S.wahl[f.name]] : '')).join('') +
    S.regeln.map((g, i) => `<button type="button" class="regel-marke" data-su-regel="${i}" data-an aria-label="Filter ${esc(g.name)}: ${esc(g.wert)} entfernen">${zeichen(A.arten[g.art]?.zeichen)}<span>${esc(g.name)}: <b>${esc(g.wert)}</b></span>${svg(WEG)}</button>`).join('') +
    (A.eigenschaften ? `<button type="button" class="regel-neu" data-su-menue="eig" aria-haspopup="menu" aria-expanded="false">${svg(PLUS)}<span>Filter</span></button>` : '') +
    (A.sortierungen ? `<span class="suchfenster__rechts">${marke('sort', '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>', 'Sortieren', S.sort ? sortName(S.sort) : '')}</span>` : '') +
    (aktiv ? '<button type="button" class="regel-neu" data-su-leeren>Zurücksetzen</button>' : '');
}

function zeichne() {
  S.liste = treffer();
  S.i = Math.min(S.i, Math.max(0, S.liste.length - 1));
  d.querySelector('.suchfenster__filter').innerHTML = filterzeile();
  let gruppe = '';
  d.querySelector('.suchfenster__liste').innerHTML = S.liste.length ? S.liste.map((r, i) => {
    const k = r.gruppe !== gruppe ? `<p class="suchfenster__gruppe" role="presentation">${esc(gruppe = r.gruppe)}</p>` : '';
    return k + `<button type="button" class="suchfenster__treffer" role="option" id="suchfenster-${i}" aria-selected="${i === S.i}" data-su-i="${i}" tabindex="-1">${zeichen(A.arten[r.art]?.zeichen)}<span class="suchfenster__titel">${esc(r.titel)}</span><span class="suchfenster__pfad">${esc(r.pfad)}</span></button>`;
  }).join('') : `<p class="suchfenster__leer">${S.q ? 'Nichts gefunden. Lass ein Wort weg oder nimm einen Filter heraus.' : 'Noch nichts da.'}</p>`;
  d.querySelector('input').setAttribute('aria-activedescendant', S.liste.length ? `suchfenster-${S.i}` : '');
  vorschau();
}

function vorschau() {
  const r = S.liste[S.i], el = d.querySelector('.suchfenster__vorschau');
  if (!r) { el.innerHTML = ''; return; }
  const w = woerterVon(S.q);
  const { angaben = [], text = r.text } = A.vorschau?.(r, w) ?? {};
  const dl = angaben.filter((x) => x[2]).map(([z, name, wert]) => `<div class="eigenschaft"><dt>${zeichen(z)}${esc(name)}</dt><dd>${wert}</dd></div>`).join('');
  el.innerHTML = `<p class="suchfenster__art">${zeichen(A.arten[r.art]?.zeichen)}${esc(r.pfad)}</p>` +
    `<h2 class="suchfenster__vtitel">${r.art === 'befehl' ? esc(r.titel) : ausschnitt(r.titel, w, 200)}</h2>` +
    (dl ? `<dl class="suchfenster__angaben">${dl}</dl>` : '') +
    (text ? `<div class="suchfenster__text"><p>${ausschnitt(text, w)}</p></div>` : '') +
    `<p class="suchfenster__oeffnen"><button type="button" class="btn btn--klein" data-su-oeffnen>${r.art === 'befehl' ? 'Ausführen' : 'Öffnen'}</button></p>`;
}

function waehle(i) {
  S.i = Math.max(0, Math.min(S.liste.length - 1, i));
  for (const b of d.querySelectorAll('.suchfenster__treffer')) b.setAttribute('aria-selected', String(Number(b.dataset.suI) === S.i));
  d.querySelector(`#suchfenster-${S.i}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  d.querySelector('input').setAttribute('aria-activedescendant', `suchfenster-${S.i}`);
  vorschau();
}

function auf() {
  if (!A || document.readyState === 'loading' || A.bereit?.() === false) return;
  if (A.schmal && matchMedia(`(max-width: ${A.schmal.bis ?? 720}px)`).matches) { A.schmal.statt?.(); return; }
  if (!d) baue();
  S.i = 0;
  const f = d.querySelector('input');
  f.value = S.q;
  zeichne();
  if (!d.open) d.showModal();
  f.focus(); f.select();
}

function oeffne(i = S.i) {
  const r = S.liste[i];
  if (!r) return;
  d.close();
  if (r.art === 'befehl') { r.tat?.(); return; }
  merke(r.art, r.id);
  A.oeffne(r);
}

document.addEventListener('keydown', (e) => {
  if (!A || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (d?.open) d.close(); else auf();
}, true);
document.addEventListener('click', (e) => {
  if (A && e.target.closest?.('[data-suche-auf]') && !e.target.matches?.('input, textarea')) { e.preventDefault(); auf(); }
});
document.addEventListener('focusin', (e) => {
  if (!A || !e.target.matches?.('input[data-suche-auf], textarea[data-suche-auf]')) return;
  if (A.schmal && matchMedia(`(max-width: ${A.schmal.bis ?? 720}px)`).matches) return;
  e.target.blur(); auf();
});

window.Suchfenster = {
  einrichten: (optionen) => { A = { arten: {}, ...optionen }; },
  auf, merke, ausschnitt, falte,
  get offen() { return !!d?.open; },
  zu: () => d?.close(),
};
})();

} catch (fehler) { console.warn("marke.js · system/suchfenster.js", fehler); } }

/* system/taste.js */
{ try {
(() => {
const istApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
window.istApple = istApple;

const stelle = (wurzel) => {
  for (const el of wurzel.querySelectorAll?.('[data-taste="mod"]') ?? []) {
    el.textContent = '⌘';
    el.setAttribute('aria-label', 'Befehlstaste');
  }
  for (const el of wurzel.querySelectorAll?.('[data-taste="alt"]') ?? []) el.textContent = '⌥';
};

if (istApple) {
  stelle(document);
  new MutationObserver((liste) => {
    for (const m of liste) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches('[data-taste]')) stelle(n.parentElement ?? n); else stelle(n);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
})();

} catch (fehler) { console.warn("marke.js · system/taste.js", fehler); } }

/* system/teiler.js */
{ try {
(() => {
const GRENZE = 15;            // Prozent, die jede Seite mindestens behält
const SCHRITT = 2;            // Prozent je Tastendruck

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.teiler') ? [wurzel] : []), ...wurzel.querySelectorAll('.teiler')];
for (const teiler of treffer) {
  if (fertig.has(teiler)) continue;
  fertig.add(teiler);
  const griff = teiler.querySelector('.teiler__griff');
  if (!griff) continue;

  let wert = Number(griff.getAttribute('aria-valuenow')) || 50;
  setze(wert);

  function setze(neu) {
    wert = Math.min(100 - GRENZE, Math.max(GRENZE, Math.round(neu)));
    teiler.style.setProperty('--teil', wert + '%');
    griff.setAttribute('aria-valuenow', String(wert));
  }

  griff.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    griff.setPointerCapture(e.pointerId);
    const ziehen = (ev) => {
      const kasten = teiler.getBoundingClientRect();
      if (!kasten.width) return;
      setze(((ev.clientX - kasten.left) / kasten.width) * 100);
    };
    const schluss = () => {
      griff.removeEventListener('pointermove', ziehen);
      griff.removeEventListener('pointerup', schluss);
      griff.removeEventListener('pointercancel', schluss);
    };
    griff.addEventListener('pointermove', ziehen);
    griff.addEventListener('pointerup', schluss);
    griff.addEventListener('pointercancel', schluss);
  });

  griff.addEventListener('keydown', (e) => {
    const taste = e.key;
    if (taste === 'ArrowLeft') setze(wert - SCHRITT);
    else if (taste === 'ArrowRight') setze(wert + SCHRITT);
    else if (taste === 'Home') setze(0);
    else if (taste === 'End') setze(100);
    else return;
    e.preventDefault();
  });
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/teiler.js", fehler); } }

/* system/tempoband.js */
{ try {
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NACHLAUF = 8;      // je Sekunde, wie schnell die geglättete Geschwindigkeit der echten folgt
  var STUFE = 1000;      // Rollgeschwindigkeit in px/s, bei der der Faktor 5 erreicht ist
  var GRUNDTEMPO = 0.05; // Anteil der Blockbreite pro Sekunde bei Faktor 1

  var reihen = [];
  var fertig = new WeakSet();

  function fuellen(r) {
    r.breite = r.block.scrollWidth;
    if (!r.breite) return;
    var soll = Math.max(3, Math.ceil(r.el.clientWidth / r.breite) + 2);
    var kopien = r.bahn.querySelectorAll('.tempoband__block').length;
    while (kopien < soll) {
      var k = r.block.cloneNode(true);
      k.setAttribute('aria-hidden', 'true');
      r.bahn.appendChild(k);
      kopien++;
    }
  }
  function einrichten(wurzel) {
    var wurzeln = (wurzel.matches && wurzel.matches('.tempoband') ? [wurzel] : []).concat(Array.prototype.slice.call(wurzel.querySelectorAll('.tempoband')));
    wurzeln.forEach(function (w) {
      if (fertig.has(w)) return;
      fertig.add(w);
      w.classList.add('ist-bereit');
      Array.prototype.forEach.call(w.querySelectorAll('.tempoband__reihe'), function (el) {
        var bahn = el.querySelector('.tempoband__bahn');
        var block = bahn.querySelector('.tempoband__block');
        var r = { el: el, bahn: bahn, block: block, breite: 0, pos: 0,
          richtung: el.getAttribute('data-richtung') === 'zurueck' ? -1 : 1, jetzt: 1, sichtbar: true };
        reihen.push(r);
        fuellen(r);
        if ('ResizeObserver' in window) new ResizeObserver(function () { fuellen(r); }).observe(r.el);
        if ('IntersectionObserver' in window) new IntersectionObserver(function (l) { r.sichtbar = l[0].isIntersecting; }).observe(r.el);
      });
    });
  }
  einrichten(document);
  document.addEventListener('inhalt-neu', function (e) { einrichten(e.target instanceof Element ? e.target : document); });

  var glatt = 0, letzteY = window.scrollY, letzte = 0;
  function takt(t) {
    var dt = Math.min((t - letzte) / 1000, 0.1);
    letzte = t;
    if (dt <= 0) { requestAnimationFrame(takt); return; }
    var y = window.scrollY;
    var roh = (y - letzteY) / dt;
    letzteY = y;
    glatt += (roh - glatt) * (1 - Math.exp(-NACHLAUF * dt));
    var faktor = 1 + Math.min(4, Math.abs(glatt) / STUFE * 4);
    reihen.forEach(function (r) {
      if (Math.abs(glatt) > STUFE / 50) r.jetzt = r.richtung * (glatt >= 0 ? 1 : -1);
      if (!r.sichtbar || !r.breite || document.hidden) return;
      r.pos += r.jetzt * r.breite * GRUNDTEMPO * faktor * dt;
      var m = ((r.pos % r.breite) + r.breite) % r.breite;
      r.bahn.style.setProperty('--tempoband-x', (-m) + 'px');
    });
    requestAnimationFrame(takt);
  }
  letzte = performance.now();
  requestAnimationFrame(takt);
})();

} catch (fehler) { console.warn("marke.js · system/tempoband.js", fehler); } }

/* system/terminal.js */
{ try {
(() => {
const wurzel = document.documentElement;
const ms = (name) => parseFloat(getComputedStyle(wurzel).getPropertyValue(name)) || 0;
const warte = (t) => new Promise((r) => setTimeout(r, t));
const ruhig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const fertig = new WeakSet();
function einrichten(wurzel) {
const treffer = [...(wurzel.matches?.('.terminal--tippen') ? [wurzel] : []), ...wurzel.querySelectorAll('.terminal--tippen')];
for (const term of treffer) {
  if (fertig.has(term)) continue;
  fertig.add(term);

  const knopf = term.querySelector('.terminal__abspielen');
  if (!knopf) continue;
  if (ruhig()) { knopf.hidden = true; continue; }
  const zeilen = [...term.querySelectorAll('.terminal__zeile')];
  const beschriftung = { an: knopf.dataset.an || knopf.textContent, aus: knopf.dataset.aus || knopf.textContent };
  let abbruch = false;
  let laeuft = false;
  let angehalten = false;
  let sichtbar = false;
  const originale = new Map();
  for (const z of zeilen) {
    const t = z.querySelector('.terminal__text');
    if (t) originale.set(t, t.textContent);
  }
  const zeigeAlles = () => {
    for (const z of zeilen) z.classList.remove('terminal__zeile--aus');
    for (const [t, text] of originale) t.textContent = text;
    term.querySelectorAll('.terminal__cursor').forEach((c) => c.remove());
  };
  const spiele = async () => {
    if (laeuft) return;
    laeuft = true; abbruch = false;
    term.setAttribute('aria-busy', 'true');
    zeilen.forEach((z) => z.classList.add('terminal__zeile--aus'));
    for (const z of zeilen) {
      if (abbruch) break;
      z.classList.remove('terminal__zeile--aus');
      const t = z.querySelector('.terminal__text');
      if (z.classList.contains('terminal__zeile--befehl') && t) {
        const voll = originale.get(t);
        const cursor = document.createElement('span');
        cursor.className = 'terminal__cursor';
        cursor.setAttribute('aria-hidden', 'true');
        t.textContent = '';
        z.append(cursor);
        for (let i = 1; i <= voll.length && !abbruch; i++) {
          t.textContent = voll.slice(0, i);
          await warte(ms('--t-sofort'));
        }
        cursor.remove();
        if (!abbruch) await warte(ms('--t-slow'));
      } else {
        await warte(ms('--t-base'));
      }
    }
    zeigeAlles();
    term.removeAttribute('aria-busy');
    laeuft = false;
    if (!angehalten) { await warte(ms('--t-lang') * 4); if (!angehalten && sichtbar) spiele(); }
  };
  knopf.setAttribute('aria-pressed', 'false');
  knopf.textContent = beschriftung.an;
  knopf.addEventListener('click', () => {
    angehalten = !angehalten;
    knopf.setAttribute('aria-pressed', String(angehalten));
    knopf.textContent = angehalten ? beschriftung.aus : beschriftung.an;
    if (angehalten) abbruch = true; else if (!laeuft) spiele();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => {
      sichtbar = e[0].isIntersecting;
      if (sichtbar && !laeuft && !angehalten) spiele();
    }, { threshold: 0.4 }).observe(term);
  }
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/terminal.js", fehler); } }

/* system/tiefenkarussell.js */
{ try {
(() => {
const reduziert = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const klemmen = (v, a, b) => Math.min(Math.max(v, a), b);
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const CFG = { breite: 18.75, tiefe: 13.75, streuung: 5.625, kippung: 22, sicht: 4, abfall: 0.2, dauer: 700, schleife: true, rand: 7.5 };

function starten(wurzel) {
  const buehne = wurzel.querySelector('.tiefenkarussell__buehne');
  const karten = [...wurzel.querySelectorAll('.tiefenkarussell__karte')];
  const schleier = karten.map(k => k.querySelector('.tiefenkarussell__schleier'));
  const punkte = [...wurzel.querySelectorAll('.bilderfolge__punkt')];
  const nameEl = wurzel.querySelector('[data-tiefenkarussell-name]');
  const infoEl = wurzel.querySelector('[data-tiefenkarussell-info]');
  const n = karten.length;
  if (n < 2) return;

  let pos = 0;          // Gleitkomma-Lage der Reihe
  let fokus = 0;        // Ganzzahl des vordersten Stücks
  let massstab = 1;
  let lauf = 0;
  let zug = null;
  let gezogen = false;
  let radTimer = 0;

  wurzel.classList.add('tiefenkarussell--an');

  function lage(p) {
    const r = rem();
    for (let i = 0; i < n; i++) {
      let d = i - p;
      if (CFG.schleife) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }
      const hinten = Math.max(0, d);
      const sichtbar = Math.abs(d) <= CFG.sicht + 0.5;
      const tz = -CFG.tiefe * r * d;
      const tx = CFG.streuung * r * d;
      const ry = CFG.kippung * klemmen(d, 0, 1);
      let deckung = d < 0 ? Math.max(0, 1 + d) : 1;
      if (!sichtbar) deckung = 0;
      const k = karten[i];
      k.style.transform = `translate(-50%, -50%) scale(${massstab}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      k.style.opacity = deckung.toFixed(3);
      k.style.pointerEvents = sichtbar && deckung > 0.05 ? 'auto' : 'none';
      schleier[i].style.opacity = klemmen(hinten * CFG.abfall * 1.25, 0, 0.86).toFixed(3);
    }
  }

  function fahren(ziel, animiert) {
    cancelAnimationFrame(lauf);
    const von = pos;
    const dauer = animiert && !reduziert() ? CFG.dauer : 0;
    if (!dauer) {
      pos = ((ziel % n) + n) % n;
      lage(pos);
      return;
    }
    const t0 = performance.now();
    const schritt = jetzt => {
      const t = Math.min(1, (jetzt - t0) / dauer);
      pos = von + (ziel - von) * (1 - Math.pow(1 - t, 3));   // power3.out
      lage(pos);
      if (t < 1) lauf = requestAnimationFrame(schritt);
      else { pos = ((pos % n) + n) % n; lage(pos); }
    };
    lauf = requestAnimationFrame(schritt);
  }

  function melden() {
    karten.forEach((k, i) => k.setAttribute('aria-hidden', i === fokus ? 'false' : 'true'));
    punkte.forEach((p, i) => (i === fokus ? p.setAttribute('aria-current', 'true') : p.removeAttribute('aria-current')));
    if (nameEl) nameEl.textContent = karten[fokus].dataset.name || '';
    if (infoEl) infoEl.textContent = karten[fokus].dataset.info || '';
  }

  function waehlen(roh, animiert = true) {
    const idx = CFG.schleife ? ((roh % n) + n) % n : klemmen(roh, 0, n - 1);
    let delta = idx - pos;
    if (CFG.schleife) {
      delta = ((delta % n) + n) % n;
      if (delta > n / 2) delta -= n;
    }
    fahren(pos + delta, animiert);
    if (idx !== fokus) { fokus = idx; melden(); }
  }
  const schritt = s => waehlen(fokus + s, true);

  new ResizeObserver(([e]) => {
    const noetig = (CFG.breite + CFG.streuung * 2 + CFG.rand) * rem();
    massstab = klemmen(e.contentRect.width / noetig, 0.4, 1);
    lage(pos);
  }).observe(buehne);

  buehne.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    cancelAnimationFrame(lauf);
    const roh = e.deltaMode === 1 ? e.deltaX * 24 : e.deltaX;
    pos += klemmen(roh / (CFG.breite * rem() * 0.9), -0.6, 0.6);
    lage(pos);
    clearTimeout(radTimer);
    radTimer = setTimeout(() => waehlen(Math.round(pos), true), 130);
  }, { passive: false });

  const schrittPx = () => Math.max(CFG.breite * rem() * 0.55 * massstab, 40);
  buehne.addEventListener('pointerdown', e => {
    cancelAnimationFrame(lauf);
    zug = { x: e.clientX, start: pos, lastX: e.clientX, lastT: performance.now(), v: 0, bewegt: false, id: e.pointerId };
  });
  buehne.addEventListener('pointermove', e => {
    if (!zug) return;
    const dx = e.clientX - zug.x;
    if (!zug.bewegt && Math.abs(dx) > 4) {
      zug.bewegt = true;
      buehne.setPointerCapture(zug.id);
    }
    if (!zug.bewegt) return;
    const jetzt = performance.now();
    zug.v = (e.clientX - zug.lastX) / Math.max(jetzt - zug.lastT, 1);
    zug.lastX = e.clientX;
    zug.lastT = jetzt;
    pos = zug.start - dx / schrittPx();
    lage(pos);
  });
  const loslassen = () => {
    if (!zug) return;
    const z = zug;
    zug = null;
    if (!z.bewegt) return;
    gezogen = true;
    setTimeout(() => (gezogen = false), 0);   // schluckt den Klick, der auf das Loslassen folgt
    waehlen(Math.round(pos - (z.v * 180) / schrittPx()), true);
  };
  buehne.addEventListener('pointerup', loslassen);
  buehne.addEventListener('pointercancel', loslassen);

  karten.forEach((k, i) => k.addEventListener('click', () => { if (!gezogen) waehlen(i, true); }));

  buehne.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); schritt(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); schritt(1); }
    else if (e.key === 'Home') { e.preventDefault(); waehlen(0, true); }
    else if (e.key === 'End') { e.preventDefault(); waehlen(n - 1, true); }
  });
  wurzel.querySelectorAll('[data-schritt]').forEach(b => b.addEventListener('click', () => schritt(Number(b.dataset.schritt))));
  punkte.forEach((p, i) => p.addEventListener('click', () => waehlen(i, true)));

  if (wurzel.hasAttribute('data-autoplay')) {
    const verzoegerung = Math.max(Number(wurzel.dataset.autoplay) || 3200, 600);
    let ueber = false, fokussiert = false, imBild = false, uhr = 0;
    const takt = () => { if (!ueber && !fokussiert && !zug) schritt(1); };
    const pruefen = () => {
      const soll = imBild && !reduziert() && !document.hidden;
      if (soll && !uhr) uhr = setInterval(takt, verzoegerung);
      if (!soll && uhr) { clearInterval(uhr); uhr = 0; }
    };
    wurzel.addEventListener('mouseenter', () => (ueber = true));
    wurzel.addEventListener('mouseleave', () => (ueber = false));
    wurzel.addEventListener('focusin', () => (fokussiert = true));
    wurzel.addEventListener('focusout', () => (fokussiert = false));
    new IntersectionObserver(([e]) => { imBild = e.isIntersecting; pruefen(); }).observe(wurzel);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', pruefen);
    document.addEventListener('visibilitychange', pruefen);
  }

  melden();
  lage(pos);
}

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.tiefenkarussell') ? [wurzel] : []), ...wurzel.querySelectorAll('.tiefenkarussell')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    starten(el);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/tiefenkarussell.js", fehler); } }

/* system/tokenfeld.js */
{ try {

(() => {
function bereinigt(text) {
  return text.replace(/,/g, '').trim();
}

function marke(feld, wert) {
  const eingabe = feld.querySelector('.tokenfeld__eingabe');
  const name = feld.dataset.feld || 'schlagwoerter';

  const stueck = document.createElement('span');
  stueck.className = 'wahlmarke';
  stueck.textContent = wert + ' ';

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.setAttribute('aria-label', `Marke ${wert} entfernen`);
  knopf.innerHTML = '<svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  stueck.appendChild(knopf);

  const versteckt = document.createElement('input');
  versteckt.type = 'hidden';
  versteckt.name = name;
  versteckt.value = wert;
  stueck.appendChild(versteckt);

  feld.insertBefore(stueck, eingabe);
}

document.addEventListener('click', (e) => {
  const knopf = e.target.closest?.('.tokenfeld .wahlmarke button:not(.marke-sprung)');
  if (!knopf) return;
  const feld = knopf.closest('.tokenfeld');
  knopf.closest('.tokenfeld .wahlmarke').remove();
  feld?.querySelector('.tokenfeld__eingabe')?.focus();
});

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.tokenfeld') ? [wurzel] : []), ...wurzel.querySelectorAll('.tokenfeld')];
  for (const feld of treffer) {
    if (fertig.has(feld)) continue;
    fertig.add(feld);
    const eingabe = feld.querySelector('.tokenfeld__eingabe');
    if (!eingabe) continue;

    eingabe.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ',') return;
      const wert = bereinigt(eingabe.value);
      e.preventDefault();
      if (!wert) return;
      marke(feld, wert);
      eingabe.value = '';
    });

    eingabe.addEventListener('keydown', (e) => {
      if (e.key !== 'Backspace' || eingabe.value) return;
      const letzte = feld.querySelector('.wahlmarke:last-of-type');
      letzte?.remove();
    });
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/tokenfeld.js", fehler); } }

/* system/treibende-wand.js */
{ try {
(() => {
const MQ = matchMedia('(prefers-reduced-motion: reduce)');
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
const el = (tag, klasse) => { const e = document.createElement(tag); e.className = klasse; return e; };

const CFG = { kippung: 16, drehung: -14, tiefe: 7.5, tempo: 2.625, varianz: 0.45, parallax: 0.6 };
const spaltenFaktor = (i, v) => 1 + v * ((((i * 0.6180339887 + 0.35) % 1) * 2) - 1);

function starten(rahmen) {
  const quelle = rahmen.querySelector('.treibende-wand__quelle');
  const sorten = [...quelle.querySelectorAll('li')].map(li => ({
    titel: li.dataset.titel, href: li.querySelector('a').getAttribute('href'), bild: li.querySelector('img')
  }));

  let ebene = null, spuren = [], metas = [], offsets = [], tempi = [], basis = [];
  let lauf = 0, letzt = null, imBild = false, io = null, ro = null;
  let spalteUnterZeiger = -1, aktiv = null;
  let zeiger = { x: 0, y: 0 }, gedaempft = { x: 0, y: 0 };
  let anzahl = 0, hoeheGemessen = 0;

  function kachel(s, id, c, original) {
    const a = original ? el('a', 'treibende-wand__kachel') : el('div', 'treibende-wand__kachel');
    if (original) { a.href = s.href; a.setAttribute('aria-label', s.titel); } else a.setAttribute('aria-hidden', 'true');
    a.dataset.id = id;
    a.dataset.sp = c;
    const innen = el('span', 'treibende-wand__innen');
    const bild = s.bild.cloneNode(true);
    bild.alt = '';
    bild.draggable = false;
    const name = el('span', 'treibende-wand__name');
    name.textContent = s.titel;
    innen.append(bild, name);
    a.append(innen);
    if (original) {
      a.addEventListener('focus', () => waehlen(id, c));
      a.addEventListener('blur', loesen);
    }
    return a;
  }

  function waehlen(id, c) {
    if (aktiv === id) return;
    ebene.querySelectorAll('.ist-aktiv').forEach(k => k.classList.remove('ist-aktiv'));
    aktiv = id;
    spalteUnterZeiger = c;
    ebene.querySelectorAll(`[data-id="${id}"]`).forEach(k => k.classList.add('ist-aktiv'));
  }
  function loesen() {
    if (aktiv) ebene.querySelectorAll('.ist-aktiv').forEach(k => k.classList.remove('ist-aktiv'));
    aktiv = null;
    spalteUnterZeiger = -1;
  }

  function aufbauen() {
    abbauen(true);
    const r = rem();
    anzahl = rahmen.clientWidth / r < 34 ? 3 : 5;
    rahmen.classList.add('treibende-wand__rahmen--an');
    ebene = el('div', 'treibende-wand__ebene');
    ebene.setAttribute('role', 'list');
    rahmen.append(ebene);
    const spaltenSorten = Array.from({ length: anzahl }, () => []);
    sorten.forEach((s, i) => spaltenSorten[i % anzahl].push(s));
    hoeheGemessen = rahmen.clientHeight;
    spaltenSorten.forEach((liste, c) => {
      if (!liste.length) liste = sorten.slice(0, 1);
      const spalte = el('div', 'treibende-wand__spalte');
      const spur = el('div', 'treibende-wand__spur');
      spalte.append(spur);
      ebene.append(spalte);
      // Erste Kopie einsetzen, messen, dann weitere Kopien bis über das Anderthalbfache der Höhe.
      liste.forEach((s, k) => spur.append(kachel(s, `${c}-0-${k}`, c, true)));
      const einheit = spur.firstElementChild.offsetHeight;
      const kopie = Math.max(einheit, liste.length * einheit);
      const kopien = Math.max(2, Math.ceil((hoeheGemessen * 1.6) / kopie) + 1);
      for (let q = 1; q < kopien; q++) liste.forEach((s, k) => spur.append(kachel(s, `${c}-${q}-${k}`, c, false)));
      spuren.push(spur);
      metas.push(kopie);
      offsets.push(kopie * ((c * 0.37) % 1));
      tempi.push(0);
      basis.push(CFG.tempo * r * spaltenFaktor(c, CFG.varianz) * (c % 2 === 0 ? 1 : -1));
    });
    ebene.querySelectorAll('.treibende-wand__spalte').forEach(sp => sp.setAttribute('role', 'presentation'));
    zeichnen(0, 0);
    if (!io) {
      io = new IntersectionObserver(([e]) => { imBild = e.isIntersecting; imBild ? anwerfen() : anhalten(); });
      io.observe(rahmen);
    }
  }

  function abbauen(behalteBeobachter) {
    anhalten();
    ebene?.remove();
    ebene = null; spuren = []; metas = []; offsets = []; tempi = []; basis = []; aktiv = null; spalteUnterZeiger = -1;
    rahmen.classList.remove('treibende-wand__rahmen--an');
    if (!behalteBeobachter) { io?.disconnect(); io = null; }
  }

  function zeichnen(px, py) {
    const r = rem();
    ebene.style.transform = `translate(-50%, -50%) scale(1.18) rotateX(${CFG.kippung + py}deg) rotateY(${CFG.drehung + px}deg) translateZ(${-CFG.tiefe * r}px)`;
  }

  function schritt(ts) {
    if (letzt === null) letzt = ts;
    const dt = Math.min(0.05, Math.max(0, ts - letzt) / 1000);
    letzt = ts;
    const maxK = CFG.parallax * 8;
    const dampf = 1 - Math.exp(-dt / 0.12);
    gedaempft.x += (zeiger.x * maxK - gedaempft.x) * dampf;
    gedaempft.y += (-zeiger.y * maxK - gedaempft.y) * dampf;
    zeichnen(gedaempft.x, gedaempft.y);
    for (let c = 0; c < spuren.length; c++) {
      const ziel = spalteUnterZeiger === c ? 0 : basis[c];
      tempi[c] += (ziel - tempi[c]) * (1 - Math.exp(-dt / (ziel === 0 ? 0.16 : 0.28)));
      offsets[c] = (((offsets[c] + tempi[c] * dt) % metas[c]) + metas[c]) % metas[c];
      spuren[c].style.transform = `translate3d(0, ${-offsets[c]}px, 0)`;
    }
    lauf = requestAnimationFrame(schritt);
  }
  function anwerfen() {
    if (lauf || MQ.matches || !ebene) return;
    letzt = null;
    lauf = requestAnimationFrame(schritt);
  }
  function anhalten() { cancelAnimationFrame(lauf); lauf = 0; }

  rahmen.addEventListener('pointermove', e => {
    if (!ebene) return;
    const b = rahmen.getBoundingClientRect();
    zeiger = { x: (e.clientX - b.left) / b.width - 0.5, y: (e.clientY - b.top) / b.height - 0.5 };
    const treffer = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.treibende-wand__kachel');
    if (treffer && treffer.dataset.id !== aktiv) waehlen(treffer.dataset.id, Number(treffer.dataset.sp));
  });
  rahmen.addEventListener('pointerleave', () => { zeiger = { x: 0, y: 0 }; loesen(); });

  function pruefen() {
    if (MQ.matches) { abbauen(false); return; }
    aufbauen();
    if (imBild) anwerfen();
  }
  MQ.addEventListener('change', pruefen);
  document.addEventListener('visibilitychange', () => { if (document.hidden) anhalten(); else if (imBild) anwerfen(); });

  ro = new ResizeObserver(() => {
    if (MQ.matches || !ebene) return;
    const neu = rahmen.clientWidth / rem() < 34 ? 3 : 5;
    if (neu !== anzahl || Math.abs(rahmen.clientHeight - hoeheGemessen) > 8) {
      cancelAnimationFrame(rebau);
      rebau = requestAnimationFrame(() => { aufbauen(); if (imBild) anwerfen(); });
    }
  });
  let rebau = 0;

  if (!MQ.matches) aufbauen();
  ro.observe(rahmen);
}

const fertig = new WeakSet();
function einrichten(ort) {
  const treffer = [...(ort.matches?.('.treibende-wand__rahmen') ? [ort] : []), ...ort.querySelectorAll('.treibende-wand__rahmen')];
  for (const el of treffer) {
    if (fertig.has(el)) continue;
    fertig.add(el);
    starten(el);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/treibende-wand.js", fehler); } }

/* system/umschaltknopf.js */
{ try {
(() => {
const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.umschaltknopf') ? [wurzel] : []), ...wurzel.querySelectorAll('.umschaltknopf')];
  for (const knopf of treffer) {
    if (fertig.has(knopf)) continue;
    fertig.add(knopf);
    knopf.addEventListener('click', () => {
    const an = knopf.getAttribute('aria-pressed') !== 'true';
    const gruppe = knopf.closest('.umschaltgruppe');

    if (gruppe && !('mehrfach' in gruppe.dataset)) {
      gruppe.querySelectorAll('.umschaltknopf')
        .forEach((k) => k.setAttribute('aria-pressed', String(k === knopf)));
      return;
    }
    knopf.setAttribute('aria-pressed', String(an));
  });
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/umschaltknopf.js", fehler); } }

/* system/vorschau-zeiger.js */
{ try {
(() => {
'use strict';
const Vorschau = { inhalt: null };
let karte = null, uhr = null, zuletzt = 0, anker = null;
const zeit = (n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
function leg() {
  if (karte) return karte;
  karte = document.createElement('div');
  karte.className = 'vorschaukarte vorschaukarte--schwebt'; karte.popover = 'manual'; karte.setAttribute('role', 'tooltip');
  karte.addEventListener('pointerleave', zu);
  document.body.append(karte);
  return karte;
}
function auf(el) {
  const [typ, id] = (el.dataset.vorschau || '').split(':');
  const html = Vorschau.inhalt?.(typ, id); if (!html) return;
  const k = leg(); k.innerHTML = html; anker = el;
  try { k.showPopover(); } catch (_) { return; }
  const r = el.getBoundingClientRect(), h = k.offsetHeight, w = k.offsetWidth, abstand = 6;
  const oben = innerHeight - r.bottom < h + abstand + 8 ? r.top - h - abstand : r.bottom + abstand;
  k.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  k.style.top = Math.max(8, oben) + 'px';
}
function zu() {
  clearTimeout(uhr);
  if (!karte?.matches(':popover-open')) return;
  karte.hidePopover(); anker = null; zuletzt = performance.now();
}
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest?.('[data-vorschau]'); if (!el || el === anker || e.pointerType === 'touch') return;
  if (document.documentElement.hasAttribute('data-zieht-karte')) return;
  clearTimeout(uhr);
  const sofort = karte?.matches(':popover-open') || performance.now() - zuletzt < 600;
  uhr = setTimeout(() => auf(el), sofort ? 0 : 400);
});
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest?.('[data-vorschau]'); if (!el) return;
  if (karte && (e.relatedTarget === karte || karte.contains(e.relatedTarget))) return;
  clearTimeout(uhr);
  setTimeout(() => { if (!karte?.matches(':hover')) zu(); }, zeit('--t-sofort'));
});
document.addEventListener('scroll', zu, { passive: true, capture: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zu(); });
document.addEventListener('pointerdown', (e) => { if (!karte?.contains(e.target)) zu(); }, true);
window.Vorschau = Vorschau;
})();

} catch (fehler) { console.warn("marke.js · system/vorschau-zeiger.js", fehler); } }

/* system/zeitstrahl.js */
{ try {
(() => {
function lagenSetzen(strahl) {
  const oben = strahl.getBoundingClientRect().top;
  const hoehe = strahl.getBoundingClientRect().height;
  if (!hoehe) return;
  for (const eintrag of strahl.querySelectorAll('li')) {
    const r = eintrag.getBoundingClientRect();
    const versatz = parseFloat(getComputedStyle(eintrag, '::before').top) || 0;
    const durchmesser = parseFloat(getComputedStyle(eintrag, '::before').height) || 0;
    const mitte = r.top - oben + versatz + durchmesser / 2;
    eintrag.style.setProperty('--pos', (mitte / hoehe).toFixed(4));
  }
}

const fertig = new WeakSet();
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.zeitstrahl') ? [wurzel] : []), ...wurzel.querySelectorAll('.zeitstrahl')];
for (const strahl of treffer) {
  if (fertig.has(strahl)) continue;
  fertig.add(strahl);
  lagenSetzen(strahl);
  new ResizeObserver(() => lagenSetzen(strahl)).observe(strahl);
}
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));
})();

} catch (fehler) { console.warn("marke.js · system/zeitstrahl.js", fehler); } }

/* system/zeitachse.js */
{ try {
(() => {
const TAG = 864e5;
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const STAND = { aktiv: ['akzent', 'aktiv'], wartet: ['warn', 'wartet'], ruht: ['', 'ruht'], fertig: ['pass', 'fertig'] };
const ZAEHLT_NICHT = new Set(['ruht', 'fertig']);
const tonVon = (z) => { const n = Number(z.ton); return Number.isInteger(n) && n >= 1 && n <= 6 ? n : 0; };
const WARN = '<svg class="symbol symbol--klein" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

const tag = (iso) => { const [j, m, t] = String(iso).slice(0, 10).split('-').map(Number); return Math.round(Date.UTC(j, m - 1, t) / TAG); };
const datum = (n) => new Date(n * TAG);
const iso = (n) => datum(n).toISOString().slice(0, 10);
const wochentag = (n) => datum(n).getUTCDay();
const montag = (n) => n - ((wochentag(n) + 6) % 7);
const lesbar = (n) => { const d = datum(n); return `${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const kw = (n) => { const do_ = montag(n) + 3; return 1 + Math.floor((do_ - Math.round(Date.UTC(datum(do_).getUTCFullYear(), 0, 1) / TAG)) / 7); };
const zahl = (v) => (Math.round(v * 10) / 10).toLocaleString('de-CH');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ref = (o) => `data-typ="${esc(o.typ)}" data-id="${esc(o.id)}"`;

function werktage(a, b) {
  let n = 0;
  for (let d = a; d <= b; d++) { const w = wochentag(d); if (w && w < 6) n++; }
  return n;
}

function lies(za) {
  const quelle = za.querySelector(':scope > script[type="application/json"]');
  try { return quelle ? JSON.parse(quelle.textContent) : {}; } catch { console.error('Zeitachse: Daten sind kein gültiges JSON', za); return {}; }
}

function wochen(d, von, bis) {
  const voll = Number(d.kapazitaet?.stunden ?? 40);
  const weg = new Set();
  for (const a of d.abwesenheiten || []) for (let t = tag(a.von); t <= tag(a.bis || a.von); t++) weg.add(t);
  const liste = [];
  for (let w = von; w <= bis; w += 7) {
    const ende = w + 6;
    let frei = 0;
    for (let t = w; t <= w + 4; t++) if (!weg.has(t)) frei++;
    let geplant = 0;
    const vorhaben = [];
    for (const z of d.zeilen || []) {
      if (ZAEHLT_NICHT.has(z.status) || !z.stunden) continue;
      const a = Math.max(w, tag(z.beginn)), b = Math.min(ende, tag(z.ende || z.beginn));
      if (a > b) continue;
      const anteil = werktage(a, b) / 5;
      if (!anteil) continue;
      geplant += z.stunden * anteil;
      vorhaben.push({ typ: z.typ, id: z.id });
    }
    liste.push({ von: w, bis: ende, geplant, verfuegbar: voll * frei / 5, vorhaben });
  }
  return liste;
}

function ausschnitt(d, heute) {
  const tage = [heute];
  for (const z of d.zeilen || []) { tage.push(tag(z.beginn), tag(z.ende || z.beginn)); for (const m of z.meilensteine || []) tage.push(tag(m.datum)); }
  for (const a of d.abwesenheiten || []) tage.push(tag(a.von), tag(a.bis || a.von));
  const von = montag(d.von ? tag(d.von) : Math.min(...tage) - 14);
  const bis = montag(d.bis ? tag(d.bis) : Math.max(...tage) + 14) + 6;
  return { von, bis };
}

function kopf(zoom, von, bis) {
  const spannen = (schluessel, name) => {
    const out = [];
    for (let t = von; t <= bis; t++) {
      const k = schluessel(t);
      if (out.length && out.at(-1).k === k) out.at(-1).n++;
      else out.push({ k, a: t - von, n: 1, name: name(t) });
    }
    return out;
  };
  const monat = (t) => datum(t).getUTCFullYear() * 12 + datum(t).getUTCMonth();
  const monatName = (t) => `${MONATE[datum(t).getUTCMonth()]} ${datum(t).getUTCFullYear()}`;
  let oben, unten;
  if (zoom === 'quartal') {
    oben = spannen((t) => Math.floor(monat(t) / 3), (t) => `Q${Math.floor(datum(t).getUTCMonth() / 3) + 1} ${datum(t).getUTCFullYear()}`);
    unten = spannen(monat, (t) => MONATE[datum(t).getUTCMonth()]);
  } else if (zoom === 'woche') {
    oben = spannen(monat, monatName);
    unten = spannen((t) => t, (t) => `${WOCHENTAGE[wochentag(t)]} ${datum(t).getUTCDate()}`);
  } else {
    oben = spannen(monat, monatName);
    unten = spannen(montag, (t) => `KW ${kw(montag(t))}`);
  }
  const zelle = (s) => `<span class="zeitachse__einheit" data-a="${s.a}" data-n="${s.n}">${esc(s.name)}</span>`;
  return `<div class="zeitachse__zeile zeitachse__zeile--kopf"><span class="zeitachse__name" aria-hidden="true"></span><div class="zeitachse__spur"><div class="zeitachse__band">${oben.map(zelle).join('')}</div><div class="zeitachse__band">${unten.map(zelle).join('')}</div></div></div>`;
}

function legende(za, d) {
  const liste = za.querySelector('.zeitachse__legende');
  if (!liste) return;
  for (const alt of liste.querySelectorAll('li[data-aus-daten]')) alt.remove();
  const bekannt = new Set();
  const neu = (d.toene || []).filter((t) => { const n = tonVon(t); if (!n || bekannt.has(n) || !String(t.name ?? '').trim()) return false; bekannt.add(n); return true; });
  for (const z of d.zeilen || []) if (tonVon(z) && !bekannt.has(tonVon(z))) { console.warn('Zeitachse: Ton', z.ton, 'hat keinen Eintrag in toene[], die Töne gelten nur mit Legende', z); bekannt.add(tonVon(z)); }
  liste.prepend(...neu.map((t) => { const li = document.createElement('li'); li.dataset.ausDaten = ''; li.innerHTML = `<span class="zeitachse__probe" data-ton="${tonVon(t)}" aria-hidden="true"></span>${esc(t.name)}`; return li; }));
}

function zeichne(za, d) {
  const flaeche = za.querySelector('.zeitachse__flaeche');
  if (!flaeche) return;
  const zoom = za.querySelector('.zeitachse__zoom input:checked')?.value || za.dataset.zoom || 'monat';
  za.dataset.zoom = zoom;
  const heute = d.heute ? tag(d.heute) : tag(new Date().toISOString());
  const { von, bis } = ausschnitt(d, heute);
  const einheit = d.kapazitaet?.einheit || 'h';

  const abw = (d.abwesenheiten || []).map((a) => ({ ...a, a: tag(a.von) - von, n: tag(a.bis || a.von) - tag(a.von) + 1 }));
  const zeilen = (d.zeilen || []).map((z) => {
    const [stTon, stand] = STAND[z.status] || ['', z.status || ''];
    const eigen = tonVon(z);
    const ton = eigen ? '' : stTon;
    const a = tag(z.beginn) - von, n = tag(z.ende || z.beginn) - tag(z.beginn) + 1;
    const text = `${z.name}, ${stand}, ${lesbar(a + von)} bis ${lesbar(a + von + n - 1)}${z.stunden ? `, ${zahl(z.stunden)} ${einheit} je Woche` : ''}`;
    const punkte = (z.meilensteine || []).map((m) => `<button type="button" class="zeitachse__meilenstein" ${ref(m)} data-a="${tag(m.datum) - von}" aria-label="Meilenstein ${esc(m.name)}, ${lesbar(tag(m.datum))}" title="${esc(m.name)}, ${lesbar(tag(m.datum))}"></button>`).join('');
    return `<div class="zeitachse__zeile"><button type="button" class="zeitachse__name" ${ref(z)} data-a="${a}" aria-label="${esc(text)}"><span>${esc(z.name)}</span><span class="zeitachse__stand">${esc(stand)}</span></button>` +
      `<div class="zeitachse__spur"><button type="button" class="zeitachse__balken" ${ref(z)} ${eigen ? `data-ton="${eigen}"` : `data-ton-zustand="${ton}"`} data-a="${a}" data-n="${n}" tabindex="-1" aria-hidden="true" title="${esc(text)}"><span>${esc(z.name)}</span></button>${punkte}</div></div>`;
  }).join('');

  const abwZeile = abw.length ? `<div class="zeitachse__zeile"><span class="zeitachse__name">Abwesend</span><div class="zeitachse__spur">${abw.map((a) => `<button type="button" class="zeitachse__abwesenheit" ${ref(a)} data-a="${a.a}" data-n="${a.n}" aria-label="${esc(a.name)}, ${lesbar(a.a + von)} bis ${lesbar(a.a + von + a.n - 1)}" title="${esc(a.name)}"><span>${esc(a.name)}</span></button>`).join('')}</div></div>` : '';

  const liste = wochen(d, von, bis);
  const kap = `<div class="zeitachse__zeile zeitachse__zeile--kapazitaet"><span class="zeitachse__name" id="${za.id}-kap">Kapazität</span><div class="zeitachse__spur" role="toolbar" aria-labelledby="${za.id}-kap" aria-orientation="horizontal">${liste.map((w, i) => {
    const anteil = w.verfuegbar ? w.geplant / w.verfuegbar : (w.geplant ? 2 : 0);
    const ueber = w.geplant > w.verfuegbar + 0.05;
    return `<button type="button" class="zeitachse__woche" data-woche="${i}" data-a="${w.von - von}" data-n="7" data-anteil="${Math.min(anteil, 1).toFixed(3)}"${ueber ? ' data-ueberlast' : ''} tabindex="${w.von <= heute && heute <= w.bis ? 0 : -1}" aria-label="KW ${kw(w.von)}, ${zahl(w.geplant)} von ${zahl(w.verfuegbar)} ${einheit} geplant${ueber ? ', Überlast' : ''}" title="KW ${kw(w.von)}: ${zahl(w.geplant)} von ${zahl(w.verfuegbar)} ${einheit}${ueber ? ', Überlast' : ''}">${ueber ? WARN : ''}<span>${zahl(w.geplant)}/${zahl(w.verfuegbar)}</span></button>`;
  }).join('')}</div></div>`;

  const flaechen = abw.map((a) => `<span class="zeitachse__frei" data-a="${a.a}" data-n="${a.n}" aria-hidden="true"></span>`).join('');
  const jetzt = heute >= von && heute <= bis ? `<span class="zeitachse__heute" data-a="${heute - von}" aria-hidden="true"></span>` : '';

  legende(za, d);
  flaeche.innerHTML = `<div class="zeitachse__inhalt" data-tage="${bis - von + 1}">${kopf(zoom, von, bis)}${abwZeile}${zeilen}${kap}${flaechen}${jetzt}</div>`;
  const inhalt = flaeche.firstElementChild;
  inhalt.style.setProperty('--za-tage', bis - von + 1);
  inhalt.style.setProperty('--za-wochenstart', (von - montag(von)));
  for (const el of inhalt.querySelectorAll('[data-a]')) {
    el.style.setProperty('--a', el.dataset.a);
    if (el.dataset.n) el.style.setProperty('--n', el.dataset.n);
    if (el.dataset.anteil) el.style.setProperty('--anteil', el.dataset.anteil);
  }
  if (!inhalt.querySelector('.zeitachse__woche[tabindex="0"]')) inhalt.querySelector('.zeitachse__woche')?.setAttribute('tabindex', '0');
  STAND_JE.set(za, { d, von, bis, heute, liste });
}

const STAND_JE = new WeakMap();
const tagPx = (flaeche) => { const i = flaeche.firstElementChild, spur = i?.querySelector('.zeitachse__spur'); return spur ? spur.offsetWidth / Number(i.dataset.tage) : 1; };

function zeige(za, tagNr, glatt) {
  const flaeche = za.querySelector('.zeitachse__flaeche');
  const s = STAND_JE.get(za);
  if (!flaeche || !s) return;
  const name = flaeche.querySelector('.zeitachse__name')?.offsetWidth || 0;
  const spur = flaeche.clientWidth - name;
  flaeche.scrollTo({ left: Math.max(0, (tagNr - s.von) * tagPx(flaeche) - spur / 4), behavior: glatt && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
}

function oeffne(za, el) {
  za.dispatchEvent(new CustomEvent('zeitachse-oeffnen', { bubbles: true, detail: { typ: el.dataset.typ, id: el.dataset.id } }));
}

document.addEventListener('click', (e) => {
  const za = e.target.closest?.('.zeitachse');
  if (!za) return;
  if (e.target.closest('[data-zeitachse-heute]')) { zeige(za, STAND_JE.get(za)?.heute, true); return; }
  const woche = e.target.closest('.zeitachse__woche');
  if (woche) {
    const w = STAND_JE.get(za)?.liste[Number(woche.dataset.woche)];
    if (w) za.dispatchEvent(new CustomEvent('zeitachse-woche', { bubbles: true, detail: { von: iso(w.von), bis: iso(w.bis), geplant: w.geplant, verfuegbar: w.verfuegbar, vorhaben: w.vorhaben } }));
    return;
  }
  const ziel = e.target.closest('.zeitachse__inhalt [data-typ][data-id]');
  if (ziel) oeffne(za, ziel);
});

document.addEventListener('change', (e) => {
  const za = e.target.closest?.('.zeitachse');
  if (!za || !e.target.closest('.zeitachse__zoom')) return;
  const flaeche = za.querySelector('.zeitachse__flaeche');
  const s = STAND_JE.get(za);
  const alt = tagPx(flaeche);
  const name = flaeche.querySelector('.zeitachse__name')?.offsetWidth || 0;
  const mitte = s.von + (flaeche.scrollLeft + (flaeche.clientWidth - name) / 2) / alt;
  zeichne(za, s.d);
  flaeche.scrollLeft = (mitte - s.von) * tagPx(flaeche) - (flaeche.clientWidth - name) / 2;
});

document.addEventListener('focusin', (e) => {
  const name = e.target.closest?.('.zeitachse__name[data-a], .zeitachse__meilenstein, .zeitachse__abwesenheit, .zeitachse__woche');
  const za = name?.closest('.zeitachse');
  const s = za && STAND_JE.get(za);
  if (!s || e.target.matches(':hover')) return;
  const flaeche = za.querySelector('.zeitachse__flaeche');
  const px = tagPx(flaeche);
  const nameB = flaeche.querySelector('.zeitachse__name')?.offsetWidth || 0;
  const x = Number(name.dataset.a) * px;
  if (x < flaeche.scrollLeft || x > flaeche.scrollLeft + flaeche.clientWidth - nameB - px * 7) zeige(za, s.von + Number(name.dataset.a), false);
});
document.addEventListener('keydown', (e) => {
  const woche = e.target.closest?.('.zeitachse__woche');
  if (!woche || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const alle = [...woche.parentElement.querySelectorAll('.zeitachse__woche')];
  const i = alle.indexOf(woche);
  const j = e.key === 'Home' ? 0 : e.key === 'End' ? alle.length - 1 : Math.max(0, Math.min(alle.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
  e.preventDefault();
  woche.tabIndex = -1;
  alle[j].tabIndex = 0;
  alle[j].focus();
});

const fertig = new WeakSet();
let zaehler = 0;
function einrichten(wurzel) {
  const treffer = [...(wurzel.matches?.('.zeitachse') ? [wurzel] : []), ...wurzel.querySelectorAll('.zeitachse')];
  for (const za of treffer) {
    if (fertig.has(za)) continue;
    fertig.add(za);
    if (!za.id) za.id = `zeitachse-${++zaehler}`;
    const d = lies(za);
    zeichne(za, d);
    const flaeche = za.querySelector('.zeitachse__flaeche');
    if (!flaeche) continue;
    const ro = new ResizeObserver(() => {
      if (!flaeche.clientWidth) return;
      ro.disconnect();
      zeige(za, STAND_JE.get(za)?.heute, false);
    });
    ro.observe(flaeche);
  }
}
einrichten(document);
document.addEventListener('inhalt-neu', (e) => einrichten(e.target instanceof Element ? e.target : document));

window.Zeitachse = {
  setzen(za, daten) {
    const quelle = za.querySelector(':scope > script[type="application/json"]');
    if (quelle) quelle.textContent = JSON.stringify(daten);
    fertig.add(za);
    const flaeche = za.querySelector('.zeitachse__flaeche');
    const links = flaeche?.scrollLeft;
    zeichne(za, daten);
    if (flaeche) flaeche.scrollLeft = links;
  },
  daten: (za) => STAND_JE.get(za)?.d,
};
})();

} catch (fehler) { console.warn("marke.js · system/zeitachse.js", fehler); } }
