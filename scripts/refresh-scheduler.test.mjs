import test from 'node:test';import assert from 'node:assert/strict';
import {createRefreshScheduler} from '../src/lib/refresh-scheduler.ts';
const tick=()=>new Promise(r=>setTimeout(r,15));
test('burst is coalesced, changes during a fetch trigger one follow-up, dispose prevents work',async()=>{
 let calls=0,release;const s=createRefreshScheduler(async()=>{calls++;if(calls===1)await new Promise(r=>release=r);},1);
 for(let i=0;i<100;i++)s.request();await tick();assert.equal(calls,1);
 for(let i=0;i<100;i++)s.request();await tick();assert.equal(calls,1);
 release();await tick();assert.equal(calls,2);s.request();s.dispose();await tick();assert.equal(calls,2);
});
