import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBetaHandler } from './beta-handler.mjs';
const empresaId='11111111-1111-4111-8111-111111111111', idempotencyKey='22222222-2222-4222-8222-222222222222';
const request = (body={empresaId,idempotencyKey}) => new Request('https://local.invalid', { method:'POST', headers:{Authorization:'Bearer demo'}, body:JSON.stringify(body) });
function setup(overrides={}) {
  let sends=0;
  const job={id:'33333333-3333-4333-8333-333333333333',empresa_id:empresaId,estado:'pendiente'};
  const artifacts=new Map();
  const repository={
    async reserve(identity,company) {if(company!==empresaId) throw new Error('denied');return {...job};},
    async claim() {if(job.estado!=='pendiente')return null;job.estado='enviando';return {...job};},
    async store(path,data) {artifacts.set(path,data);},
    async finish(claimed,patch) {Object.assign(job,patch);return {...job};},
  };
  const handler=createBetaHandler({enabled:true,authenticate:async()=>({userId:'demo'}),repository,buildFixture:()=>({xml:'<Invoice/>'}),sendFixture:async()=>{sends++;return {status:'aceptado',code:'0',message:'Prueba aceptada',notes:[],cdr:new Uint8Array([1])};},...overrides});
  return {handler,job,artifacts,sends:()=>sends,repository};
}
test('deshabilitado por defecto y sin sesión no reservan ni envían',async()=>{
  for(const [config,status] of [[{enabled:false},503],[{authenticate:async()=>null},401]]) {const s=setup(config);assert.equal((await s.handler(request())).status,status);assert.equal(s.sends(),0);assert.equal(s.job.estado,'pendiente');}
});
test('rechaza cuerpo con documentos reales o empresa ajena',async()=>{
  const s=setup();assert.equal((await s.handler(request({empresaId,idempotencyKey,documentId:'real'}))).status,400);
  assert.equal((await s.handler(request({empresaId:'99999999-9999-4999-8999-999999999999',idempotencyKey}))).status,403);assert.equal(s.sends(),0);
});
test('guarda XML y CDR en ruta por empresa y resultado beta',async()=>{
  const s=setup();const response=await s.handler(request());assert.equal(response.status,200);const body=await response.json();assert.equal(body.estado,'aceptado');assert.equal(body.ambiente,'beta');assert.equal(body.datosFicticios,true);assert.equal(s.artifacts.size,2);assert.ok([...s.artifacts.keys()].every(k=>k.startsWith(empresaId+'/')));assert.equal(s.job.codigo_sunat,'0');
});
test('dos solicitudes concurrentes y repetición posterior envían una sola vez',async()=>{
  const s=setup();await Promise.all([s.handler(request()),s.handler(request())]);const repeat=await s.handler(request());assert.equal((await repeat.json()).duplicatePrevented,true);assert.equal(s.sends(),1);
});
test('timeout después de iniciar envío queda incierto y no vuelve a enviar',async()=>{
  let sends=0;const s=setup({sendFixture:async()=>{sends++;throw new Error('timeout with secret');}});const response=await s.handler(request());assert.equal(response.status,502);assert.equal(s.job.estado,'incierto');assert.ok(!(await response.text()).includes('secret'));await s.handler(request());assert.equal(sends,1);
});
test('fallo de almacenamiento antes de enviar no realiza solicitud SUNAT',async()=>{
  const s=setup();s.repository.store=async()=>{throw new Error('storage');};assert.equal((await s.handler(request())).status,502);assert.equal(s.job.estado,'error');assert.equal(s.sends(),0);
});
test('CDR rechazado queda rechazado y observaciones quedan observadas',async()=>{
  for(const status of ['rechazado','observado']) {const s=setup({sendFixture:async()=>({status,code:status==='rechazado'?'2001':'0',message:'Prueba',notes:['Nota'],cdr:new Uint8Array([1])})});await s.handler(request());assert.equal(s.job.estado,status);}
});

test('boleta guarda ticket y consulta sin reenviar incluso tras resultado incierto', async () => {
  let sends = 0, queries = 0;
  const s = setup({
    buildFixture: (type) => { assert.equal(type, '03'); return {xml: '<SummaryDocuments/>', summaryId: 'RC-20261028-1'}; },
    sendFixture: async () => { sends++; return {status: 'enviando', ticket: '123456', message: 'Recibido'}; },
    consultReceipt: async (job) => { queries++; assert.equal(job.ticket, '123456'); return {status: 'aceptado',code: '0',message: 'Aceptado',notes: [],cdr: new Uint8Array([1])}; },
  });
  s.job.document_type = '03';
  const req = () => request({empresaId,idempotencyKey,documentType:'03'});
  assert.equal((await s.handler(req())).status, 202);
  assert.equal(s.job.summary_id, 'RC-20261028-1');
  assert.equal(s.job.ticket, '123456');
  s.job.estado = 'incierto';
  assert.equal((await (await s.handler(req())).json()).estado, 'aceptado');
  await s.handler(req());
  assert.equal(sends, 1); assert.equal(queries, 1);
});
test('tipo inválido o clave de otro tipo no envían ni consultan', async () => {
  const s=setup();
  assert.equal((await s.handler(request({empresaId,idempotencyKey,documentType:'07'}))).status,400);
  s.job.document_type='03';
  assert.equal((await s.handler(request())).status,409);
  assert.equal(s.sends(),0);
});
test('ticket pendiente o consulta fallida nunca reenvía la boleta', async () => {
  const s=setup({consultReceipt:async()=>{throw new Error('timeout');}});
  Object.assign(s.job,{document_type:'03',ticket:'123',summary_id:'RC-20261028-1',estado:'enviando'});
  for(let i=0;i<2;i++) assert.equal((await s.handler(request({empresaId,idempotencyKey,documentType:'03'}))).status,202);
  assert.equal(s.sends(),0);
});
