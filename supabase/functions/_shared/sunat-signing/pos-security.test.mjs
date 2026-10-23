import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const db = new PGlite();
const migration = name => readFileSync(new URL('../../../migrations/'+name,import.meta.url),'utf8');
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;grant select on auth.users to authenticated;
create function public.gen_random_bytes(integer) returns bytea language sql as $$select decode(repeat('00',$1),'hex')$$;
create function public.handle_new_user() returns trigger language plpgsql as $$begin return new;end$$;
create publication supabase_realtime;`);
const migrations = [
 '20260808220000_restaurant_core.sql','20260808224000_cash_staff_audit.sql','20260808231000_cash_reconciliation.sql',
 '20260808233000_cash_movements.sql','20260809001500_next_shift_fund.sql','20260809010000_inventory_recipes.sql',
 '20260809013000_inventory_costs_presentations.sql','20260809023000_inventory_movement_write_policy.sql',
 '20260809030000_erp_test_foundation.sql','20260810120000_realtime_indexes.sql','20260810230000_electronic_billing_printing.sql',
 '20260810231000_harden_electronic_billing.sql','20260811010000_worker_accounts_roles_audit.sql',
 '20260811030000_safe_cancellations_payroll_audit.sql','20260811040000_cobrar_imprimir_hardening.sql',
 '20260811041000_revoke_trigger_rpc_access.sql','20260811050000_fix_recojo_service.sql',
 '20260817010000_add_items_existing_table_order.sql','20260826010000_single_open_order_per_table.sql',
 '20260827010000_fix_create_order_permission_lock.sql','20260923010000_inventory_reconciliation.sql'];
for (const name of migrations) {
  try { await db.exec(migration(name).replace('create extension if not exists pgcrypto;','')); }
  catch(e) { throw new Error(name+': '+e.message); }
}
// Replay effective company-active/roles helpers without platform administration integrations.
await db.exec('create schema platform_private;grant usage on schema platform_private to authenticated;');
await db.exec(migration('20260928163826_company_lifecycle.sql').split('-- Edge functions')[0]);
// Replay the exact item notification trigger, without unrelated Vault/cron setup.
const scaling=migration('20261013200222_scalability_queue_and_indexes.sql');
await db.exec(scaling.slice(scaling.indexOf('create or replace function public.rest_notificar_items()'),scaling.indexOf('-- Indexes')));
// Mimic legacy Supabase grants, then let the fix revoke them. No superuser execution for assertions.
await db.exec('grant all on all tables in schema public to authenticated;grant usage,select on all sequences in schema public to authenticated;');
await db.exec(migration('20261023045405_pos_security_integrity.sql'));
const id = n => `${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const company=id(1), branch=id(2), owner=id(3), waiter=id(4), cashier=id(5), cook=id(6), other=id(7), otherBranch=id(8), product=id(9), supply=id(10);
await db.exec(`insert into auth.users(id,email)values('${owner}','owner@example.invalid'),('${waiter}','waiter@example.invalid'),('${cashier}','cashier@example.invalid'),('${cook}','cook@example.invalid');
insert into rest_empresas(id,nombre)values('${company}','Fixture'),('${other}','Other');
insert into rest_sucursales(id,empresa_id,nombre)values('${branch}','${company}','Local'),('${otherBranch}','${other}','Other');
insert into rest_miembros(empresa_id,user_id,rol,roles)values('${company}','${owner}','propietario',array['propietario']),('${company}','${waiter}','mozo',array['mozo']),('${company}','${cashier}','cajero',array['cajero']),('${company}','${cook}','cocina',array['cocina']);
insert into rest_productos(id,empresa_id,nombre,categoria,precio)values('${product}','${company}','Pollo','Pollos',20);
insert into rest_insumos(id,empresa_id,sucursal_id,codigo,nombre,unidad,stock,costo_promedio)values('${supply}','${company}','${branch}','POLLO','Pollo','unidad',10,8);
insert into print_configuraciones(empresa_id,sucursal_id,area,nombre_impresora)values('${company}','${branch}','cocina','Printer');
insert into ef_series(empresa_id,sucursal_id,tipo_documento,serie)values('${company}','${branch}','boleta','B001');`);
async function as(user){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');}
const q=(sql,args=[])=>db.query(sql,args);
const one=async(sql,args=[]) => (await q(sql,args)).rows[0];
const rejected=(sql,args=[])=>assert.rejects(q(sql,args));
await as(owner);
await q('insert into rest_recetas(empresa_id,producto_id,insumo_id,cantidad)values($1,$2,$3,0.25)',[company,product,supply]);
let cash, order;
const items=JSON.stringify([{productId:product,quantity:2,notes:'Sin ají'}]);
const create=(key,table='Mesa 1',body=items)=>one('select * from rest_crear_pedido($1,$2,$3,\'salon\',$4,\'\',$5::jsonb,$6)',[company,branch,cash.id,table,body,key]);
await test('mozo/cocina cannot open, close, adjust or write financial tables directly',async()=>{
 await as(waiter);await rejected('select rest_abrir_caja($1,$2,0)',[company,branch]);
 await rejected('select rest_registrar_movimiento_inventario($1,\'merma\',1,\'Ocultar\')',[supply]);
 await rejected('update rest_insumos set stock=99 where id=$1',[supply]);
 await rejected('insert into rest_pedido_items(pedido_id,nombre,cantidad,precio_unitario)values($1,\'x\',1,0)',[id(30)]);
 await as(cook);await rejected('select rest_abrir_caja($1,$2,0)',[company,branch]);
});
await test('cash validates branch and finite amounts; cashier opens normally',async()=>{
 await as(cashier);await rejected('select rest_abrir_caja($1,$2,0)',[company,otherBranch]);
 await rejected('select rest_abrir_caja($1,$2,null)',[company,branch]);
 await rejected("select rest_abrir_caja($1,$2,'NaN')",[company,branch]);
 cash=await one('select * from rest_abrir_caja($1,$2,50)',[company,branch]);assert.ok(cash.id);
});
await test('guarded create succeeds without direct UPDATE and reserves snapshot; outbox is atomic',async()=>{
 await as(waiter);order=await create('order-1');assert.equal(Number(order.total),40);
 assert.equal(Number((await one('select reservado from rest_insumos where id=$1',[supply])).reservado),0.5);
 assert.equal((await one('select count(*)::int n from print_jobs where pedido_id=$1',[order.id])).n,1);
 await rejected('update rest_pedidos set total=1 where id=$1',[order.id]);
});
await test('idempotent retry preserves counts; changed payload is rejected',async()=>{
 assert.equal((await create('order-1')).id,order.id);
 await rejected('select rest_crear_pedido($1,$2,$3,\'salon\',\'Mesa 1\',\'\',$4::jsonb,\'order-1\')',[company,branch,cash.id,JSON.stringify([{productId:product,quantity:3}])]);
 assert.equal((await one('select count(*)::int n from rest_pedido_items where pedido_id=$1',[order.id])).n,1);
});
await test('oversell rolls back order, reservation and print outbox',async()=>{
 const before=(await one('select count(*)::int n from print_jobs')).n;
 await assert.rejects(create('oversell','Mesa 2',JSON.stringify([{productId:product,quantity:1000}])));
 assert.equal((await one('select count(*)::int n from print_jobs')).n,before);
 assert.equal((await one("select count(*)::int n from rest_pedidos where idempotency_key='oversell'")).n,0);
});
await test('recipe edit cannot change the already reserved consumption',async()=>{
 await as(owner);await q('update rest_recetas set cantidad=0.5,cantidad_uso=0.5 where producto_id=$1',[product]);
 await as(cook);await q("select rest_actualizar_estado_pedido($1,'preparando',null)",[order.id]);
 const row=await one('select stock,reservado from rest_insumos where id=$1',[supply]);assert.equal(Number(row.stock),9.5);assert.equal(Number(row.reservado),0);
});
await test('preparation is retryable and never consumes twice',async()=>{
 await q("select rest_actualizar_estado_pedido($1,'preparando',null)",[order.id]);
 assert.equal(Number((await one('select stock from rest_insumos where id=$1',[supply])).stock),9.5);
});
await test('cash cannot close with open orders; legacy APIs cannot bypass',async()=>{
 await as(cashier);await rejected('select rest_cerrar_caja_con_fondo($1,50,0,null)',[cash.id]);await rejected('select rest_cerrar_caja($1,50)',[cash.id]);
 await as(waiter);await rejected('select rest_cerrar_caja_con_fondo($1,50,0,null)',[cash.id]);
});
await test('NULL payment rejected and successful retry does not duplicate consumption',async()=>{
 await as(cook);await q("select rest_actualizar_estado_pedido($1,'listo',null)",[order.id]);await q("select rest_actualizar_estado_pedido($1,'entregado',null)",[order.id]);
 await as(cashier);await rejected("select rest_actualizar_estado_pedido($1,'pagado',null)",[order.id]);
 assert.equal((await one('select estado from rest_pedidos where id=$1',[order.id])).estado,'entregado');
 await q("select rest_actualizar_estado_pedido($1,'pagado','Efectivo')",[order.id]);await q("select rest_actualizar_estado_pedido($1,'pagado','Efectivo')",[order.id]);
 assert.equal(Number((await one('select stock from rest_insumos where id=$1',[supply])).stock),9.5);
});
await test('paid cancellation cannot remove revenue or replenish consumed food',async()=>{
 await as(owner);await rejected('select erp_anular_pedido($1,\'borrar\')',[order.id]);
 assert.equal((await one('select estado from rest_pedidos where id=$1',[order.id])).estado,'pagado');
 assert.equal(Number((await one('select stock from rest_insumos where id=$1',[supply])).stock),9.5);
});
await test('cancel unprepared order releases reservation; prepared cancellation retains consumption',async()=>{
 const a=await create('cancel-raw','Mesa 3');await q('select erp_anular_pedido($1,\'cliente se retiró\')',[a.id]);
 assert.equal(Number((await one('select reservado from rest_insumos where id=$1',[supply])).reservado),0);
 const b=await create('cancel-cooked','Mesa 4');await q("select rest_actualizar_estado_pedido($1,'preparando',null)",[b.id]);
 const stock=Number((await one('select stock from rest_insumos where id=$1',[supply])).stock);
 await q('select erp_anular_pedido($1,\'cliente se retiró\')',[b.id]);
 assert.equal(Number((await one('select stock from rest_insumos where id=$1',[supply])).stock),stock);
});
await test('fiscal reservation rejects role, other tenant, NULL total and changed receiver',async()=>{
 await as(waiter);await rejected("select ef_reservar_documento($1,$2,$3,'boleta','f1',40)",[company,branch,order.id]);
 await as(cashier);await rejected("select ef_reservar_documento($1,$2,$3,'boleta','f1',40)",[other,otherBranch,order.id]);
 await rejected("select ef_reservar_documento($1,$2,$3,'boleta','f1',null)",[company,branch,order.id]);
 const call="select * from ef_reservar_documento($1,$2,$3,'boleta','f1',40)";
 const d=await one(call,[company,branch,order.id]);assert.equal((await one(call,[company,branch,order.id])).id,d.id);
 await rejected("select ef_reservar_documento($1,$2,$3,'boleta','f1',40,'12345678')",[company,branch,order.id]);
});
await test('print lease prevents simultaneous consumers and rejects false completion',async()=>{
 await as(cook);const j=await one('select id from print_jobs where pedido_id=$1',[order.id]);
 const claimed=await one('select * from rest_tomar_impresion($1)',[j.id]);assert.ok(claimed.lease_token);
 assert.equal((await one('select * from rest_tomar_impresion($1)',[j.id])).id,null);
 await rejected("select rest_finalizar_impresion($1,$2,'impreso',null)",[j.id,id(99)]);
 await q("select rest_finalizar_impresion($1,$2,'impreso',null)",[j.id,claimed.lease_token]);
 assert.equal((await one('select estado from print_jobs where id=$1',[j.id])).estado,'impreso');
});
await test('expired physical print becomes uncertain and is never automatically replayed',async()=>{
 await as(owner);const expiryOrder=await create('expiry-print','Mesa 9');await as(cook);
 const j=await one("select id from print_jobs where pedido_id=$1",[expiryOrder.id]);
 await q('select rest_tomar_impresion($1)',[j.id]);await db.exec('reset role');
 await q("update print_jobs set lease_until=now()-interval '1 second' where id=$1",[j.id]);await as(cook);
 await q('select rest_tomar_impresion($1)',[j.id]);assert.equal((await one('select estado from print_jobs where id=$1',[j.id])).estado,'incierto');
 await rejected('select rest_reimprimir($1,\'papel comprobado\')',[j.id]);
 await as(owner);await q('select rest_reimprimir($1,\'papel comprobado\')',[j.id]);
 assert.equal((await one("select count(*)::int n from erp_auditoria where accion='reimprimir'")).n,1);
 await q('select erp_anular_pedido($1,\'prueba finalizada\')',[expiryOrder.id]);
});
await test('creation merged into an existing table remains idempotent after preparation and payment',async()=>{
 await as(owner);const a=await create('merged-a','Mesa 10');const b=await create('merged-b','Mesa 10');assert.equal(a.id,b.id);
 await q("select rest_actualizar_estado_pedido($1,'preparando',null)",[a.id]);
 await q("select rest_actualizar_estado_pedido($1,'listo',null)",[a.id]);
 await q("select rest_actualizar_estado_pedido($1,'entregado',null)",[a.id]);
 await q("select rest_actualizar_estado_pedido($1,'pagado','Efectivo')",[a.id]);
 assert.equal((await create('merged-b','Mesa 10')).id,a.id);
 assert.equal(Number((await one('select total from rest_pedidos where id=$1',[a.id])).total),80);
});
await test('supervisor metadata RPC audits initial stock and rejects silent balance edits',async()=>{
 await as(owner);const call="select * from rest_guardar_insumo($1,$2,'SAL','Sal','Otros','kg',1,0,2,null)";
 const supply=await one(call,[company,branch]);assert.ok(supply.id);
 await rejected("select rest_guardar_insumo($1,$2,'SAL','Sal','Otros','kg',9,0,2,$3)",[company,branch,supply.id]);
 assert.equal(Number((await one('select stock from rest_insumos where id=$1',[supply.id])).stock),1);
 assert.equal((await one("select count(*)::int n from rest_movimientos_inventario where insumo_id=$1",[supply.id])).n,1);
});
await test('closed cash has correct ledger and rejects new writes',async()=>{
 await as(cashier);await q('select rest_cerrar_caja_con_fondo($1,170,0,null)',[cash.id]);
 assert.equal(Number((await one('select monto_esperado from rest_cajas where id=$1',[cash.id])).monto_esperado),170);
 assert.equal(Number((await one('select metodos_cierre from rest_cajas where id=$1',[cash.id])).metodos_cierre.Efectivo),120);
 await rejected("select rest_registrar_movimiento_caja($1,'egreso','posterior',1,'Efectivo')",[cash.id]);
});
await test('tenant isolation and anonymous denial survive wrappers',async()=>{
 assert.equal((await one('select count(*)::int n from rest_sucursales where empresa_id=$1',[other])).n,0);
 await db.exec('reset role;set role anon');await rejected('select rest_abrir_caja($1,$2,0)',[company,branch]);
});
await db.close();
