# Briefing: Hall of Fame TFC Luzern

Fall: kurz
Güterart: erfahrung

## Leser
Mitglieder und Vorstand des Tischfussball Club Luzern, dazu Gäste, denen der Club die Adresse
weitergibt. Sie kennen die Spieler und den Verband, wollen sehen, wer was gewonnen hat, und den
eigenen Namen finden. Angesprochen mit «du».

## Angebot
Eine Seite mit allen Podestplätzen der Spieler, die heute eine Lizenz beim TFC Luzern haben:
Schweizermeisterschaft, Jahresrangliste, Nati, Clubliga, Fordere-Liga Luzern. Turniere folgen
in einem zweiten Schritt.

## Problem
Die Erfolge stehen verstreut bei Verband, Coral, Liga-PDFs und fordere.ch. Niemand im Club sieht
auf einen Blick, wie viele Pokale die heutigen Spieler zusammen geholt haben.

## Lösung
Eine Gesamtzahl oben, darunter eine Rangliste je Person mit dem höchsten Titel unter dem Namen,
Filter je Bereich, jeder Eintrag mit Link zur Quelle. Aufbau wie die Hall of Fame des TFCZ
(Referenz `tfcz.ch/hall-of-fame`), ohne dessen Marke.

## Preise
Keine. Die Seite verkauft nichts.

## Belege
Jede Zahl kommt aus dem Schnappschuss `daten/hall-of-fame.json`, jeder Eintrag verlinkt die
Verbandsquelle. Keine Punkte, keine Spieler-IDs.

## Bilder
Logo und Farben des TFC Luzern, von seiner Website geholt (Vasco, 2026-11-20: «nimm das Logo von
ihnen und die Farben»). Keine Fotos; Gesamtzahl und Podest tragen den Einstieg.

Quelle des Logos (geholt am 2026-11-20): Schild «TFCL Tischfussballclub Luzern» von
https://www.tfcluzern.com (Kopfzeile, Squarespace-Bild `IMG_20230504_213754_335.png`,
https://images.squarespace-cdn.com/content/v1/64511d55bc876d7e106ea828/a58a86da-86c4-4c2e-9ec9-64371184b9c2/IMG_20230504_213754_335.png).
Die Datei ist ein Raster (WebP, 621 x 835 px, transparenter Grund), kein SVG; sie liegt neu kodiert ohne EXIF
als `site/bilder/tfcl-logo.webp` (540 px) und `site/bilder/tfcl-logo-klein.webp` (96 px). Favicon und
Touch-Symbol sind daraus abgeleitet. Die Rechte am Logo hat der Club. Farben: Blau #0871B5 und Weiss aus dem
Schild (häufigster Pixelwert), Schwarz und Marineblau (`hsl(218.18, 37.29%, 23.14%)`) aus der Website des Clubs
(Squarespace-Farbvariablen `--accent-hsl` und `--darkAccent-hsl`). Blau ist der einzige Akzent der Marke
(`marke/marke.json`).

## Hauptaktion
Den eigenen Namen in der Rangliste finden (Suche und Filter).

Zwei Ausgänge mit Augenzwinkern (Vasco, 2026-11-20):
1. Im Fuss Vasco als Kontakt, Ton etwa «Wollt ihr auch so eine coole Seite? Sprecht mit mir.»
   Dieselbe Adresse gilt für Spieler, die nicht erscheinen wollen.
2. Ganz unten ein CTA zur Hall of Fame des TFCZ, Ton etwa «Wer die wahren Champions sehen will:
   hier entlang.»

## Quellen
`Ocsav/website/hall-of-fame/README.md`, `Ocsav/website/site/tfcz-hall-of-fame.html`,
Kapitel nach `npm run kapitel -- --fuer seite` (Teile 2 bis 6).

## Einwilligung
Der Club hat Vasco um die Seite gebeten (Vasco, 2026-11-20: «sie haben mich drum gebeten»).
Widerruf über Vasco als Kontakt im Fuss, Eintrag in `nicht_nennen`.

## Freigabe
Vasco, 2026-11-20: freigegeben («Mach einfach»). Erlaubt nach aussen: «TFC Luzern», «Tischfussball Club Luzern»,
die Namen der Spieler mit Lizenz, «TFCZ» und der Link zur Hall of Fame des TFCZ, Vasco als Kontakt.
