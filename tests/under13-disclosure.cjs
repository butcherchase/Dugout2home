module.exports = async function ({ db, team, other, coach, admin, parent, player, pending, setToken, renderPage, check }) {
  const { POST } = require('../app/api/team-privacy/route.ts');
  async function send(value, token, origin = process.env.APP_URL) {
    setToken(token);
    const response = await POST(new Request(process.env.APP_URL + '/api/team-privacy', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(value) }));
    return { status: response.status, body: await response.json() };
  }
  const payload = { teamId: team.id, containsUnder13Data: true };
  check((await db.team.findUniqueOrThrow({ where: { id: team.id } })).containsUnder13Data === null, 'under-13 disclosure starts unreviewed');
  check((await send(payload, '')).status === 401, 'under-13 disclosure requires sign-in');
  for (const a of [coach, parent, player, pending]) check((await send(payload, a.token)).status === 403, 'under-13 disclosure requires approved team admin');
  check((await send(payload, admin.token, 'https://other.test')).status === 403, 'under-13 disclosure rejects cross-origin request');
  check((await send({ ...payload, teamId: other.id }, admin.token)).status === 409, 'under-13 disclosure rejects stale or cross-team form');
  check((await send({ ...payload, containsUnder13Data: 'true' }, admin.token)).status === 400, 'under-13 disclosure requires explicit boolean');
  check((await send(null, admin.token)).status === 400, 'under-13 disclosure handles null request');
  const on = await send({ ...payload, under13DisclosureUpdatedBy: 'forged', under13DisclosureUpdatedAt: '1999-01-01' }, admin.token);
  const saved = await db.team.findUniqueOrThrow({ where: { id: team.id } });
  check(on.status === 200 && saved.containsUnder13Data === true && saved.under13DisclosureUpdatedBy === admin.user.id && saved.under13DisclosureUpdatedAt.getFullYear() >= 2026, 'under-13 selection persists with server-assigned actor and date');
  check((await db.team.findUniqueOrThrow({ where: { id: other.id } })).containsUnder13Data === null, 'under-13 selection does not change other team');
  const html = await renderPage('../app/team/page.tsx', { searchParams: Promise.resolve({}) }, admin.token);
  check(html.includes('role="switch"') && html.includes('Under-13 information indicated') && html.includes('does not verify a parent'), 'team settings shows saved disclosure and accurate consent limitation');
  check((await send({ ...payload, containsUnder13Data: false }, admin.token)).status === 200 && (await db.team.findUniqueOrThrow({ where: { id: team.id } })).containsUnder13Data === false, 'under-13 toggle can be turned off and saved');
};
