# Technik

Statische Seite ohne Server. Quelle der Seite ist nur der Schnappschuss `daten/hall-of-fame.json`.

- `tools/spieler.mjs --club LUZE`: heutige Lizenzen aus `api.tablesoccer.org/cms.rankings` (letzte zwei Saisons), schreibt `daten/spieler.json`. Stand 2026-11-20: 37 Spieler.
- `tools/erneuern.mjs`: baut den Schnappschuss aus SM (`api.swisstablesoccer.ch/hall-of-fame`), Jahresrangliste (cms.rankings 191/192, Web-Archiv 2019 und 2024), Nati (Coral über Headless-Chrome), Clubliga (Verbands-PDF), Fordere-Liga Luzern (`fordere.ch/api/seasons/<Nr>/final-day`). Pflege in `daten/pflege.json` (`nicht_nennen`, `kontakt`, `nicht_gleich`).
- `tools/erneuern-test.mjs` (ohne Netz), `tools/datenschutz-pruefen.mjs` (über alle Commits).
- `tools/fest.mjs`: schreibt Texte und Zahlen fest ins HTML und kopiert den Schnappschuss nach `site/daten/`.
- Marke in `marke/` (Kern 1.26.0 des Brand Systems), Seite `site/index.html`.
- Stand 2026-11-20: 80 Podestplätze (32/18/30), 17 Personen.
- Deploy: GitHub Pages (Vasco, 2026-11-20). Offen: Repo anlegen und Pages einschalten.
