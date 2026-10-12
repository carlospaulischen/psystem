-- Rotinas agendadas via pg_cron + pg_net.
-- daily-jobs roda 11:00 UTC (08:00 em São Paulo): marca cobranças vencidas
-- e dispara lembretes de consulta por e-mail (templates neutros, ET-015).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove agendamento anterior, se houver (idempotente).
do $$
begin
  perform cron.unschedule('daily-jobs');
exception when others then
  null;
end $$;

-- Em produção, apontar para a URL do projeto (https://<ref>.functions.supabase.co/daily-jobs)
-- e configurar CRON_SECRET + header x-cron-secret.
select cron.schedule(
  'daily-jobs',
  '0 11 * * *',
  $$
    select net.http_post(
      url := 'http://kong:8000/functions/v1/daily-jobs',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
