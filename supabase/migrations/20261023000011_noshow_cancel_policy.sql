-- ============================================================================
-- psystem — Política de falta/cancelamento por profissional (por org)
-- + envio de NFS-e sempre manual (confirmação do psicólogo — nunca automático)
-- ============================================================================

set search_path to psystem, public;

-- Cobrança quando o paciente falta (no_show):
--   'full'    → cobra o valor integral da sessão
--   'percent' → cobra noshow_percent % do valor
--   'none'    → não gera cobrança
-- cancel_min_hours: até quantas horas antes o paciente pode cancelar no portal.
alter table organization_members
  add column noshow_policy text not null default 'full'
    check (noshow_policy in ('full', 'percent', 'none')),
  add column noshow_percent smallint not null default 100
    check (noshow_percent between 0 and 100),
  add column cancel_min_hours smallint not null default 24
    check (cancel_min_hours between 0 and 720);

-- O membro edita a própria política na org ativa (escrita direta revogada).
create or replace function update_my_billing_policy(
  p_noshow_policy text,
  p_noshow_percent integer,
  p_cancel_min_hours integer
)
returns void
language plpgsql
security definer
set search_path = psystem, public
as $$
begin
  if p_noshow_policy not in ('full', 'percent', 'none') then
    raise exception 'invalid_policy';
  end if;

  update organization_members
     set noshow_policy = p_noshow_policy,
         noshow_percent = greatest(0, least(coalesce(p_noshow_percent, 100), 100)),
         cancel_min_hours = greatest(0, least(coalesce(p_cancel_min_hours, 24), 720))
   where organization_id = current_org_id()
     and user_id = auth.uid();
end;
$$;

-- Cancelamento pelo paciente no portal: só a própria consulta, somente se
-- estiver dentro da janela configurada pelo psicólogo (cancel_min_hours).
create or replace function cancel_own_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = psystem, public
as $$
declare
  v_appt appointments%rowtype;
  v_min_hours integer;
begin
  select * into v_appt from appointments where id = p_appointment_id;

  if not found or not is_patient_portal_user(v_appt.patient_id) then
    raise exception 'not_allowed';
  end if;

  if v_appt.status not in ('scheduled', 'awaiting_confirmation', 'confirmed') then
    raise exception 'not_cancellable';
  end if;

  select cancel_min_hours into v_min_hours
    from organization_members
   where organization_id = v_appt.organization_id
     and user_id = v_appt.psychologist_id
     and status = 'active';
  v_min_hours := coalesce(v_min_hours, 24);

  if now() > v_appt.starts_at - make_interval(hours => v_min_hours) then
    raise exception 'cancel_window_expired';
  end if;

  update appointments
     set status = 'cancelled', updated_at = now()
   where id = p_appointment_id;
end;
$$;

-- Janela de cancelamento que o portal exibe ao paciente (paciente não lê
-- organization_members — resolve pelo vínculo ativo dele).
create or replace function my_cancel_min_hours()
returns integer
language plpgsql
stable
security definer
set search_path = psystem, public
as $$
declare
  v_patient uuid;
  v_link record;
  v_hours integer;
begin
  select patient_id into v_patient
    from patient_accounts where user_id = auth.uid();
  if v_patient is null then
    return null;
  end if;

  select psychologist_id, organization_id into v_link
    from patient_links
   where patient_id = v_patient and status = 'active';
  if not found then
    return null;
  end if;

  select cancel_min_hours into v_hours
    from organization_members
   where organization_id = v_link.organization_id
     and user_id = v_link.psychologist_id
     and status = 'active';

  return coalesce(v_hours, 24);
end;
$$;

-- NFS-e: envio ao paciente é SEMPRE uma ação explícita do profissional —
-- a integração emite a nota, mas quem confirma o envio é humano. Estas
-- colunas registram quando/para quem/por quem a nota foi entregue.
alter table invoices
  add column sent_to text,
  add column sent_channel text,
  add column sent_by uuid references profiles (id),
  add column sent_at timestamptz;
