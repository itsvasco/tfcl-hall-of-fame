// Holt ein Turnier aus Coral (app.tablesoccer.org/p/<Kurzname>) ohne Anmeldung: Headless-Chrome öffnet die öffentliche
// Seite und liest den Vue-Store, wie das Abrufskript im Skill tfcz-turnier-news (coral-holen.mjs). Es wird nichts
// anderes als die öffentliche Seite aufgerufen.
// Voraussetzung: Google Chrome und das Paket playwright-core (npm install).
import { chromium } from 'playwright-core';

// slugs: Liste Kurznamen. Gibt { slug: store | null } zurück; null heisst: Seite liefert keine Daten.
export async function holeTurniere(slugs) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const aus = {};
  try {
    for (const slug of slugs) {
      const page = await browser.newPage();
      try {
        await page.goto(`https://app.tablesoccer.org/p/${slug}`, { waitUntil: 'networkidle', timeout: 90000 });
        const ok = await page.waitForFunction(() => document.querySelector('#q-app')?.__vue__?.$store?.state?.tournament?.tournament?.code, null, { timeout: 30000 }).then(() => true, () => false);
        if (!ok) { aus[slug] = null; continue; }
        await page.waitForTimeout(2500);
        aus[slug] = await page.evaluate(() => {
          const s = document.querySelector('#q-app').__vue__.$store.state.tournament;
          return JSON.parse(JSON.stringify({
            tournament: { name: s.tournament.name, start_at: s.tournament.start_at, address: s.tournament.address, status: s.tournament.status },
            competitions: Object.fromEntries(Object.entries(s.competitions || {}).map(([k, c]) => [k, { id: c.id, name: c.name, status: c.status, team_category: c.team_category && { short_name: c.team_category.short_name, player_count: c.team_category.player_count }, standings: c.settings && c.settings.standings }])),
            teams: Object.fromEntries(Object.entries(s.teams || {}).map(([k, t]) => [k, { id: t.id, rename: t.rename, name: t.name, lineup: t.lineup, land: t.organization && t.organization.country_code, art: t.organization && t.organization.geo_type }])),
            team_players_index: s.team_players_index, competition_players: s.competition_players,
            players: Object.fromEntries(Object.entries(s.players || {}).map(([k, p]) => [k, { id: p.id, first_name: p.first_name, last_name: p.last_name, nationality: p.nationality }])),
          }));
        });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  return aus;
}
