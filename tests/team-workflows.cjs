// Runs from saved-games.cjs against a disposable local PostgreSQL database.
module.exports = async function (t) {
  const { db, team, other, coach, admin, parent, player, pending, otherCoach, roster, outside, game, input, line, analysis, save, action, renderPage, check, hash, stamp, setToken } = t;
  await require('./under13-disclosure.cjs')(t);
  const { createSeason, assignSeason, assignTournament, createTournament } = require('../app/recaps/actions.ts');
  const { metricTotal, readDetails } = require('../lib/player-details.ts');
  const { lossPatterns } = require('../lib/game-trends.ts');
  const { playerEmailDraft } = require('../lib/player-email.ts');
  await action(createSeason, { teamId: team.id, name: 'Fall 2026' }, coach.token);
  await action(createSeason, { teamId: team.id, name: 'fall 2026' }, coach.token);
  check(await db.season.count({ where: { teamId: team.id } }) === 1, 'season names reuse case-insensitive matches');
  const season = await db.season.findFirstOrThrow({ where: { teamId: team.id } });
  const alien = await db.season.create({ data: { teamId: other.id, name: 'Other season' } });
  await action(createSeason, { teamId: other.id, name: 'Stale' }, coach.token);
  check(await db.season.count({ where: { name: 'Stale', teamId: team.id } }) === 0, 'stale active-team season form rejected');
  for (const account of [parent, player, pending]) {
    await action(createSeason, { teamId: team.id, name: 'Forbidden' }, account.token);
    check(await db.season.count({ where: { teamId: team.id, name: 'Forbidden' } }) === 0, 'only approved coaches create seasons');
  }
  await action(assignSeason, { teamId: team.id, tournamentId: game.tournamentId, seasonId: season.id }, coach.token);
  check((await db.tournament.findUniqueOrThrow({ where: { id: game.tournamentId } })).seasonId === season.id && await db.game.count({ where: { tournamentId: game.tournamentId, seasonId: { not: season.id } } }) === 0, 'moving a tournament moves all its games into the same season');
  check(await db.game.count({ where: { tournamentId: game.tournamentId, seasonId: season.id } }) === 2, 'season move retains both existing games');
  await action(assignSeason, { teamId: team.id, tournamentId: game.tournamentId, seasonId: alien.id }, coach.token);
  check((await db.tournament.findUniqueOrThrow({ where: { id: game.tournamentId } })).seasonId === season.id, 'cross-team season cannot receive tournament');
  await action(assignSeason, { teamId: other.id, tournamentId: game.tournamentId, seasonId: alien.id }, otherCoach.token);
  check((await db.tournament.findUniqueOrThrow({ where: { id: game.tournamentId } })).seasonId === season.id, 'cross-team tournament cannot be moved');
  await action(assignSeason, { teamId: team.id, gameId: game.id, seasonId: '' }, coach.token);
  check((await db.game.findUniqueOrThrow({ where: { id: game.id } })).seasonId === season.id, 'tournament game cannot diverge from tournament season');
  await action(assignTournament, { teamId: team.id, gameId: game.id, tournamentId: '' }, coach.token);
  await action(assignSeason, { teamId: team.id, gameId: game.id, seasonId: '' }, coach.token);
  check((await db.game.findUniqueOrThrow({ where: { id: game.id } })).seasonId === null, 'standalone game can move to unassigned');
  await action(assignTournament, { teamId: team.id, gameId: game.id, tournamentId: game.tournamentId }, coach.token);
  check((await db.game.findUniqueOrThrow({ where: { id: game.id } })).seasonId === season.id, 'adding a game inherits tournament season');
  await action(createTournament, { teamId: team.id, name: 'Alien', seasonId: alien.id }, coach.token);
  check(await db.tournament.count({ where: { teamId: team.id, name: 'Alien' } }) === 0, 'new tournament rejects cross-team season');
  const details = { pitching: { outs: 7, hitsAllowed: 2, walksAllowed: 1, strikeouts: 4, runsAllowed: 1, earnedRuns: null }, fielding: { putouts: null, assists: 0, errors: null }, hittingFeedback: { strengths: ['Drove a ball into the gap'], focus: ['Work on two-strike contact'] }, pitchingFeedback: { strengths: ['Four strikeouts recorded'], focus: [] }, fieldingFeedback: { strengths: [], focus: [] } };
  const newInput = { ...input, sourceHash: hash('new-details-' + stamp), seasonId: season.id, newTournamentName: '', tournamentId: game.tournamentId, opponent: 'Loss opponent', runsFor: 1, runsAgainst: 4, analysis: { ...analysis, playerSummaries: [{ ...line, details }] }, playerTargets: [roster.id] };
  check((await save({ ...newInput, seasonId: alien.id }, coach.token)).status === 400, 'saving game rejects alien season');
  const spring = await db.season.create({ data: { teamId: team.id, name: 'Spring 2027' } });
  check((await save({ ...newInput, seasonId: spring.id }, coach.token)).status === 400, 'saving rejects tournament-season mismatch');
  check((await save({ ...newInput, analysis: { ...newInput.analysis, playerSummaries: [{ ...line, details: { ...details, pitching: { ...details.pitching, outs: -1 } } }] } }, coach.token)).status === 400, 'negative pitching stats rejected');
  const saved = await save(newInput, coach.token);
  check(saved.status === 201, 'expanded pitching, fielding and feedback save successfully');
  const savedLine = await db.playerGameLine.findFirstOrThrow({ where: { gameId: saved.body.id } });
  check(savedLine.details.pitching.outs === 7 && savedLine.details.fielding.assists === 0 && savedLine.details.fielding.errors === null, 'known zero and missing metrics remain distinct');
  check(metricTotal([savedLine, { details: null }], 'pitching', 'outs') === '7 (1 games recorded)' && metricTotal([savedLine], 'fielding', 'errors') === 'Not recorded', 'metric totals report recorded coverage and preserve unknown values');
  check(readDetails({ anything: true }) === null, 'legacy details handled without invented metrics');
  const legacyGame = await db.game.findUniqueOrThrow({ where: { id: game.id }, include: { playerLines: true } });
  check(legacyGame.playerLines[0].details === null, 'old games keep existing stats without fake pitching values');
  const lossTwo = await save({ ...newInput, sourceHash: hash('loss2-' + stamp), opponent: 'Another loss' }, coach.token);
  const chosen = await db.game.findMany({ where: { id: { in: [game.id, saved.body.id, lossTwo.body.id] } } });
  const patterns = lossPatterns(chosen);
  check(patterns[0].games === 2 && patterns[0].losses === 2 && patterns[0].otherCount === 1 && patterns[0].otherGames === 1, 'loss patterns compare two losses with one win and count each game once');
  check(lossPatterns([{ ...chosen[0], runsFor: null }]).length === 0, 'unscored game excluded from loss comparisons');
  const practice = await renderPage('../app/practice/page.tsx', { searchParams: Promise.resolve({ gameId: [game.id, saved.body.id], lossesOnly: '1', selection: '1' }) }, coach.token);
  check(practice.includes('2 selected games') && practice.includes('1 games contributing') && practice.includes('Patterns in losses'), 'multi-game practice supports loss-only priorities while preserving comparison');
  let denied = false;
  const outsider = await db.game.create({ data: { teamId: other.id, opponent: 'SECRET OPPONENT', playedAt: new Date() } });
  try { await renderPage('../app/practice/page.tsx', { searchParams: Promise.resolve({ gameId: [game.id, outsider.id] }) }, coach.token); } catch (e) { denied = e.digest?.includes('404'); }
  check(denied, 'practice rejects mixed-team game selection');
  const recaps = await renderPage('../app/recaps/page.tsx', { searchParams: Promise.resolve({ seasonId: season.id }) }, coach.token);
  check(recaps.includes('Fall 2026') && recaps.includes('Collapse all') && recaps.includes('Loss opponent') && !recaps.includes('SECRET OPPONENT'), 'recaps render season folders and collapse controls without other-team games');
  const springPage = await renderPage('../app/recaps/page.tsx', { searchParams: Promise.resolve({ seasonId: spring.id }) }, coach.token);
  check(!springPage.includes('Loss opponent'), 'season filter isolates games');
  const players = await renderPage('../app/players/page.tsx', { searchParams: Promise.resolve({ seasonId: season.id }) }, coach.token);
  check(players.includes('Team hitting, pitching &amp; fielding') && players.includes('Not recorded') && players.includes('Work on two-strike contact'), 'team breakdown shows observed stats and individual focus');
  const parentMember = await db.teamMember.findUniqueOrThrow({ where: { userId_teamId: { userId: parent.user.id, teamId: team.id } } });
  await db.playerAccess.create({ data: { playerId: roster.id, memberId: parentMember.id } });
  const feedback = await renderPage('../app/players/[id]/feedback/page.tsx', { params: Promise.resolve({ id: roster.id }), searchParams: Promise.resolve({ seasonId: season.id }) }, coach.token);
  check(feedback.includes(parent.user.email) && !feedback.includes(otherCoach.user.email) && feedback.includes('Work on two-strike contact'), 'parent draft offers only approved linked parent and player-specific evidence');
  await db.teamMember.update({ where: { id: parentMember.id }, data: { status: 'REJECTED' } });
  const revoked = await renderPage('../app/players/[id]/feedback/page.tsx', { params: Promise.resolve({ id: roster.id }), searchParams: Promise.resolve({}) }, coach.token);
  check(!revoked.includes(parent.user.email), 'revoked parent email is not offered');
  await db.teamMember.update({ where: { id: parentMember.id }, data: { status: 'APPROVED' } });
  for (const account of [parent, otherCoach]) {
    denied = false; try { await renderPage('../app/players/[id]/feedback/page.tsx', { params: Promise.resolve({ id: roster.id }), searchParams: Promise.resolve({}) }, account.token); } catch (e) { denied = !!e.digest; }
    check(denied, 'family draft page rejects parent and other-team coach');
  }
  const draft = playerEmailDraft(team.name, 'Matched Player', [{ ...savedLine, game: { playedAt: new Date('2026-09-30'), opponent: 'Loss opponent' } }]);
  check(draft.includes('Coach: describe any improvement') && draft.includes('Work on two-strike contact') && !draft.includes('SECRET OPPONENT'), 'draft distinguishes observed facts from coach-added improvement');
  const logoApi = require('../app/api/team-logo/route.ts').POST;
  async function logoCall(payload, token, origin = process.env.APP_URL) {
    setToken(token); const response = await logoApi(new Request(process.env.APP_URL + '/api/team-logo', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(payload) })); return response.status;
  }
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  check(await logoCall({ teamId: team.id, logoData: png }, '') === 401, 'logo upload requires login');
  for (const account of [coach, parent, pending]) check(await logoCall({ teamId: team.id, logoData: png }, account.token) === 403, 'logo upload restricted to approved team admin');
  check(await logoCall({ teamId: team.id, logoData: png }, admin.token, 'https://bad.test') === 403, 'logo upload rejects cross-origin requests');
  check(await logoCall({ teamId: other.id, logoData: png }, admin.token) === 409, 'logo upload rejects stale team');
  check(await logoCall(null, admin.token) === 400, 'logo upload handles null input');
  check(await logoCall({ teamId: team.id, logoData: 'data:image/svg+xml,<svg />' }, admin.token) === 400, 'active image formats rejected');
  check(await logoCall({ teamId: team.id, logoData: png }, admin.token) === 200 && (await db.team.findUniqueOrThrow({ where: { id: team.id } })).logoData === png, 'logo persists for correct team');
  const detail = await renderPage('../app/recaps/games/[id]/page.tsx', { params: Promise.resolve({ id: saved.body.id }) }, coach.token);
  check(detail.includes('Create a social recap') && detail.includes('Download recap image') && detail.includes('Share image'), 'saved game offers reviewable social sharing controls');
  check(await logoCall({ teamId: team.id, logoData: null }, admin.token) === 200 && (await db.team.findUniqueOrThrow({ where: { id: team.id } })).logoData === null, 'admin can remove team logo');
};
