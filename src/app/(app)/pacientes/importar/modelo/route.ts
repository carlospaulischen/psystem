import { requireStaff } from "@/lib/auth";

// Modelo de importação — separador ';' abre direto no Excel pt-BR.
export async function GET() {
  await requireStaff();

  const csv =
    "﻿" +
    [
      "nome;email;telefone;cpf;data_nascimento;observacoes;psicologo",
      "Maria Exemplo da Silva;maria@email.com;(11) 98765-4321;123.456.789-00;15/03/1990;Paciente encaminhada pela Dra. Ana;Ana Souza",
      "João Exemplo;;;;01/02/1985;;",
    ].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-pacientes.csv"',
    },
  });
}
