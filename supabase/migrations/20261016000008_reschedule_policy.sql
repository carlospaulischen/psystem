-- Política de reagendamento por profissional (por org — pode ser diferente
-- na clínica vs. no consultório particular dele).
set search_path to psystem, public;

alter table organization_members
  add column reschedule_enabled boolean not null default true,
  add column reschedule_min_hours smallint not null default 0
    check (reschedule_min_hours between 0 and 720),
  add column reschedule_within_availability boolean not null default false;

-- O membro edita a própria política na org ativa (escrita direta na tabela
-- está revogada — passa por aqui).
create or replace function update_my_scheduling_policy(
  p_enabled boolean,
  p_min_hours integer,
  p_within_availability boolean
)
returns void language plpgsql security definer
set search_path = psystem, public as $$
begin
  update organization_members
     set reschedule_enabled = p_enabled,
         reschedule_min_hours = greatest(0, least(coalesce(p_min_hours, 0), 720)),
         reschedule_within_availability = p_within_availability
   where organization_id = current_org_id()
     and user_id = auth.uid();
end;
$$;
