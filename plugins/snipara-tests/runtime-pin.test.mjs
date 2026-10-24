import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {invocation,installRuntime} from '../snipara/lib/runtime.mjs';
import {VERSIONS} from '../snipara/lib/config.mjs';
const config={schemaVersion:1,project:'fixture',connection:'project',modules:{snipara:true,companion:true,orchestrator:true}};
test('Companion installer and launcher select the reviewed package',t=>{
 const data=mkdtempSync(join(tmpdir(),'plugin-pin-'));t.after(()=>rmSync(data,{recursive:true,force:true}));
 const calls=[];
 installRuntime(config,'companion',{env:{PATH:process.env.PATH,PLUGIN_DATA:data},execute:(command,args)=>{calls.push({command,args});return{status:0};}});
 assert.equal(calls.length,1);assert.ok(calls[0].args.includes(`snipara-companion@${VERSIONS.companion}`));
});
for(const version of ['3.7.0','3.7.1','3.7.2','3.7.3','3.7.4','3.8.0',VERSIONS.companion]){
 test(`private runtime ${version} is ${version===VERSIONS.companion?'accepted':'refused without global fallback'}`,t=>{
  const data=mkdtempSync(join(tmpdir(),'plugin-runtime-pin-'));t.after(()=>rmSync(data,{recursive:true,force:true}));
  const local=join(data,'companion/node_modules/snipara-companion/dist/index.js');
  mkdirSync(join(data,'companion/node_modules/snipara-companion/dist'),{recursive:true});writeFileSync(local,'// fixture');
  const calls=[];
  const options={env:{PATH:process.env.PATH,PLUGIN_DATA:data},probe:(command,args)=>{calls.push({command,args});return{status:0,stdout:version};}};
  if(version===VERSIONS.companion){
   const call=invocation(config,'companion',['--version'],options);
   assert.equal(call.command,process.execPath);assert.deepEqual(call.args,[local,'--version']);
  }else assert.throws(()=>invocation(config,'companion',['--version'],options),/Install the pinned companion/);
  assert.deepEqual(calls,[{command:process.execPath,args:[local,'--version']}]);
 });
}

for (const version of ['1.10.0','1.11.0','1.11.1','1.12.0',VERSIONS.orchestrator]) {
 test(`Orchestrator private runtime ${version} obeys the exact pin`, t => {
  const data=mkdtempSync(join(tmpdir(),'plugin-orchestrator-pin-'));t.after(()=>rmSync(data,{recursive:true,force:true}));
  const local=join(data,'orchestrator',process.platform==='win32'?'Scripts':'bin',process.platform==='win32'?'snipara-orchestrator.exe':'snipara-orchestrator');
  mkdirSync(join(data,'orchestrator',process.platform==='win32'?'Scripts':'bin'),{recursive:true});writeFileSync(local,'fixture');
  const calls=[];
  const options={env:{PATH:process.env.PATH,PLUGIN_DATA:data},probe:(command,args)=>{calls.push({command,args});return{status:0,stdout:version};}};
  if(version===VERSIONS.orchestrator)assert.equal(invocation(config,'orchestrator',['--version'],options).command,local);
  else assert.throws(()=>invocation(config,'orchestrator',['--version'],options),/Install the pinned orchestrator/);
  assert.deepEqual(calls,[{command:local,args:['--version']}]);
 });
}
