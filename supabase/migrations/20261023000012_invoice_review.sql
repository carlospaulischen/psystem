-- ============================================================================
-- psystem — Revisão de NFS-e antes do envio (exigência da Andressa)
-- A nota NUNCA vai ao paciente sem confirmação humana: pagamento gera a nota
-- em 'awaiting_review' → profissional revisa a prévia e autoriza → 'approved'.
-- ============================================================================

set search_path to psystem, public;

alter type invoice_status add value if not exists 'awaiting_review';
alter type invoice_status add value if not exists 'approved';

alter table invoices
  add column review_deadline timestamptz,   -- prazo sugerido p/ validar (5 dias)
  add column reviewed_by uuid references profiles (id),
  add column reviewed_at timestamptz;
