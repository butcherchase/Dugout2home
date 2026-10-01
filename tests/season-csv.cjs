module.exports = async function ({ db, team, other, coach, parent, player, pending, otherCoach, roster, outside, check, setToken, renderPage }) {
  const { parseSeasonCsv, snapshotFeedback } = require('../lib/season-csv.ts');
  const { POST } = require('../app/api/season-csv/route.ts');
  const rows = [
    ['', '', '', 'Batting', '', '', '', '', '', '', '', 'Pitching', '', '', '', '', '', '', 'Fielding', '', '', ''],
    ['Number', 'Last', 'First', 'GP', 'PA', 'AB', 'H', 'BB', 'SO', 'R', 'RBI', 'GP', 'IP', 'H', 'BB', 'SO', 'R', 'ER', 'PO', 'A', 'E', 'TC'],
    ['7', 'Example', 'CSV Player', '4', '9', '8', '3', '1', '2', '3', '2', '2', '2.1', '4', '3', '5', '3', '2', '6', '2', '1', '9'],
    ['Totals', '', '', '4'], ['Glossary', '', '', 'GP=Games played']
  ];
  const csv = rows.map(r => r.map(v => '"'+v+'"').join(',')).join('\r\n');
  const parsed = parseSeasonCsv(csv);
  check(parsed.length === 1 && parsed[0].stats.batting.H === 3 && parsed[0].stats.pitching.H === 4, 'CSV repeated headers remain category-specific; totals and glossary excluded');
  check(parsed[0].stats.pitching.IP === 7, 'CSV 2.1 innings converts to seven outs');
  check(snapshotFeedback(parsed[0], 'pitching').strengths.join().includes('5 pitching strikeouts'), 'CSV feedback uses pitching strikeouts, not batting strikeouts');
  let invalid = false; try { parseSeasonCsv(csv.replace('"2.1"', '"2.7"')); } catch { invalid = true; }
  check(invalid, 'invalid innings rejected');
  const season = await db.season.create({ data: { teamId: team.id, name: 'CSV fixture season' } });
  const base = { action: 'preview', seasonId: season.id, csv, filename: 'test.csv', coverage: 'All games through October 1', categories: ['pitching', 'fielding'] };
  async function call(data, token = coach.token, origin = process.env.APP_URL) {
    setToken(token); const r = await POST(new Request(process.env.APP_URL+'/api/season-csv', { method: 'POST', headers: { origin }, body: JSON.stringify(data) })); return { status: r.status, body: await r.json() };
  }
  check((await call(base, '')).status === 401, 'CSV import requires sign-in');
  for (const a of [parent, player, pending]) check((await call(base, a.token)).status === 403, 'CSV import limited to approved coaches');
  check((await call(base, coach.token, 'https://bad.test')).status === 403, 'CSV import checks origin');
  check((await call(base, otherCoach.token)).status === 404, 'CSV import rejects cross-team season');
  check((await call(base)).status === 200, 'coach can preview CSV');
  check((await db.season.findUniqueOrThrow({ where: { id: season.id } })).csvSnapshot === null, 'preview does not save');
  const payload = { ...base, action: 'save', version: null, matches: [{ row: 0, playerId: roster.id }] };
  check((await call({ ...payload, matches: [{ row: 0, playerId: outside.id }] })).status === 400, 'cross-team roster match rejected');
  check((await call({ ...payload, matches: [] })).status === 400, 'incomplete matching rejected');
  const before = await db.game.count({ where: { teamId: team.id } });
  check((await call(payload)).status === 200, 'coach can save reviewed snapshot');
  const first = (await db.season.findUniqueOrThrow({ where: { id: season.id } })).csvSnapshot;
  check(first.players[0].playerId === roster.id && first.categories.join() === 'pitching,fielding', 'snapshot stores roster linkage and category choices');
  check((await call(payload)).status === 409, 'stale import cannot overwrite newer snapshot');
  check((await call({ ...payload, version: first.version, categories: ['batting'] })).status === 200, 'fresh import replaces prior snapshot');
  const second = (await db.season.findUniqueOrThrow({ where: { id: season.id } })).csvSnapshot;
  check(second.players.length === 1 && second.players[0].stats.batting.H === 3 && second.categories.join() === 'batting', 'replacement does not add cumulative counts and replaces categories');
  check(await db.game.count({ where: { teamId: team.id } }) === before, 'CSV import creates no games');
  const html = await renderPage('../app/players/page.tsx', { searchParams: Promise.resolve({ seasonId: season.id }) }, coach.token);
  check(html.includes('GameChanger cumulative statistics') && html.includes('CSV Player'), 'player development shows selected season snapshot');
  const filtered = await renderPage('../app/players/page.tsx', { searchParams: Promise.resolve({ seasonId: 'unassigned' }) }, coach.token);
  check(!filtered.includes('CSV Player'), 'season filter excludes unrelated snapshot');
};
