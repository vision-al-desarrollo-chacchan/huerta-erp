import {PGlite} from '@electric-sql/pglite';
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create table orders(id bigint primary key,empresa_id integer,sucursal_id integer,created_at timestamptz,status text);
create table items(id bigint primary key,pedido_id bigint,nombre text,cantidad integer,precio numeric);
create index orders_tenant_date_idx on orders(empresa_id,sucursal_id,created_at desc,id desc);
create index items_order_idx on items(pedido_id);
insert into orders select n,((n-1)/1000)::int+1,1,'2026-01-01'::timestamptz+n*interval '1 minute',case when n%10=0 then 'nuevo' else 'pagado' end from generate_series(1,100000)n;
insert into items select n,n,'Plato ficticio',1,20 from generate_series(1,100000)n;
insert into items select n+100000,n,'Bebida ficticia',1,5 from generate_series(1,100000)n;
analyze orders;analyze items;`);
const sql=`select p.id,p.empresa_id,(select jsonb_agg(jsonb_build_object('nombre',i.nombre,'cantidad',i.cantidad,'precio',i.precio)) from items i where i.pedido_id=p.id) as items from orders p where empresa_id=$1 and sucursal_id=1 order by created_at desc,id desc limit 100`;
for(let i=0;i<20;i++)await db.query(sql,[i+1]);
const percentile=(values,p)=>values[Math.min(values.length-1,Math.ceil(values.length*p)-1)];
const scenarios=[];
for(const {clients,limit,incremental} of [{clients:10,limit:100},{clients:50,limit:100},{clients:100,limit:100},{clients:100,limit:250},{clients:100,limit:1,incremental:true}]){
 const query=incremental?sql.replace('order by created_at desc,id desc limit 100','and p.id = $2 order by created_at desc,id desc limit 1'):sql.replace('limit 100',`limit ${limit}`);
 const times=[];let errors=0;const start=performance.now();
 await Promise.all(Array.from({length:clients},(_,client)=>(async()=>{
  for(let round=0;round<10;round++){
   const began=performance.now();
   try{const {rows}=await db.query(query,incremental?[client+1,client*1000+1000]:[client+1]);assert.equal(rows.length,limit);assert.ok(rows.every(row=>row.empresa_id===client+1));}
   catch{errors++;}times.push(performance.now()-began);
  }
 })()));
 const elapsed=performance.now()-start;times.sort((a,b)=>a-b);
 scenarios.push({simulated_clients:clients,rows_per_query:limit,mode:incremental?'incremental':'history',queries:clients*10,errors,elapsed_ms:Math.round(elapsed),queries_per_second:Math.round(clients*10000/elapsed),p50_ms:Math.round(percentile(times,.5)),p95_ms:Math.round(percentile(times,.95)),max_ms:Math.round(times.at(-1))});
 assert.equal(errors,0);
}
const plan=(await db.query('explain '+sql,[42])).rows;
assert.match(JSON.stringify(plan),/orders_tenant_date_idx/);assert.match(JSON.stringify(plan),/items_order_idx/);
const result={generated_at:new Date().toISOString(),environment:'Local PGlite WASM, one database engine with serialized query execution',fixture:{companies:100,orders:100000,items:200000},workload:'10 reads per simulated client; indexed tenant filter; compares 250-row, 100-row and single-order refreshes',scenarios,limitations:['Simulated asynchronous clients share one local SQL engine; not independent PostgreSQL sessions.','No production traffic, network, Supabase Auth/RLS workload, Realtime fanout, certificate signing or SUNAT measured.','These results do not certify production capacity for 100 simultaneous companies.'],query_plan:plan};
writeFileSync(new URL('../../../../docs/escalabilidad-benchmark-20261013.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));await db.close();
