import test from 'node:test';import assert from 'node:assert/strict';
import {processQueueBatch} from './queue-worker.mjs';
test('queue consults pending results and blocks ambiguous failures without retrying sends',async()=>{
 const results=[];const jobs=[{id:1},{id:2},{id:3}];
 await processQueueBatch({claim:async()=>jobs,run:async j=>{if(j.id===3)throw Error('network');return Response.json({estado:j.id===1?'aceptado':'enviando'});},finish:async(j,state)=>results.push([j.id,state])});
 assert.deepEqual(results.sort(),[[1,'done'],[2,'consult'],[3,'blocked']]);
});
