/** Destructive fixture setup ONLY in a disposable local database named huerta_test_*. Never accepts production hosts/names. */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createPosFixture } from '../supabase/functions/_shared/sunat-signing/pos-fixture.mjs';
const connection = process.env.HUERTA_TEST_DATABASE_URL;
if (!connection) throw new Error('Set HUERTA_TEST_DATABASE_URL to a disposable local PostgreSQL test database.');
const url = new URL(connection);
if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || !/^\/huerta_test_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Refusing a non-local or non-test database.');
function sql(statement) {
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',['--no-psqlrc','-v','ON_ERROR_STOP=1','-At',connection,'-c',statement],{stdio:['ignore','pipe','pipe']});
  let output='',error='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>error+=v);
  child.on('error',reject);child.on('close',code=>code===0?resolve(output.trim()):reject(new Error(error.trim())));
 });
}
const startup=[];
const collector={exec:async s=>{startup.push(s);},transaction:async f=>f({exec:async s=>startup.push(s)})};
await createPosFixture({database:collector});
// Native PostgreSQL uses real pgcrypto, not the PGlite-only invitation default stub.
const setup=startup.join('\n').replace("create function public.gen_random_bytes(integer) returns bytea language sql as $$select decode(repeat('00',$1),'hex')$$;",'');
await sql('begin;create extension pgcrypto;'+setup+'commit;');
const id=n=>`${String(n).padStart(8,'0')}-2222-4222-8222-222222222222`;
const c=id(1),b=id(2),owner=id(3),waiter=id(4),cashier=id(5),cook=id(6),p=id(7),i=id(8);
const as=(user,statement)=>`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${user}',true);${statement};commit;`;
const tail=out=>out.split('\n').filter(x=>x&&x!=='BEGIN'&&x!=='COMMIT'&&x!=='SET'&&x!==owner&&x!==waiter&&x!==cashier&&x!==cook).at(-1);
await sql(`insert into auth.users(id,email)values('${owner}','owner@fixture.invalid'),('${waiter}','waiter@fixture.invalid'),('${cashier}','cashier@fixture.invalid'),('${cook}','cook@fixture.invalid');
insert into rest_empresas(id,nombre)values('${c}','Native fixture');
insert into rest_sucursales(id,empresa_id,nombre)values('${b}','${c}','Local');
insert into rest_miembros(empresa_id,user_id,rol,roles)values('${c}','${owner}','propietario',array['propietario']),('${c}','${waiter}','mozo',array['mozo']),('${c}','${cashier}','cajero',array['cajero']),('${c}','${cook}','cocina',array['cocina']);
insert into rest_productos(id,empresa_id,nombre,categoria,precio)values('${p}','${c}','Pollo','Pollos',20);
insert into rest_insumos(id,empresa_id,sucursal_id,codigo,nombre,unidad,stock,costo_promedio)values('${i}','${c}','${b}','POLLO','Pollo','unidad',10,8);
insert into print_configuraciones(empresa_id,sucursal_id,area,nombre_impresora)values('${c}','${b}','cocina','Fixture');`);
await sql(as(owner,`insert into rest_recetas(empresa_id,producto_id,insumo_id,cantidad)values('${c}','${p}','${i}',0.25)`));
await assert.rejects(sql(as(waiter,`select rest_abrir_caja('${c}','${b}',50)`)),/permiso|acceso/i);
const cash=tail(await sql(as(cashier,`select id from rest_abrir_caja('${c}','${b}',50)`)));
assert.match(cash,/^[0-9a-f-]{36}$/);
const item=JSON.stringify([{productId:p,quantity:2}]);
const create=(key,table)=>as(waiter,`select id from rest_crear_pedido('${c}','${b}','${cash}','salon','${table}','','${item}'::jsonb,'${key}')`);
const simultaneous=await Promise.all([sql(create('same','Mesa 1')),sql(create('same','Mesa 1'))]);
const order=tail(simultaneous[0]);assert.equal(tail(simultaneous[1]),order);
assert.equal(tail(await sql(`select count(*) from rest_pedidos where empresa_id='${c}'`)),'1');
assert.equal(tail(await sql(`select count(*) from print_jobs where pedido_id='${order}'`)),'1');
console.log('PASS native independent connections: same operation produces one order and one outbox job');
await sql(as(cook,`select rest_actualizar_estado_pedido('${order}','preparando',null);select rest_actualizar_estado_pedido('${order}','listo',null);select rest_actualizar_estado_pedido('${order}','entregado',null)`));
const pay=as(cashier,`select rest_actualizar_estado_pedido('${order}','pagado','Efectivo')`);
await Promise.all([sql(pay),sql(pay)]);
assert.equal(Number(tail(await sql(`select stock from rest_insumos where id='${i}'`))),9.5);
assert.equal(Number(tail(await sql(`select sum(total) from rest_pedidos where caja_id='${cash}' and estado='pagado'`))),40);
console.log('PASS native independent connections: duplicate payment cannot duplicate revenue or inventory consumption');
// A second order exercises pay versus close. Hold the same cash lock briefly in one connection.
const second=tail(await sql(create('second','Mesa 2')));
await sql(as(cook,`select rest_actualizar_estado_pedido('${second}','preparando',null);select rest_actualizar_estado_pedido('${second}','listo',null);select rest_actualizar_estado_pedido('${second}','entregado',null)`));
// Test-only server delay: cashier has no direct UPDATE/FOR UPDATE privilege on cash tables.
await sql(`create function public.fixture_delayed_pay(p_order uuid,p_cash uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 perform 1 from public.rest_cajas where id=p_cash for update;perform pg_sleep(0.25);
 perform public.rest_actualizar_estado_pedido(p_order,'pagado','Efectivo');end$$;`);
const slowPay=as(cashier,`select fixture_delayed_pay('${second}','${cash}')`);
const close=as(cashier,`select rest_cerrar_caja_con_fondo('${cash}',130,0,null)`);
const race=await Promise.allSettled([sql(slowPay),sql(close)]);
assert.equal(race[0].status,'fulfilled');
if(race[1].status==='rejected'){
 assert.match(race[1].reason.message,/pedidos abiertos/);await sql(close);
}
const report=JSON.parse(tail(await sql(`select json_build_object('expected',monto_esperado,'counted',monto_cierre,'cash',metodos_cierre->'Efectivo','state',estado) from rest_cajas where id='${cash}'`)));
assert.deepEqual(report,{expected:130,counted:130,cash:80,state:'cerrada'});
await assert.rejects(sql(as(cashier,`select rest_registrar_movimiento_caja('${cash}','egreso','late',1,'Efectivo')`)),/cerrada/);
console.log('PASS native independent connections: pay/close is serialized; immutable snapshot includes every accepted payment');
// Separate stock contention: reservation versus a manual adjustment, from two genuine sessions.
const nextCash=tail(await sql(as(cashier,`select id from rest_abrir_caja('${c}','${b}',0)`)));
await sql(as(owner,`select rest_registrar_movimiento_inventario('${i}','ajuste',-8,'Fixture count')`));
const contention=await Promise.allSettled([
 sql(as(waiter,`select rest_crear_pedido('${c}','${b}','${nextCash}','salon','Mesa 3','','${item}'::jsonb,'reserve-race')`)),
 sql(as(owner,`select rest_registrar_movimiento_inventario('${i}','merma',1,'Fixture loss')`)),
]);
assert.equal(contention.filter(x=>x.status==='fulfilled').length,1);
const stock=JSON.parse(tail(await sql(`select json_build_object('stock',stock,'reserved',reservado) from rest_insumos where id='${i}'`)));
assert.ok(stock.stock>=0&&stock.reserved>=0&&stock.reserved<=stock.stock);
console.log('PASS native independent connections: reservation versus waste preserves available-stock invariants');
console.log('Native tests complete. Only disposable fixture database used; no network calls to Supabase or SUNAT.');
