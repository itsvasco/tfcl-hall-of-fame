# Hall of Fame TFC Luzern: Daten und Werkzeuge

Podestplätze der Spieler mit heutiger Lizenz beim TFC Luzern (Verbandskürzel `LUZE`), in fünf Bereichen. Dieses Repo enthält die Daten und die Werkzeuge, die sie holen. Eine Seite gibt es noch nicht; sie folgt nach der Freigabe des Briefings und liest nur `daten/hall-of-fame.json`.

Die Werkzeuge nehmen den Club als Parameter und taugen für jeden Club des Verbands (`--club <Kürzel>`, dazu `clubname`, `clubliga_muster` und die Saisons in `daten/pflege.json`).

## Dateien

| Datei | Zweck |
|---|---|
| `daten/spieler.json` | Spieler mit heutiger Lizenz (Name, Schreibweisen), von `tools/spieler.mjs` geschrieben |
| `daten/pflege.json` | Pflegedatei: `nicht_nennen`, belegte Saisons und Turniere, Offenes |
| `daten/hall-of-fame.json` | Schnappschuss, einzige Datenquelle der künftigen Seite |
| `tools/spieler.mjs` | Holt die Lizenzen (`--club LUZE`) |
| `tools/erneuern.mjs` | Baut den Schnappschuss aus fünf Quellen (`--trocken` schreibt nichts) |
| `tools/erneuern-test.mjs` | Test mit festen Eingaben, kein Netz |
| `tools/datenschutz-pruefen.mjs` | Sucht in allen Commits und im Arbeitsstand nach IDs, Punkten, Kennungen, Mailadressen, Schlüsseln |
| `tools/holen.mjs`, `tools/coral.mjs`, `tools/gemeinsam.mjs` | Abrufe und Helfer |

## Befehle

```
npm install                         # pdfjs-dist und playwright-core (Coral braucht Google Chrome)
node tools/spieler.mjs --club LUZE  # Lizenzen holen, schreibt daten/spieler.json
node tools/erneuern.mjs             # Schnappschuss bauen (rund drei Minuten, Coral und Web-Archiv sind langsam)
node tools/erneuern-test.mjs        # Test
node tools/datenschutz-pruefen.mjs  # Datenschutz
```

Exit 1 heisst: eine Quelle ist nicht erreichbar oder hat ihr Format verändert. Der Schnappschuss bleibt dann unverändert. Es gibt keinen Hook und keinen Task; erneuert wird von Hand, am besten einmal im Jahr nach der Clubliga (Juni) und der Jahresrangliste (November).

## Regeln

1. **Mitglied heisst nur: heutige Lizenz `LUZE`.** Der Name steht heute mit `LUZE` in `memberships` der Rangliste auf tablesoccer.org (die Lizenz von heute, nicht die von damals). Keine Clubliste, keine Okapi-Liste. Stand 2026-11-20: 37 Spieler (die letzten zwei Saisons, alle Kategorien Official und Classic).
2. **Schweizermeisterschaft:** alle Podestplätze heutiger Mitglieder zählen, auch aus der Zeit vor der Lizenz. Doppelpartner ohne Lizenz stehen mit Namen beim Eintrag des Mitglieds, so wie der Verband sie führt; in den übrigen Bereichen stehen keine Partner und keine Nicht-Mitglieder.
3. **Nati:** nur Medaillen (Rang 1 bis 3) Schweizer Nationalteams, je Person im gemeldeten Kader (Coral nennt nicht, wer gespielt hat).
4. **Jahresrangliste:** nur Schlussstände. Laufende Stände zählen nie (Saison 2026/2027, Nr. 193, läuft). Nicht gezählt: Open Combined (322), Amateur Doppel (317) und Classic (`rule=2`).
5. **Clubliga:** je Team, ein Podestplatz ist eine Einheit. Personen stehen nur, wenn belegt; die Verbands-PDF nennt keine. Der Swiss Tablesoccer Cup zählt nicht.
6. **Fordere-Liga:** nur Division Luzern, nur der Finaltag (KO, `single_ko`), nie die Ligatabelle. Ein Team aus zwei Mitgliedern zählt für beide.
7. **Zählweise:** SM, Nati, Jahresrangliste und Fordere-Liga zählen je Person, die Clubliga je Team. Die Gesamtsumme im Schnappschuss (`gesamt`) addiert alle fünf.
8. **Jeder Eintrag trägt `quelle` (https, nie ein Spielerprofil) und `abgerufen` (JJJJ-MM-TT).** Keine Spieler-IDs, keine Punkte, keine Coral-Kennungen. `tools/datenschutz-pruefen.mjs` prüft das über alle Commits.
9. **`nicht_nennen`** in `daten/pflege.json`: Namen (jede Schreibweise) oder ids. Wer dort steht, fehlt im Schnappschuss, und bei anderen steht er nur als «Partner». Danach `node tools/erneuern.mjs`.
10. **Ändert sich eine Quelle**, bricht `erneuern.mjs` mit Exit 1 ab und schreibt nichts (fremde Kategorie, fremder Jahresschlüssel, Antwort ohne erwartete Teile, PDF nicht lesbar, Archivstände nicht gleich).

## Quellen

| Bereich | Quelle | Hinweis |
|---|---|---|
| Spieler | `https://api.tablesoccer.org/cms.rankings?tour=78&season=<Nr>&rule=<r>&category=<k>&member=LUZE` | letzte zwei Saisons aus `seasons`, alle Seiten |
| Schweizermeisterschaft | `https://api.swisstablesoccer.ch/hall-of-fame` | Anzeigeadresse `https://tournaments.swisstablesoccer.ch/hall-of-fame/`; Namen «Nachname Vorname» |
| Jahresrangliste ab 2025 | `cms.rankings` ohne `member`, Saisons 191 (2025) und 192 (2026) | Rang 1 bis 3 je Kategorie 312, 308, 314, 310, 316, 315, 311, 313, 309 |
| Jahresrangliste 2019, 2024 | Web-Archiv der alten Verbandsseite (`swisstablesoccer.ch/index.php/de/spielbetrieb/ranglisten`), Stände 20191016043842 (Schlussstand), 20241016032348 und 20250124021613 (stabil) | |
| Nati | Coral, öffentliche Turnierseite `https://app.tablesoccer.org/p/<Kurzname>`, gelesen mit Headless-Chrome | Turniere in `pflege.json` (`nati_turniere`) |
| Clubliga | `https://tournaments.swisstablesoccer.ch/assets/docs/stl/league-<Jahr>-standings.pdf` | 2017, 2018, 2019, 2023 bis 2026; Liga über die Lage der Überschrift gelesen |
| Fordere-Liga | `https://fordere.ch/api/seasons/<Nr>/final-day` | Division Luzern, Saisons 20, 24, 31, 33; Ränge aus den Spielen abgeleitet, `rang_quelle` sagt woher |

Vorbild für die Regeln und Ableitungen ist `kunden/tfcz/Ocsav/website/hall-of-fame/` (README und Skripte, nur gelesen).

## Stand 2026-11-20

Erster Lauf von `node tools/erneuern.mjs` am 2026-11-20 mit 37 Spielern: **80 Podestplätze (Gold 32, Silber 18, Bronze 30) bei 17 Personen**; darin zählen die 14 Clubliga-Podestplätze je Team.

| Bereich | Podestplätze | Gold | Silber | Bronze | Personen |
|---|---|---|---|---|---|
| Schweizermeisterschaft | 36 | 15 | 9 | 12 | 7 |
| Nati | 7 | 0 | 1 | 6 | 5 |
| Jahresrangliste | 6 | 4 | 0 | 2 | 4 |
| Clubliga | 14 | 6 | 4 | 4 | Teams |
| Fordere-Liga | 17 | 7 | 4 | 6 | 9 |

Die Zahlen stehen im Schnappschuss unter `gesamt` und `bereiche[].summe`; `node tools/erneuern.mjs --trocken` rechnet sie neu.

## Offen

Nicht belegt und darum nicht im Schnappschuss (jeweils auch unter `offen` im Schnappschuss, soweit ein Lauf es meldet):

1. **Kontaktadresse für Widerrufe** fehlt. Ohne sie darf keine Seite Personen zeigen. Sie kommt als `kontakt` in `daten/pflege.json`; nur diese Adresse lässt die Datenschutzprüfung durch.
2. **Einwilligung der gezeigten Personen** ist für den TFC Luzern nicht geklärt (beim TFCZ hat Vasco sie für den TFCZ entschieden). Die SM nennt Partner ohne Lizenz mit Namen.
3. **Jahresrangliste:** 2017, 2018, 2021, 2022 und alles vor 2017 liegen nur auf archivierten Spielerseiten (mit Verbandsnummern in der Adresse, hier nicht erlaubt). 2023: der Archivstand vom 2023-12-03 liegt vor dem Saisonende (10.12.2023), ein Schlussstand ist nicht belegt. 2020 gibt es als Saison nicht.
4. **«Felder Martin H.»** steht in der SM-API (2024 Herren Einzel Rang 1, 2024 Herren Doppel Rang 2, 2023 Herren Doppel Rang 1, 2015 Junioren Einzel und Doppel Rang 1) neben «Felder Martin» (2018 und 2025 Herren Einzel Rang 3, gezählt). Beide Namen stehen nie auf demselben Podest; das spricht weder für noch gegen dieselbe Person. Ob es dieselbe Person wie Martin Felder mit Lizenz ist, ist nicht belegt; die fünf Plätze zählen nicht, bis der Club es bestätigt. Danach braucht es ein Feld in `pflege.json`, das die Schreibweise der Person zuordnet; das ist noch nicht gebaut.
5. **Nati:** Turniere, die Coral nicht führt (Leonhart WS 2023, ITSF World Cups vor 2025, Europameisterschaften), und der Berliner Nationencup. Neue Turniere in `nati_turniere` eintragen und prüfen, dass die Seite Daten liefert.
6. **Clubliga:** keine Personen (die PDF nennt nur Teams). 2015/16 liefert 404; für 2020 bis 2022 gab es keine Austragung. Kein Teamname war unklar (Club «TFC Luzern» immer mit Luzern oder TFCL im Teamnamen).
7. **Fordere-Liga Luzern:** nicht gezählt sind «3/4. Liga» 2019/20 (zwei Ligen zusammengelegt, Podest mit Michele Sabbatini auf Rang 2) und der «Cup» 2021/22 (ein Spiel ohne Sieger). Saisons 2017/18 (Vorrunde ohne Spiele), 2020/21 (abgesagt), 2023/24 und 2025 (Finaltag leer) haben kein Podest. Andere Divisionen (Zürich, Winterthur, St. Gallen) gehören nicht zum Auftrag.
8. **Verbandsturniere vor der Coral-Zeit** (`daten/stf-archiv.json`, `tools/stf-archiv.mjs`): 2008 bis 2016 nicht ausgewertet (alte Verbandsseite im Web-Archiv, wechselnde Formate). 2017, 2018 und alle Turniere 2019 bis 2024 ohne archivierte Ergebnisseite stehen nur auf archivierten Spielerseiten (Verbandsnummer in der Adresse, hier nicht erlaubt); ihre Podeste sind in `zurueckgestellt` vermerkt (29 Plätze in 25 Zeilen, 28 von 11 Lizenzierten, 1 von Vasco, darunter Fordere.ch STS 2017 Neulinge Doppel Rang 1) und zählen nicht. Spieler, die auf keiner archivierten Ergebnisseite stehen, sind über Spielerseiten nicht gesucht. Martin Felder: alle Archivplätze unter seinem Namen gehören zu der Verbandsnummer, die die SM-Plätze von «Felder Martin H.» trägt (Finals 2024), darum nicht gezählt (`stf_nicht_zaehlen`).
