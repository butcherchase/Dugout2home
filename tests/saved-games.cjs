// Actual route/page code + disposable PostgreSQL. Only Next's request-context
// helpers are mocked; queries, authorization, validation and transactions are real.
// DATABASE_URL must point to a migrated local test database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const root = path.resolve(__dirname, '..');
if (!process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Use a disposable local DATABASE_URL.');
process.env.APP_URL = 'http://localhost:3100';
let cookieToken = '';
let aiFixture;
const aiCalls = [], practiceCalls = [];
const originalLoad = Module._load, originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, ...args) {
  if (name === 'server-only') return {};
  if (name === 'next/headers') return { cookies: async () => ({ get: () => cookieToken ? { value: cookieToken } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  if (name === '@/lib/ai') return {
    analyzeScorebook: async (input, team) => { aiCalls.push({ input, team }); return aiFixture; },
    buildPracticePlan: async input => { practiceCalls.push(input); return { title: 'Mock practice', durationMinutes: input.durationMinutes, focus: [], blocks: [], coachNotes: [] }; }
  };
  return originalLoad.call(this, name, ...args);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const text = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
};
const { POST } = require('../app/api/games/route.ts');
const { db: appDb } = require('../lib/db.ts');
const { combinedPriorities, totalStats, recordFor, dateSchema, readAnalysis } = require('../lib/game-data.ts');
const { assignTournament, createTournament } = require('../app/recaps/actions.ts');
const db = new PrismaClient();
const stamp = Date.now();
const users = [], teams = [];
let checks = 0;
function check(value, label) { assert(value, label); console.log('PASS:', label); checks++; }
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
async function account(teamId, role, status = 'APPROVED') {
  const user = await db.user.create({ data: { email: `${role}-${status}-${stamp}-${users.length}@example.test`, activeTeamId: teamId, memberships: { create: { teamId, role, status } } } });
  users.push(user.id);
  const token = crypto.randomBytes(32).toString('hex');
  await db.session.create({ data: { tokenHash: hash(token), userId: user.id, expiresAt: new Date(Date.now() + 600000) } });
  return { user, token };
}
async function save(input, token, origin = process.env.APP_URL) {
  cookieToken = token;
  const response = await POST(new Request(process.env.APP_URL + '/api/games', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(input) }));
  return { status: response.status, body: await response.json() };
}
async function action(fn, data, token) {
  cookieToken = token;
  const form = new FormData(); for (const [key, value] of Object.entries(data)) form.set(key, value);
  try { await fn(form); return ''; } catch (error) { if (error.digest?.startsWith('NEXT_REDIRECT')) return error.digest; throw error; }
}
async function renderPage(file, props, token) {
  cookieToken = token;
  const page = await require(file).default(props);
  return require('react-dom/server').renderToStaticMarkup(page);
}

async function run() {
  const team = await db.team.create({ data: { name: `Saved games ${stamp}`, ageGroup: '14U' } }); teams.push(team.id);
  const other = await db.team.create({ data: { name: `Other games ${stamp}` } }); teams.push(other.id);
  const coach = await account(team.id, 'COACH'), admin = await account(team.id, 'TEAM_ADMIN');
  const parent = await account(team.id, 'PARENT'), player = await account(team.id, 'PLAYER'), pending = await account(team.id, 'COACH', 'PENDING'), rejected = await account(team.id, 'COACH', 'REJECTED');
  const otherCoach = await account(other.id, 'TEAM_ADMIN');
  const roster = await db.player.create({ data: { teamId: team.id, firstName: 'Matched', lastName: 'Player', positions: [] } });
  const outside = await db.player.create({ data: { teamId: other.id, firstName: 'Outside', positions: [] } });
  const outsideTournament = await db.tournament.create({ data: { teamId: other.id, name: 'Outside tournament' } });
  const line = { player: 'Matched Player', plateAppearances: 4, hits: 2, walks: 1, strikeouts: 1, runs: 1, rbi: 2, notes: ['TEST_GAME_EVIDENCE'] };
  const analysis = { opponent: 'Extracted opponent', gameDate: 'unclear', score: { us: 1, them: 2 }, confidence: .8, summary: 'TEST_GAME_RECAP', excelledAt: ['Accurate throws'], workOn: ['Situational hitting'], events: [], playerSummaries: [line, { ...line, player: 'New Player' }, { ...line, player: 'Opponent Row' }], priorities: [{ area: 'hitting', level: 'high', evidence: 'Runners left on base', recommendation: 'Practice productive outs' }] };
  const input = { teamId: team.id, sourceHash: hash(`file-${stamp}`), opponent: 'Reviewed Opponent', gameDate: '2026-09-29', runsFor: 5, runsAgainst: 3, tournamentId: '', newTournamentName: 'Fall Tournament', analysis, playerTargets: [roster.id, 'new', 'skip'] };

  check((await save(input, '')).status === 401, 'guest save denied');
  for (const a of [parent, player, pending, rejected]) check((await save(input, a.token)).status === 403, 'non-coach or unapproved save denied');
  check((await save(input, coach.token, 'https://attacker.test')).status === 403, 'cross-origin save denied');
  check((await save(input, otherCoach.token)).status === 409, 'stale or cross-team save denied');
  check((await save({ ...input, gameDate: '2026-02-30' }, coach.token)).status === 400, 'invalid calendar date denied');
  check((await save({ ...input, runsFor: -1 }, coach.token)).status === 400, 'negative score denied');
  check((await save({ ...input, playerTargets: [roster.id] }, coach.token)).status === 400, 'missing roster decisions denied');
  check((await save({ ...input, playerTargets: [roster.id, roster.id, 'skip'] }, coach.token)).status === 400, 'same player cannot receive two scorebook lines');
  check((await save({ ...input, playerTargets: [outside.id, 'skip', 'skip'] }, coach.token)).status === 400, 'cross-team roster match denied');
  check((await save({ ...input, tournamentId: outsideTournament.id, newTournamentName: '' }, coach.token)).status === 400, 'cross-team tournament denied');
  check((await save({ ...input, playerTargets: ['new', 'skip', 'skip'] }, coach.token)).status === 400, 'existing name cannot create a duplicate roster player');
  check(await db.game.count({ where: { teamId: team.id } }) === 0 && await db.tournament.count({ where: { teamId: team.id } }) === 0, 'rejected saves leave no games or tournaments');
  // Prove transaction rollback after a game/tournament/new player has been created.
  const trigger = `test_save_${stamp}`;
  await db.$executeRawUnsafe(`CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."runs" = 999 THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER ${trigger} BEFORE INSERT ON "PlayerGameLine" FOR EACH ROW EXECUTE FUNCTION ${trigger}()`);
  try {
    const failure = await save({ ...input, analysis: { ...analysis, playerSummaries: [{ ...line, player: 'Rollback Player', runs: 999 }] }, playerTargets: ['new'] }, coach.token);
    check(failure.status === 500, 'database write failure returns a retryable error');
    check(await db.game.count({ where: { teamId: team.id } }) === 0 && await db.tournament.count({ where: { teamId: team.id } }) === 0 && await db.player.count({ where: { teamId: team.id } }) === 1, 'transaction rolls back game, tournament, and new roster player together');
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER ${trigger} ON "PlayerGameLine"`);
    await db.$executeRawUnsafe(`DROP FUNCTION ${trigger}()`);
  }
  const first = await save(input, coach.token);
  check(first.status === 201, 'coach saves reviewed game');
  const game = await db.game.findUniqueOrThrow({ where: { id: first.body.id }, include: { playerLines: true, tournament: true } });
  check(game.opponent === 'Reviewed Opponent' && game.runsFor === 5 && game.runsAgainst === 3 && game.playedAt.toISOString() === '2026-09-29T00:00:00.000Z', 'reviewed date, opponent, and scores persist');
  check(game.aiSummary.opponent === game.opponent && game.aiSummary.score.us === 5, 'saved analysis metadata agrees with reviewed values');
  check(game.playerLines.length === 2 && !game.playerLines.some(p => p.playerId === outside.id), 'matched and created players receive results; skipped rows do not');
  check(await db.player.count({ where: { teamId: team.id } }) === 2, 'new roster player created once');
  check(game.tournament.name === 'Fall Tournament', 'tournament created and assigned in save');
  const duplicate = await save(input, coach.token);
  check(duplicate.status === 200 && duplicate.body.duplicate && duplicate.body.id === game.id, 'repeat upload returns existing game');
  const secondInput = { ...input, sourceHash: hash(`second-${stamp}`), opponent: 'Second Opponent', gameDate: '2026-09-30', runsFor: 2, runsAgainst: 2, newTournamentName: 'fall tournament', analysis: { ...analysis, playerSummaries: [line] }, playerTargets: [roster.id] };
  // All requests use the same session; the real database serializes concurrent saves.
  const simultaneous = await Promise.all([save(secondInput, admin.token), save(secondInput, admin.token), save(secondInput, admin.token)]);
  check(simultaneous.filter(r => r.status === 201).length === 1 && simultaneous.filter(r => r.body.duplicate).length === 2, 'concurrent retries save one game only');
  check(await db.tournament.count({ where: { teamId: team.id } }) === 1, 'case-insensitive tournament name reused');
  const games = await db.game.findMany({ where: { teamId: team.id }, include: { playerLines: true } });
  const stats = totalStats(games.flatMap(g => g.playerLines).filter(l => l.playerId === roster.id));
  check(stats.hits === 4 && stats.plateAppearances === 8 && stats.rbi === 4, 'player totals reflect each saved game exactly once');
  check(recordFor(games) === '1–0–1', 'tournament record handles wins and ties');
  check(combinedPriorities(games)[0].games === 2, 'practice priority frequency counts distinct games');
  check(!dateSchema.safeParse('2026-02-30').success && readAnalysis({ unrelated: true }) === null, 'malformed legacy analysis handled safely');
  const playersHtml = await renderPage('../app/players/page.tsx', {}, coach.token);
  check(playersHtml.includes('TEST_GAME_EVIDENCE') && playersHtml.includes('Reviewed Opponent') && playersHtml.includes('New Player'), 'Players renders saved results and game evidence');
  const dashboard = await renderPage('../app/dashboard/page.tsx', {}, coach.token);
  check((dashboard.match(/class="flow-arrow"/g) || []).length === 3 && dashboard.includes('One saved game connects to all three'), 'dashboard renders three arrows from analyzer');
  const detail = await renderPage('../app/recaps/games/[id]/page.tsx', { params: Promise.resolve({ id: game.id }) }, coach.token);
  check(detail.includes('TEST_GAME_RECAP') && detail.includes('Results included in player totals') && detail.includes('Opponent Row'), 'saved game reopens full recap including skipped source rows');
  const recaps = await renderPage('../app/recaps/page.tsx', { searchParams: Promise.resolve({ q: 'Reviewed' }) }, coach.token);
  check(recaps.includes('Reviewed Opponent') && !recaps.includes('Second Opponent'), 'opponent search filters saved games');
  const dateFilter = await renderPage('../app/recaps/page.tsx', { searchParams: Promise.resolve({ date: '2026-09-30' }) }, coach.token);
  check(!dateFilter.includes('Reviewed Opponent') && dateFilter.includes('Second Opponent'), 'date filter selects matching games');
  const tournament = await renderPage('../app/recaps/tournaments/[id]/page.tsx', { params: Promise.resolve({ id: game.tournamentId }) }, coach.token);
  check(tournament.includes('Second Opponent') && tournament.includes('Reviewed Opponent') && tournament.includes('Tournament player totals'), 'tournament page includes both games and totals');
  const practice = await renderPage('../app/practice/page.tsx', { searchParams: Promise.resolve({ tournamentId: game.tournamentId }) }, coach.token);
  check(practice.includes('Practice productive outs') && !practice.includes('Example content'), 'practice page loads stored tournament priorities');
  const family = await renderPage('../app/my-player/page.tsx', {}, parent.token);
  check(!family.includes('TEST_GAME_EVIDENCE') && !family.includes('TEST_GAME_RECAP'), 'unshared game evidence does not leak to family view');
  for (const [file, id] of [['../app/recaps/games/[id]/page.tsx', game.id], ['../app/recaps/tournaments/[id]/page.tsx', game.tournamentId]]) {
    let denied = false; try { await renderPage(file, { params: Promise.resolve({ id }) }, otherCoach.token); } catch (e) { denied = e.digest?.includes('404'); }
    check(denied, 'cross-team detail URL returns not found');
  }
  const before = game.tournamentId;
  await action(assignTournament, { gameId: game.id, tournamentId: outsideTournament.id }, coach.token);
  check((await db.game.findUniqueOrThrow({ where: { id: game.id } })).tournamentId === before, 'cross-team reassignment rejected');
  await action(assignTournament, { gameId: game.id, tournamentId: '' }, coach.token);
  check((await db.game.findUniqueOrThrow({ where: { id: game.id } })).tournamentId === null, 'game can become standalone without losing stats');
  await action(assignTournament, { gameId: game.id, tournamentId: before }, coach.token);
  check((await db.game.findUniqueOrThrow({ where: { id: game.id } })).tournamentId === before, 'existing game can be assigned to tournament');
  await action(createTournament, { name: 'Empty tournament' }, coach.token);
  const empty = await db.tournament.findFirstOrThrow({ where: { teamId: team.id, name: 'Empty tournament' } });
  const emptyPage = await renderPage('../app/recaps/tournaments/[id]/page.tsx', { params: Promise.resolve({ id: empty.id }) }, coach.token);
  check(emptyPage.includes('Your tournament is ready'), 'standalone tournament creation has useful empty state');
  // Preserve upload routing and team context without sending real AI requests.
  process.env.OPENAI_API_KEY = 'local-test-only'; aiFixture = analysis;
  const analyze = require('../app/api/analyze/route.ts').POST;
  const practiceApi = require('../app/api/practice-plan/route.ts').POST;
  cookieToken = admin.token;
  for (const [name, type, data, kind] of [['test.csv', 'text/csv', 'name,hits\nPlayer,2', 'csv'], ['test.pdf', 'application/pdf', '%PDF-test', 'pdf'], ['test.png', 'image/png', 'test-png', 'image']]) {
    const form = new FormData(); form.set('scorebook', new Blob([data], { type }), name);
    const response = await analyze(new Request(process.env.APP_URL + '/api/analyze', { method: 'POST', headers: { origin: process.env.APP_URL }, body: form }));
    const body = await response.json();
    check(response.status === 200 && body.sourceHash === hash(data) && body.teamId === team.id, `${kind} upload returns stable file identity and correct team`);
    check(aiCalls.at(-1).input.kind === kind && aiCalls.at(-1).team === team.name, `${kind} analysis preserves upload branch and team perspective`);
  }
  const planResponse = await practiceApi(new Request(process.env.APP_URL + '/api/practice-plan', { method: 'POST', headers: { origin: process.env.APP_URL, 'content-type': 'application/json' }, body: JSON.stringify({ priorities: analysis.priorities, durationMinutes: 75, ageGroup: '8U', teamId: team.id }) }));
  check(planResponse.status === 200 && practiceCalls.at(-1).ageGroup === '14U', 'practice API uses saved team age group');
  const changedTeam = await practiceApi(new Request(process.env.APP_URL + '/api/practice-plan', { method: 'POST', headers: { origin: process.env.APP_URL, 'content-type': 'application/json' }, body: JSON.stringify({ priorities: analysis.priorities, durationMinutes: 75, teamId: other.id }) }));
  check(changedTeam.status === 409, 'practice API rejects a stale active-team selection');
  await require('./team-workflows.cjs')({ db, team, other, coach, admin, parent, player, pending, otherCoach, roster, outside, game, input, line, analysis, save, action, renderPage, check, hash, stamp, setToken: token => { cookieToken = token; } });
  await db.teamMember.updateMany({ where: { userId: coach.user.id }, data: { status: 'REJECTED' } });
  check((await save({ ...input, sourceHash: hash('revoked') }, coach.token)).status === 403, 'revoked coach loses save permission on existing session');
  console.log(`ALL ${checks} SAVED-GAME CHECKS PASSED`);
  // HTML snapshots are local test artifacts only, not production data.
  if (process.env.D2H_SNAPSHOT_DIR) {
    fs.mkdirSync(process.env.D2H_SNAPSHOT_DIR, { recursive: true });
    const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
    for (const [name, html] of Object.entries({ dashboard, detail, tournament, practice })) fs.writeFileSync(path.join(process.env.D2H_SNAPSHOT_DIR, name + '.html'), `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await db.team.deleteMany({ where: { id: { in: teams } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await appDb.$disconnect(); await db.$disconnect();
});
