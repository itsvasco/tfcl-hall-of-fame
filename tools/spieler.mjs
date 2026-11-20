#!/usr/bin/env node
// Holt die Spieler mit heutiger Lizenz eines Clubs und schreibt daten/spieler.json.
// Aufruf:  node tools/spieler.mjs [--club LUZE] [--ausgabe daten/spieler.json]
// Quelle:  GET https://api.tablesoccer.org/cms.rankings?tour=78&season=<Nr>&rule=<r>&category=<k>&member=<Club>
//          (die letzten zwei Saisons aus «seasons», alle Kategorien, alle Seiten). Gezählt wird nur, wer das Clubkürzel
//          in «memberships» trägt (die heutige Lizenz, nicht die von damals).
// Exit 0 = geschrieben, 1 = Quelle nicht erreichbar oder Antwort verändert (nichts geschrieben), 2 = falscher Aufruf.
// Vorbild: Ocsav/website/hall-of-fame/mitglieder-abgleich.mjs (lizenzen()).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TS, KATEGORIEN, QuelleVeraendert, holeJson, anzeigeName, slug, schluessel, heute, schreibeJson } from './gemeinsam.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));

// Gibt { spieler, saisons } zurück. spieler: Map Schlüssel -> { name, schreibweisen:Set }
export async function lizenzen(club, hole = holeJson) {
  const erste = await hole(`${TS}?tour=78&rule=1&category=308&member=${club}`);
  const saisons = (erste.seasons || []).map((s) => s.id).sort((a, b) => b - a).slice(0, 2);
  if (!saisons.length) throw new QuelleVeraendert('tablesoccer.org nennt keine Saison (Antwort verändert)');
  const spieler = new Map();
  for (const saison of saisons) for (const [rule, kats] of Object.entries(KATEGORIEN)) for (const kat of kats) {
    for (let seite = 1, seiten = 1; seite <= seiten; seite++) {
      const d = await hole(`${TS}?tour=78&season=${saison}&rule=${rule}&category=${kat}&member=${club}&page=${seite}`);
      if (d.member !== club || !Array.isArray(d.standings)) throw new QuelleVeraendert(`Filter member=${club} greift nicht (Antwort verändert)`);
      seiten = d.pages || 1;
      for (const s of d.standings) for (const t of s.team || []) {
        if (!Array.isArray(t.memberships) || typeof t.player !== 'string') throw new QuelleVeraendert('Eintrag ohne memberships oder player (Antwort verändert)');
        if (!t.memberships.includes(club)) continue;
        const k = schluessel(t.player);
        const e = spieler.get(k) || { name: anzeigeName(t.player), schreibweisen: new Set() };
        e.schreibweisen.add(t.player.trim());
        spieler.set(k, e);
      }
    }
  }
  return { spieler, saisons };
}

export function alsDatei(club, { spieler, saisons }, datum) {
  const liste = [...spieler.values()]
    .map((e) => ({ id: slug(e.name), name: e.name, schreibweisen: [...e.schreibweisen].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return {
    hinweis: `Spieler mit heutiger Lizenz beim Club ${club} (tablesoccer.org, memberships). Nur Namen, keine Kennungen.`,
    club, abgerufen: datum, saisons,
    quelle: `https://api.tablesoccer.org/cms.rankings?tour=78&member=${club}`,
    spieler: liste,
  };
}

async function haupt(argv) {
  let club = 'LUZE', ausgabe = path.join(HIER, '..', 'daten', 'spieler.json');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--club') club = argv[++i];
    else if (argv[i] === '--ausgabe') ausgabe = path.resolve(argv[++i]);
    else { console.error(`unbekannte Option ${argv[i]}`); return 2; }
  }
  if (!/^[A-Z0-9]{2,8}$/.test(club || '')) { console.error('Clubkürzel fehlt oder ungültig (Beispiel: --club LUZE)'); return 2; }
  try {
    const l = await lizenzen(club);
    const d = alsDatei(club, l, heute());
    schreibeJson(ausgabe, d);
    console.error(`Club ${club}: ${d.spieler.length} Spieler (Saisons ${l.saisons.join(', ')}) → ${ausgabe}`);
    return 0;
  } catch (f) { console.error(`Abbruch: ${f.message}. Nichts geschrieben.`); return 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await haupt(process.argv.slice(2)));
