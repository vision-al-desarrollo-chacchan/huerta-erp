import { createPosFixture } from './pos-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
const { db, migration } = await createPosFixture({applyFix:false});
const fix = migration('20261023045405_pos_security_integrity.sql');
const c='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',u='33333333-3333-4333-8333-333333333333';
const i='44444444-4444-4444-8444-444444444444',o='55555555-5555-4555-8555-555555555555',cash='66666666-6666-4666-8666-666666666666',other='77777777-7777-4777-8777-777777777777';
const q=(sql,args=[])=>db.query(sql,args);
await db.exec(`insert into auth.users(id,email)values('${u}','upgrade@example.invalid');
insert into rest_empresas(id,nombre)values('${c}','Legacy fixture');
insert into rest_sucursales(id,empresa_id,nombre)values('${b}','${c}','Primary');
insert into rest_miembros(empresa_id,user_id,rol,roles)values('${c}','${u}','propietario',array['propietario']);
insert into rest_insumos(id,empresa_id,codigo,nombre,unidad,stock,costo_promedio)values('${i}','${c}','POLLO','Pollo','unidad',7.25,8);
insert into rest_cajas(id,empresa_id,sucursal_id,abierta_por,estado,monto_apertura,monto_cierre,monto_esperado,diferencia)values('${cash}','${c}','${b}','${u}','cerrada',50,90,90,0);
insert into rest_pedidos(id,empresa_id,sucursal_id,caja_id,creado_por,estado,total,tipo_servicio,inventario_descontado)values('${o}','${c}','${b}','${cash}','${u}','pagado',40,'recojo',true);`);
await test('migration aborts with open orders and rolls back all schema changes',async()=>{
 await q("update rest_pedidos set estado='nuevo' where id=$1",[o]);
 await assert.rejects(db.transaction(tx=>tx.exec(fix)),/pedidos abiertos/);
 assert.equal((await q("select count(*)::int n from information_schema.columns where table_name='rest_insumos' and column_name='sucursal_id'")).rows[0].n,0);
 await q("update rest_pedidos set estado='pagado' where id=$1",[o]);
});
await test('migration rejects ambiguous legacy stock instead of duplicating it',async()=>{
 await q('insert into rest_sucursales(id,empresa_id,nombre)values($1,$2,\'Second\')',[other,c]);
 await assert.rejects(db.transaction(tx=>tx.exec(fix)),/inventario legado/);
 assert.equal(Number((await q('select stock from rest_insumos where id=$1',[i])).rows[0].stock),7.25);
 await q('delete from rest_sucursales where id=$1',[other]);
});
await test('successful upgrade preserves stock, paid order and immutable closed totals',async()=>{
 await db.transaction(tx=>tx.exec(fix));
 const supply=(await q('select stock,costo_promedio,sucursal_id,reservado from rest_insumos where id=$1',[i])).rows[0];
 assert.equal(Number(supply.stock),7.25);assert.equal(Number(supply.costo_promedio),8);assert.equal(supply.sucursal_id,b);assert.equal(Number(supply.reservado),0);
 const order=(await q('select estado,total,inventario_descontado,pagado_at from rest_pedidos where id=$1',[o])).rows[0];
 assert.equal(order.estado,'pagado');assert.equal(Number(order.total),40);assert.equal(order.inventario_descontado,true);assert.ok(order.pagado_at);
 const report=(await q('select monto_cierre,monto_esperado,diferencia from rest_cajas where id=$1',[cash])).rows[0];
 assert.deepEqual([report.monto_cierre,report.monto_esperado,report.diferencia].map(Number),[90,90,0]);
});
await db.close();
