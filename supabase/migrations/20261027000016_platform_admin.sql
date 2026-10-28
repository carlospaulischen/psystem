-- ============================================================================
-- psystem — Platform admin (camada SaaS): quem gerencia tenants/orgs.
-- Não é papel de org — é flag no profile (você, dono do produto).
-- ============================================================================

alter table psystem.profiles
  add column is_platform_admin boolean not null default false;
