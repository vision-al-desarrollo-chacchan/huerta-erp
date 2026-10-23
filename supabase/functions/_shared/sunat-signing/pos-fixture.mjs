import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export async function createPosFixture({ applyFix = true, database } = {}) {
const db = database ?? new PGlite();
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
if (applyFix) await db.transaction(tx => tx.exec(migration('20261023045405_pos_security_integrity.sql')));
return { db, migration };

}
