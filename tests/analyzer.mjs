// Local mock only: validates all upload branches without spending API credits.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
if (!process.env.DATABASE_URL || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Use a disposable local database.');
const db=new PrismaClient();
const requests=[];
const mock=createServer(async (req,res)=>{
  let raw='';for await(const chunk of req) raw+=chunk;
  const input=JSON.parse(raw);requests.push(input);
  const data=input.text.format.name==='scorebook_analysis'
    ? {opponent:'Opponent',gameDate:'2026-09-29',score:{us:3,them:1},confidence:1,summary:'Test game',excelledAt:[],workOn:[],events:[],playerSummaries:[],priorities:[]}
    : {title:'Test practice',durationMinutes:75,focus:[],blocks:[],coachNotes:[]};
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({id:'resp_mock',object:'response',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(data),annotations:[]}]}]}));
});
await new Promise(resolve=>mock.listen(3101,'127.0.0.1',resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3102','-H','127.0.0.1'],{windowsHide:true,stdio:'pipe',env:{...process.env,APP_URL:'http://127.0.0.1:3102',OPENAI_API_KEY:'local-mock-key',OPENAI_BASE_URL:'http://127.0.0.1:3101/v1'}});
let logs='';app.stdout.on('data',d=>logs+=d);app.stderr.on('data',d=>logs+=d);
const stamp=Date.now();let user,team;
try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3102/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  team=await db.team.create({data:{name:'Analyzer Sparks '+stamp,ageGroup:'16U'}});
  user=await db.user.create({data:{email:'analyzer-'+stamp+'@example.test',activeTeamId:team.id,memberships:{create:{teamId:team.id,role:'COACH',status:'APPROVED'}}}});
  const token=randomBytes(32).toString('hex');
  await db.session.create({data:{tokenHash:createHash('sha256').update(token).digest('hex'),userId:user.id,expiresAt:new Date(Date.now()+60000)}});
  const headers={cookie:'__Host-d2h-session='+token,origin:'http://127.0.0.1:3102'};
  for(const [name,type,data] of [['game.csv','text/csv','team,hits\nSparks,3'],['game.pdf','application/pdf','%PDF-mock'],['game.png','image/png','mock-png']]) {
    const form=new FormData();form.set('scorebook',new Blob([data],{type}),name);form.set('csvScope','single_game');
    const result=await fetch('http://127.0.0.1:3102/api/analyze',{method:'POST',headers,body:form});
    assert.equal(result.status,200,await result.clone().text());assert.equal((await result.json()).analysis.score.us,3);
    const payload=requests.at(-1);assert(JSON.stringify(payload.input).includes(team.name));assert.equal(payload.text.format.strict,true);
    if(type==='application/pdf') assert(payload.input[0].content[1].file_data.startsWith('data:application/pdf;base64,'));
    if(type==='image/png') assert(payload.input[0].content[1].image_url.startsWith('data:image/png;base64,'));
    console.log('PASS:',name,'upload, team perspective, structured output');
  }
  const practice=await fetch('http://127.0.0.1:3102/api/practice-plan',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({priorities:[],durationMinutes:75,ageGroup:'10U'})});
  assert.equal(practice.status,200);assert(requests.at(-1).input.includes('16U'));assert(!requests.at(-1).input.includes('10U'));
  console.log('PASS: practice uses profile age group instead of client override');
  const invalid=new FormData();invalid.set('scorebook',new Blob(['bad'],{type:'application/octet-stream'}),'file.exe');
  assert.equal((await fetch('http://127.0.0.1:3102/api/analyze',{method:'POST',headers,body:invalid})).status,400);
  const large=new FormData();large.set('scorebook',new Blob([new Uint8Array(12*1024*1024+1)],{type:'image/png'}),'large.png');
  assert.equal((await fetch('http://127.0.0.1:3102/api/analyze',{method:'POST',headers,body:large})).status,400);
  assert.equal(requests.length,4);console.log('PASS: invalid and oversized files rejected before AI calls');
} catch(error) { console.error(logs);throw error; }
finally {app.kill();await new Promise(r=>mock.close(r));if(team)await db.team.delete({where:{id:team.id}});if(user)await db.user.delete({where:{id:user.id}});await db.$disconnect();}
