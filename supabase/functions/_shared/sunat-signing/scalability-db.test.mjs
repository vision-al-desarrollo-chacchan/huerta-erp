import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
create schema vault;create table vault.secrets(name text,secret text);create view vault.decrypted_secrets as select name,secret as decrypted_secret from vault.secrets;
create function vault.create_secret(value text,name text,description text) returns uuid language plpgsql as $$begin insert into vault.secrets values(name,value);return gen_random_uuid();end$$;
create schema extensions;create function extensions.gen_random_bytes(integer) returns bytea language sql as $$select decode(repeat('00',$1),'hex')$$;
create schema sunat_private;grant usage on schema sunat_private to service_role;
create table rest_empresas(id uuid primary key,ruc text,activa boolean);
create table rest_miembros(empresa_id uuid,user_id uuid,rol text,activo boolean);
create table rest_pedidos(id uuid primary key,updated_at timestamptz);
create table rest_pedido_items(id uuid default gen_random_uuid(),pedido_id uuid references rest_pedidos(id),nombre text);
create table ef_documentos(id uuid primary key,empresa_id uuid,estado text,transmision_iniciada_at timestamptz,ultimo_intento_at timestamptz);
create table ef_configuraciones(empresa_id uuid,activo boolean,ambiente text,proveedor text);
create table ef_sunat_habilitaciones(empresa_id uuid,ruc text,certificado_huella text,aprobada boolean,revisada_at timestamptz);
create table ef_sunat_certificados(empresa_id uuid,huella text);
create table erp_clientes(id uuid,empresa_id uuid,created_at timestamptz);
create table erp_proveedores(id uuid,empresa_id uuid,created_at timestamptz);
create table erp_documentos(id uuid,empresa_id uuid,created_at timestamptz);
create table erp_cotizaciones(id uuid,empresa_id uuid,created_at timestamptz);
create table erp_tareas(id uuid,empresa_id uuid,fecha date);
grant usage on schema public to anon,authenticated,service_role;
grant all on all tables in schema public to service_role;
insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into rest_empresas values('11111111-1111-4111-8111-111111111111','20123456789',true);
insert into rest_miembros values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','propietario',true);
insert into ef_configuraciones values('11111111-1111-4111-8111-111111111111',true,'produccion','sunat');
insert into ef_sunat_habilitaciones values('11111111-1111-4111-8111-111111111111','20123456789','hash',true,now());
insert into ef_sunat_certificados values('11111111-1111-4111-8111-111111111111','hash');`);
await db.exec(readFileSync(new URL('../../../migrations/20261013200222_scalability_queue_and_indexes.sql',import.meta.url),'utf8'));
for(const role of ['anon','authenticated']){
 await db.exec(`set role ${role}`);
 await assert.rejects(db.query('select * from ef_sunat_trabajos'));
 await assert.rejects(db.query('select ef_sunat_worker_key()'));
 await assert.rejects(db.query('select ef_sunat_tomar_trabajos()'));
 await db.exec('reset role');
}
const ids=['22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
for(const id of ids)await db.query("insert into ef_documentos(id,empresa_id,estado)values($1,'11111111-1111-4111-8111-111111111111','pendiente')",[id]);
await db.exec('set role service_role');
const enqueue=id=>db.query("select ef_sunat_encolar($1,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')",[id]);
for(const id of ids)await enqueue(id);
await enqueue(ids[0]);assert.equal((await db.query('select count(*)::int as n from ef_sunat_trabajos')).rows[0].n,3);
await assert.rejects(db.query("select ef_sunat_encolar($1,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')",[ids[0]]));
const claim=()=>db.query('select * from ef_sunat_tomar_trabajos()');
const first=(await claim()).rows;assert.equal(first.length,2);assert.equal((await claim()).rows.length,0);
// Wrong lease cannot finish or free a slot.
await db.query("select ef_sunat_finalizar_trabajo($1,gen_random_uuid(),'done')",[first[0].documento_id]);assert.equal((await claim()).rows.length,0);
await db.query("select ef_sunat_finalizar_trabajo($1,$2,'consult')",[first[0].documento_id,first[0].lease_token]);
assert.equal((await claim()).rows.length,1);
const job=(await db.query("select * from ef_sunat_trabajos where documento_id=$1",[first[0].documento_id])).rows[0];assert.equal(job.accion,'consultar');
// A transmission marker prevents recovery from ever re-enqueueing a send.
await db.query('update ef_documentos set transmision_iniciada_at=now(),estado=\'incierto\' where id=$1',[first[1].documento_id]);
await db.query("update ef_sunat_trabajos set lease_until=now()-interval '1 minute' where documento_id=$1",[first[1].documento_id]);
await claim();assert.equal((await db.query('select estado from ef_sunat_trabajos where documento_id=$1',[first[1].documento_id])).rows[0].estado,'blocked');
assert.equal((await enqueue(first[1].documento_id)).rows[0].ef_sunat_encolar,'incierto');
await db.exec('reset role');
await db.query("insert into rest_pedidos values($1,'2000-01-01')",[ids[0]]);
await db.query("insert into rest_pedido_items(pedido_id,nombre)values($1,'a'),($1,'b')",[ids[0]]);
assert.ok(new Date((await db.query('select updated_at from rest_pedidos')).rows[0].updated_at).getFullYear()>2000);
console.log('PASS queue isolation, ownership, idempotency, global concurrency, lease fencing, no resend after transmission, parent item notification');
// 100 fictitious tenants, 100,000 history rows: ordered list uses the covering index.
await db.exec(`insert into erp_clientes(id,empresa_id,created_at)
 select gen_random_uuid(),md5(t::text)::uuid,'2026-01-01'::timestamptz+r*interval '1 minute'
 from generate_series(1,100)t cross join generate_series(1,1000)r;analyze erp_clientes;`);
const history=await db.query("select id,empresa_id from erp_clientes where empresa_id=md5('42')::uuid order by created_at desc,id desc limit 100");
assert.equal(history.rows.length,100);assert.equal(new Set(history.rows.map(r=>r.empresa_id)).size,1);
const plan=await db.query("explain select id,empresa_id from erp_clientes where empresa_id=md5('42')::uuid order by created_at desc,id desc limit 100");
assert.match(JSON.stringify(plan.rows),/erp_clientes_list_idx/);
console.log('PASS local 100 fictitious tenants / 100,000 records: bounded history page uses tenant index (not a production capacity benchmark)');
await db.close();
