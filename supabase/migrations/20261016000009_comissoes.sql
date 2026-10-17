-- Comissão/repasse: % do recebido que fica com o profissional, por org.
set search_path to psystem, public;

alter table organization_members
  add column commission_pct numeric(5,2)
    check (commission_pct is null or (commission_pct >= 0 and commission_pct <= 100));

-- Admin define o repasse de cada membro na org ativa.
create or replace function admin_set_member_commission(p_user uuid, p_pct numeric)
returns void language plpgsql security definer
set search_path = psystem, public as $$
begin
  if not current_member_is_admin() then
    raise exception 'Somente administradores';
  end if;
  if p_pct is not null and (p_pct < 0 or p_pct > 100) then
    raise exception 'Percentual inválido';
  end if;
  update organization_members
     set commission_pct = p_pct
   where organization_id = current_org_id()
     and user_id = p_user;
end;
$$;

-- FIX: baixa manual de pagamento — staff registra recebimento por fora
-- (dinheiro, PIX direto). Antes não havia policy de insert, então
-- "marcar como pago" falhava em silêncio.
create policy payments_staff_insert on payments for insert
  with check (organization_id = current_org_id());
