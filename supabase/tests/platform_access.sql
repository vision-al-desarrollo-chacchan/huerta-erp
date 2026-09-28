-- Transactional integration test. All fixtures and temporary privileges roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,aud,role)
values ('00000000-0000-4000-8000-000000000091','platform-test@example.invalid','{}','{}','authenticated','authenticated'),
('00000000-0000-4000-8000-000000000092','owner-test@example.invalid','{}','{}','authenticated','authenticated');
insert into platform_private.superadmin(user_id) values('00000000-0000-4000-8000-000000000091');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
set local role authenticated;
do $$
declare company_id uuid; companies jsonb;
begin
  if not public.platform_is_superadmin() then raise exception 'FAIL: platform account denied'; end if;
  company_id := public.platform_create_company('Prueba transaccional','owner-test@example.invalid');
  perform public.platform_save_plan(company_id,'Prueba','2030-01-01');
  companies := public.platform_list_companies();
  if not exists(select 1 from jsonb_array_elements(companies) e where e->>'id'=company_id::text and e->>'plan'='Prueba' and (e->>'usuarios')::int=1) then raise exception 'FAIL: company/owner/plan not provisioned'; end if;
  begin
    perform public.platform_create_company('Duplicada','owner-test@example.invalid');
    raise exception 'FAIL: duplicate owner accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
set local role authenticated;
do $$
declare company_id uuid; branch_id uuid;
begin
  if public.platform_is_superadmin() then raise exception 'FAIL: tenant owner has platform access'; end if;
  if not public.platform_is_protected_account('00000000-0000-4000-8000-000000000091') then raise exception 'FAIL: protected account not recognized'; end if;
  select empresa_id,sucursal_id into company_id,branch_id from public.rest_crear_empresa_inicial();
  if company_id is null or branch_id is null then raise exception 'FAIL: owner missing context'; end if;
  if (select count(*) from public.rest_empresas) <> 1 then raise exception 'FAIL: cross-tenant company access'; end if;
  if exists(select 1 from public.rest_productos) or exists(select 1 from public.rest_pedidos) then raise exception 'FAIL: new tenant reads existing business data'; end if;
  begin perform public.platform_list_companies(); raise exception 'FAIL: list allowed'; exception when insufficient_privilege then null; end;
  begin perform public.platform_create_company('Prohibida','owner-test@example.invalid'); raise exception 'FAIL: create allowed'; exception when insufficient_privilege then null; end;
  begin perform public.platform_save_plan(company_id,'Gratis',null); raise exception 'FAIL: plan allowed'; exception when insufficient_privilege then null; end;
  begin insert into platform_private.superadmin(user_id) values(auth.uid()); raise exception 'FAIL: self-escalation allowed'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$
begin
  begin perform public.platform_is_superadmin(); raise exception 'FAIL: anonymous RPC access'; exception when insufficient_privilege then null; end;
  begin perform public.platform_list_companies(); raise exception 'FAIL: anonymous list'; exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
select 'PASS: platform authorization, tenant isolation, creation, plans, duplicate-owner rejection, anonymous denial and self-escalation denial' as result;
