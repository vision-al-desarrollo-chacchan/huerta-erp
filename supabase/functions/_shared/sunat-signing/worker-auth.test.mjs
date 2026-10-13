import test from 'node:test';import assert from 'node:assert/strict';import {createHmac,randomUUID} from 'node:crypto';
import {verifyWorkerRequest} from './worker-auth.mjs';
test('scheduler signature expires, rejects tampering, and nonce is single-use',async()=>{
 const now=Date.now(),nonce=randomUUID(),key='k'.repeat(64),signature=createHmac('sha256',key).update(`${now}:${nonce}`).digest('hex');let consumed=false;
 const req=new Request('https://local',{headers:{'x-sunat-worker-time':String(now),'x-sunat-worker-nonce':nonce,'x-sunat-worker-signature':signature}});
 const consume=async()=>{if(consumed)return false;consumed=true;return true;};
 assert.equal(await verifyWorkerRequest(req,async()=>key,consume,now),true);
 assert.equal(await verifyWorkerRequest(req,async()=>key,consume,now),false);
 assert.equal(await verifyWorkerRequest(req,async()=>key,async()=>true,now+61000),false);
 assert.equal(await verifyWorkerRequest(req,async()=> 'wrong',async()=>true,now),false);
 assert.equal(await verifyWorkerRequest(new Request('https://local'),async()=>{throw Error('must not read');},async()=>true,now),false);
});
