// Run only against a disposable migrated database and a running local production build.
// D2H_TEST_URL=http://localhost:3100 DATABASE_URL=... node tests/integration.mjs
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const base = process.env.D2H_TEST_URL;
if (!base || !['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Set D2H_TEST_URL to a local test server. Never run against production.');
if (!process.env.DATABASE_URL || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('A disposable local DATABASE_URL is required.');
const db = new PrismaClient();
const stamp = Date.now();
const password = 'Test-password-123!';
const accounts = [];
let checks = 0;
function check(condition, label) { assert(condition, label); console.log('PASS:',label); checks++; }
const attrs = tag => Object.fromEntries([...tag.matchAll(/([:\w$-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&')]));
class Browser {
  cookie = '';
  async request(path, options={}) {
    const res = await fetch(base+path, { ...options, redirect:'manual', headers:{ cookie:this.cookie, ...options.headers } });
    for(const c of res.headers.getSetCookie()) { const pair=c.split(';')[0]; if(pair.includes('d2h-session=')) this.cookie=pair; }
    return { status:res.status, location:res.headers.get('location'), body:await res.text() };
  }
  async submit(path, match, fields={}) {
    const page=await this.request(path);
    const form=[...page.body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(m=>m[0]).find(f=>f.includes(match));
    assert(form,`form ${match} exists on ${path}`);
    const data=new FormData();
    for(const tag of form.match(/<input\b[^>]*>/g)||[]) { const a=attrs(tag); if(a.type==='hidden') data.append(a.name,a.value||''); }
    for(const [k,v] of Object.entries(fields)) { data.delete(k); for(const value of Array.isArray(v)?v:[v]) data.append(k,value); }
    return this.request(path,{method:'POST',headers:{origin:base},body:data});
  }
  async signup(name) {
    this.email=`${name.toLowerCase()}-${stamp}@example.test`;accounts.push(this.email);
    const res=await this.submit('/signup','Create account',{name,email:this.email,password});
    check(res.status===303 && res.location==='/onboarding',`${name} signup`);
    check(this.cookie.includes('d2h-session='),'session cookie created');
  }
}

try {
  const guest=new Browser();
  for(const path of ['/analyze','/players','/practice','/recaps','/team','/my-player','/dashboard']) {
    const r=await guest.request(path);check(r.location==='/login' || r.body.includes('NEXT_REDIRECT;replace;/login'),`guest cannot access ${path}`);
  }
  for(const path of ['/api/analyze','/api/practice-plan']) check((await guest.request(path,{method:'POST'})).status===401,`guest API denied: ${path}`);
  const admin=new Browser();await admin.signup('Admin');
  check((await admin.submit('/onboarding','Create team',{name:'Sparks '+stamp,ageGroup:'14U',season:'Fall 2026'})).location==='/team','create team');
  const team=await db.team.findFirstOrThrow({where:{name:'Sparks '+stamp}});
  const adminUser=await db.user.findUniqueOrThrow({where:{email:admin.email}});
  const adminMember=await db.teamMember.findFirstOrThrow({where:{userId:adminUser.id,teamId:team.id}});
  check(adminMember.role==='TEAM_ADMIN' && adminMember.status==='APPROVED','creator is approved admin');
  await admin.submit('/team','Add player',{firstName:'LinkedChild',lastName:'One',jersey:'7'});
  await admin.submit('/team','Add player',{firstName:'OtherChild',lastName:'Two',jersey:'8'});
  const players=await db.player.findMany({where:{teamId:team.id},orderBy:{firstName:'asc'}});
  const child=players.find(p=>p.firstName==='LinkedChild');
  const other=players.find(p=>p.firstName==='OtherChild');
  check(!!child && !!other,'roster creation');
  const parent=new Browser();await parent.signup('Parent');
  const malicious=await parent.submit('/onboarding','Request to join',{code:team.joinCode,role:'TEAM_ADMIN',playerRequest:'LinkedChild'});
  check(malicious.location?.includes('invalid'),'cannot request admin role');
  await parent.submit('/onboarding','Request to join',{code:team.joinCode,role:'PARENT',playerRequest:'LinkedChild'});
  const pu=await db.user.findUniqueOrThrow({where:{email:parent.email}});
  const pm=await db.teamMember.findFirstOrThrow({where:{userId:pu.id,teamId:team.id}});
  check(pm.status==='PENDING','join request starts pending');
  check((await parent.request('/my-player')).location==='/onboarding','pending member cannot see family data');
  check((await parent.request('/api/analyze',{method:'POST',headers:{origin:base}})).status===403,'pending API denied');
  const invalid=await admin.submit('/team',pm.id,{decision:'approve',role:'PARENT',playerIds:[]});
  check(invalid.location?.includes('links'),'parent cannot be approved without player link');
  // A second team has no visibility into the first, even with known IDs.
  const stranger=new Browser();await stranger.signup('OtherAdmin');
  await stranger.submit('/onboarding','Create team',{name:'Other team '+stamp,ageGroup:'16U',season:'Fall 2026'});
  const otherTeam=await db.team.findFirstOrThrow({where:{name:'Other team '+stamp}});
  const outsider=await db.player.create({data:{teamId:otherTeam.id,firstName:'CrossTeamSecret',positions:[]}});
  const cross=await admin.submit('/team',pm.id,{decision:'approve',role:'PARENT',playerIds:[outsider.id]});
  check(cross.location?.includes('links'),'cross-team player link rejected');
  await admin.submit('/team',pm.id,{decision:'approve',role:'PARENT',playerIds:[child.id]});
  check((await db.teamMember.findUniqueOrThrow({where:{id:pm.id}})).status==='APPROVED','admin approval persisted');
  await db.playerEvaluation.createMany({data:[
    {id:'private-'+stamp,playerId:child.id,source:'COACH_NOTE',area:'HITTING',note:'PRIVATE_INTERNAL_NOTE',evidence:'INTERNAL_EVIDENCE'},
    {id:'shared-'+stamp,playerId:child.id,source:'COACH_NOTE',area:'THROWING',note:'SHARED_THROWING_FEEDBACK',evidence:'HIDDEN_SHARED_EVIDENCE',sharedWithFamily:true},
    {playerId:other.id,source:'COACH_NOTE',area:'DEFENSE',note:'OTHER_CHILD_SECRET',sharedWithFamily:true}
  ]});
  const family=await parent.request('/my-player');
  check(family.status===200 && family.body.includes('LinkedChild') && family.body.includes('SHARED_THROWING_FEEDBACK'),'family sees linked child and shared feedback');
  check(!['PRIVATE_INTERNAL_NOTE','INTERNAL_EVIDENCE','HIDDEN_SHARED_EVIDENCE','OTHER_CHILD_SECRET','OtherChild','CrossTeamSecret'].some(s=>family.body.includes(s)),'family payload excludes private, unrelated and cross-team data');
  for(const path of ['/analyze','/players','/practice','/recaps']) check((await parent.request(path)).location==='/my-player',`parent route denied: ${path}`);
  check((await parent.request('/team')).location==='/dashboard','parent admin screen denied');
  check((await parent.request('/api/practice-plan',{method:'POST',headers:{origin:base}})).status===403,'parent practice API denied');
  check((await admin.request('/api/analyze',{method:'POST',headers:{origin:'https://attacker.test'}})).status===403,'cross-origin API denied');
  check((await admin.request('/api/analyze',{method:'POST',headers:{origin:base}})).status===503,'approved admin reaches analyzer configuration check');
  const strangerRoster=await stranger.request('/players');check(!strangerRoster.body.includes('LinkedChild'),'second admin sees only own roster');
  await admin.submit('/players','shared-'+stamp,{shared:'false'});
  check(!(await parent.request('/my-player')).body.includes('SHARED_THROWING_FEEDBACK'),'unsharing immediately removes feedback');
  const coach=new Browser();await coach.signup('Coach');
  await coach.submit('/onboarding','Request to join',{code:team.joinCode,role:'COACH',playerRequest:''});
  const cu=await db.user.findUniqueOrThrow({where:{email:coach.email}});
  const cm=await db.teamMember.findFirstOrThrow({where:{userId:cu.id,teamId:team.id}});
  await admin.submit('/team',cm.id,{decision:'approve',role:'COACH'});
  check((await coach.request('/analyze')).body.includes(team.name),'coach analyzer knows team');
  check((await coach.request('/team')).location==='/dashboard','coach cannot approve members');
  const player=new Browser();await player.signup('Player');
  await player.submit('/onboarding','Request to join',{code:team.joinCode,role:'PLAYER',playerRequest:'LinkedChild'});
  const pl=await db.user.findUniqueOrThrow({where:{email:player.email}});
  const plm=await db.teamMember.findFirstOrThrow({where:{userId:pl.id,teamId:team.id}});
  check((await admin.submit('/team',plm.id,{decision:'approve',role:'PLAYER',playerIds:[child.id,other.id]})).location?.includes('links'),'player cannot link multiple profiles');
  await admin.submit('/team',plm.id,{decision:'approve',role:'PLAYER',playerIds:[child.id]});
  const playerPage=await player.request('/my-player');check(playerPage.body.includes('LinkedChild')&&!playerPage.body.includes('OtherChild'),'player sees only own profile');
  const adminFormPage=await admin.request('/team');
  const approvalForm=[...adminFormPage.body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)].map(m=>m[0]).find(f=>f.includes(pm.id));
  const forged=new FormData();for(const tag of approvalForm.match(/<input\b[^>]*>/g)||[]) {const a=attrs(tag);if(a.type==='hidden')forged.append(a.name,a.value||'');}
  const denied=await parent.request('/team',{method:'POST',headers:{origin:base},body:forged});
  check(denied.status===303 && denied.location==='/dashboard','forged admin server action denied');
  await admin.submit('/team',pm.id,{decision:'revoke'});
  check((await parent.request('/my-player')).location==='/onboarding','revocation takes effect on existing session');
  check(await db.playerAccess.count({where:{memberId:pm.id}})===0,'revocation removes player links');
  const oldCode=team.joinCode;await admin.submit('/team','Replace invite code');
  check((await db.team.findUniqueOrThrow({where:{id:team.id}})).joinCode!==oldCode,'invite code rotates');
  check((await parent.submit('/onboarding','Request to join',{code:oldCode,role:'PARENT',playerRequest:'LinkedChild'})).location?.includes('code'),'old invite code rejected');
  const oldCookie=coach.cookie;
  await coach.submit('/dashboard','Sign out');
  coach.cookie=oldCookie;check((await coach.request('/analyze')).location==='/login','logout invalidates the server session');
  const returning=new Browser();check((await returning.submit('/login','Sign in',{email:admin.email,password:'Wrong-password-123'})).location?.includes('credentials'),'wrong password rejected');
  check((await returning.submit('/login','Sign in',{email:admin.email.toUpperCase(),password})).location==='/dashboard','login normalizes email and restores account');
  const rateKeyUser=await db.user.findUniqueOrThrow({where:{email:admin.email}});
  await db.session.updateMany({where:{userId:rateKeyUser.id},data:{expiresAt:new Date(0)}});
  check((await returning.request('/team')).location==='/login','expired session rejected');
  console.log(`ALL ${checks} INTEGRATION CHECKS PASSED`);
} finally {
  // Remove only the explicitly named test accounts and teams created by this run.
  await db.team.deleteMany({where:{name:{in:['Sparks '+stamp,'Other team '+stamp]}}});
  await db.user.deleteMany({where:{email:{in:accounts}}});
  await db.$disconnect();
}
