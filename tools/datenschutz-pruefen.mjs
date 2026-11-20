#!/usr/bin/env node
// Prüft das ganze Repo, jeden Commit aller Zweige (git log --all -p) und den Arbeitsstand, auf Daten, die nie hineingehören:
// Spieler-IDs, Punkte, Coral-Kennungen, Mailadressen ausser der Kontaktadresse, Schlüssel.
// Aufruf: node tools/datenschutz-pruefen.mjs   (Exit 0 = 0 Treffer, 1 = Treffer, 2 = Aufruf oder Git-Fehler)
// Vor einem Commit mit git add vormerken, dann prüfen: der Arbeitsstand umfasst alle verfolgten Dateien.
// Die Muster stehen hier zerlegt, damit diese Datei sich nicht selbst trifft.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const z = (...teile) => teile.join('');

// Mailadressen: erlaubt ist nur, was in pflege.json unter «kontakt» steht (heute: keine) und die Mitautor-Zeile des Commits.
let pflege = {}; try { pflege = JSON.parse(fs.readFileSync(path.join(WURZEL, 'daten', 'pflege.json'), 'utf8')); } catch { /* ohne Pflegedatei keine erlaubte Adresse */ }
const ERLAUBTE_MAILS = new Set([...(pflege.kontakt ? [].concat(pflege.kontakt) : []), z('noreply', '@', 'anthropic.com')].map((m) => m.toLowerCase()));

// Regeln für jede Datei
const ALLE = [
  { name: 'Mailadresse', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, erlaubt: (t) => ERLAUBTE_MAILS.has(t.toLowerCase()) || /@example\.(com|org|net)$/i.test(t) },
  { name: 'Schlüssel oder Token', re: new RegExp([z('s', 'k-[A-Za-z0-9]{20,}'), z('gh', 'p_[A-Za-z0-9]{20,}'), z('AK', 'IA[0-9A-Z]{16}'), z('ey', 'J[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{10,}'), z('-----BEGIN', ' [A-Z ]*PRIVATE KEY'), z('(?:api|secret)[_-]?', 'key["\']?\\s*[:=]\\s*["\'][^"\']{8,}')].join('|'), 'gi') },
  { name: 'Spielerprofil als Quelle', re: new RegExp([z('task=spieler', '_details'), z('p4p', 'placements'), z('s3\\.tablesoccer', '\\.org/person'), z('/spieler', '/\\d+')].join('|'), 'gi') },
  { name: 'Zahlen-ID als Feld', re: /"(?:id|spieler_id|player_id|playerId|verbandsnummer)"\s*:\s*\d+/gi },
];
// Zusätzlich für Daten und Texte (nicht für Code, der die Feldnamen lesen muss)
const DATEN = [
  { name: 'Feld mit Punkten', re: /"(?:points|punkte|punktzahl|score|points_total)"\s*:/gi },
  { name: 'Punkte im Text', re: /\b\d{3,5}\s+Punkte\b/g },
  { name: 'Coral-Kennung oder Lizenzcode als Wert', re: /"(?:code|player_code|license|lizenz|lizenznummer|memberships|image)"\s*:/gi },
  { name: 'Kennung aus sechs Zeichen mit Ziffer', re: /"(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6}"/g },
  { name: 'Bild der Verbandsplattform', re: new RegExp(z('s3\\.', 'tablesoccer\\.org'), 'gi') },
];
const istDaten = (datei) => /^daten\//.test(datei) || /\.md$/.test(datei);
const ausnahme = (datei) => datei === 'package-lock.json' || /\.(zip|png|jpe?g|webp|gif|ico|woff2?|ttf|pdf)$/i.test(datei);

function git(args) { return execFileSync('git', args, { cwd: WURZEL, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }

function pruefeZeile(datei, zeile, herkunft, treffer) {
  for (const r of [...ALLE, ...(istDaten(datei) ? DATEN : [])]) {
    r.re.lastIndex = 0;
    for (const m of zeile.matchAll(r.re)) if (!(r.erlaubt && r.erlaubt(m[0]))) treffer.push(`${herkunft} ${datei}: ${r.name} («${m[0].slice(0, 40)}»)`);
  }
}

export function pruefeText(text, datei, herkunft = 'Text') { const t = []; for (const zeile of text.split('\n')) pruefeZeile(datei, zeile, herkunft, t); return t; }

function main() {
  const treffer = [];
  let hatCommits = true;
  try { git(['rev-parse', '--verify', 'HEAD']); } catch { hatCommits = false; }
  let commits = 0;
  if (hatCommits) {
    // Commit-Nachrichten und Diffs, ohne Autorenzeilen (die tragen die Mailadresse des Autors, nicht des Repos)
    const log = git(['log', '--all', '-p', '--no-color', '--format=@@COMMIT %h%n%s%n%b']);
    let herkunft = 'Commit'; let datei = 'Nachricht';
    for (const zeile of log.split('\n')) {
      if (zeile.startsWith('@@COMMIT ')) { herkunft = `Commit ${zeile.slice(9)}`; datei = 'Nachricht'; commits++; continue; }
      const d = /^diff --git a\/(.+?) b\/(.+)$/.exec(zeile); if (d) { datei = d[2]; continue; }
      if (ausnahme(datei)) continue;
      if (/^(\+\+\+|---) /.test(zeile)) continue;
      pruefeZeile(datei, zeile, herkunft, treffer);
    }
  }
  // Arbeitsstand: alle verfolgten Dateien (auch eben mit git add vorgemerkte); Fremdes, das nicht im Repo liegt, bleibt aussen vor
  const dateien = git(['ls-files']).split('\n').filter(Boolean);
  for (const d of dateien) {
    if (ausnahme(d) || !fs.existsSync(path.join(WURZEL, d))) continue;
    const inhalt = fs.readFileSync(path.join(WURZEL, d), 'utf8');
    for (const zeile of inhalt.split('\n')) pruefeZeile(d, zeile, 'Arbeitsstand', treffer);
  }
  const eindeutig = [...new Set(treffer)];
  console.log(`${commits} Commits und ${dateien.length} Dateien geprüft: ${eindeutig.length} Treffer`);
  for (const t of eindeutig) console.log(`  ${t}`);
  return eindeutig.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exit(main()); } catch (f) { console.error(`Abbruch: ${f.message}`); process.exit(2); }
}
