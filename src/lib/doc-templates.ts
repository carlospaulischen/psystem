// Catálogo de documentos psicológicos — Resolução CFP nº 06/2019.
// Templates dão a estrutura mínima; o profissional revisa antes de emitir.
// template_version documenta qual modelo gerou o texto (auditoria).

export const DOC_TEMPLATE_VERSION = 1;

export const DOC_TYPES = [
  "declaration",
  "certificate",
  "report",
  "multiprofessional_report",
  "psychological_evaluation",
  "referral",
  "laudo",
  "opinion",
  "consent_term",
  "other",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  declaration: "Declaração",
  certificate: "Atestado psicológico",
  report: "Relatório psicológico",
  multiprofessional_report: "Relatório multiprofissional",
  psychological_evaluation: "Avaliação psicológica",
  referral: "Encaminhamento",
  laudo: "Laudo psicológico",
  opinion: "Parecer psicológico",
  consent_term: "Termo de autorização",
  other: "Outro",
};

// Regras exibidas ao psicólogo conforme o tipo escolhido.
export const DOC_RULES: Record<DocType, string[]> = {
  declaration: [
    "Apenas o fato objetivo: comparecimento, data e horário.",
    "Não inclua sintomas, diagnóstico, CID ou estado psicológico.",
    "Nunca declare presença de um atendimento que não ocorreu.",
  ],
  certificate: [
    "Exige avaliação psicológica e fundamentação registrada no prontuário.",
    "CID ou informação diagnóstica somente com autorização expressa do paciente.",
    "O sistema não gera conclusão de aptidão ou afastamento — redija com respaldo técnico.",
  ],
  report: [
    "Informe finalidade e destinatário.",
    "Selecione apenas o que é pertinente do acompanhamento — não transcreva o prontuário.",
    "Registre o período e os procedimentos realizados.",
  ],
  multiprofessional_report: [
    "Identifique a autoria e a responsabilidade de cada profissional participante.",
    "Compartilhe apenas o necessário à finalidade.",
  ],
  psychological_evaluation: [
    "Vincule a um processo de avaliação psicológica em andamento ou concluído.",
    "Registre procedimentos e instrumentos utilizados.",
  ],
  referral: [
    "Compartilhe apenas as informações estritamente necessárias ao destino.",
    "Registre se o encaminhamento foi escolha do paciente, sugestão sua ou decisão conjunta.",
    "O prontuário completo nunca é anexado.",
  ],
  laudo: [
    "Deve estar vinculado a um processo de avaliação psicológica documentado.",
    "Liste os procedimentos e instrumentos utilizados.",
    "Nenhuma conclusão avaliativa é gerada automaticamente.",
  ],
  opinion: [
    "Exige a questão técnica a responder — não é um relatório de acompanhamento.",
    "Registre a fundamentação técnico-científica.",
  ],
  consent_term: [
    "Descreva exatamente o que será compartilhado, com quem e para quê.",
    "Registre a forma de coleta do consentimento e seu prazo.",
  ],
  other: ["Aplique as regras gerais: finalidade, dados mínimos e revisão antes de emitir."],
};

interface TemplateContext {
  patientName: string;
  psychologistName: string;
  crp?: string | null;
  appointmentLabel?: string | null; // ex.: "10/10/2026 às 14:00 (online)"
}

// Texto-base sugerido por tipo. O conteúdo é apenas um ponto de partida —
// o psicólogo edita e a emissão sempre passa por revisão humana.
export function docTemplate(type: string, ctx: TemplateContext): string {
  const { patientName: p, appointmentLabel: appt } = ctx;
  switch (type) {
    case "declaration":
      return [
        "DECLARAÇÃO",
        "",
        `Declaro, para os devidos fins, que ${p} ${
          appt
            ? `esteve em atendimento psicológico no dia ${appt}`
            : "esteve em atendimento psicológico no dia ___/___/______, das ___:___ às ___:___"
        }.`,
        "",
        "[Se pertinente: informar acompanhamento em curso ou período de acompanhamento, sem descrever conteúdo clínico.]",
        "",
        "Por se tratar de declaração verdadeira, firmo o presente documento.",
      ].join("\n");
    case "certificate":
      return [
        "ATESTADO PSICOLÓGICO",
        "",
        `Atesto, para os devidos fins, que ${p} encontra-se em acompanhamento psicológico neste serviço.`,
        "",
        "Finalidade do atestado: [informar].",
        "Condição atestada: [descrever objetivamente; incluir CID apenas com autorização expressa do paciente].",
        "Período de afastamento/acompanhamento recomendado: [informar, se aplicável].",
        "Fundamentação: [referenciar avaliação psicológica que subsidia o atestado].",
      ].join("\n");
    case "referral":
      return [
        "ENCAMINHAMENTO",
        "",
        `Paciente: ${p}`,
        "Encaminhado(a) a: [profissional/serviço de destino]",
        "Motivo e objetivo: [descrever]",
        "Síntese pertinente do acompanhamento: [apenas o necessário à finalidade]",
        "",
        "Origem da indicação: [escolha do paciente / sugestão do psicólogo / decisão conjunta]",
        "Autorização para compartilhamento: [descrever base: consentimento do paciente, termo anexo etc.]",
      ].join("\n");
    case "report":
      return [
        "RELATÓRIO PSICOLÓGICO",
        "",
        `Paciente: ${p}`,
        "Período de acompanhamento: [___/___/____ a ___/___/____]",
        "",
        "1. Descrição da demanda\n[informar]",
        "",
        "2. Procedimentos realizados\n[informar]",
        "",
        "3. Análise\n[informar — selecionar apenas o pertinente à finalidade]",
        "",
        "4. Conclusão\n[informar]",
        "",
        "5. Referências\n[se aplicável]",
      ].join("\n");
    case "multiprofessional_report":
      return [
        "RELATÓRIO MULTIPROFISSIONAL",
        "",
        `Paciente: ${p}`,
        "Profissionais participantes: [nome, profissão e registro de cada um]",
        "",
        "1. Descrição da demanda\n[informar]",
        "",
        "2. Procedimentos realizados por área\n[informar, identificando a autoria de cada participante]",
        "",
        "3. Análise integrada\n[informar]",
        "",
        "4. Conclusão\n[informar]",
        "",
        "5. Referências\n[se aplicável]",
      ].join("\n");
    case "laudo":
      return [
        "LAUDO PSICOLÓGICO",
        "",
        `Avaliado(a): ${p}`,
        "Processo de avaliação psicológica: [identificar/período]",
        "",
        "1. Descrição da demanda\n[informar]",
        "",
        "2. Procedimentos e instrumentos utilizados\n[listar entrevistas, testes, observações — com datas]",
        "",
        "3. Análise\n[informar]",
        "",
        "4. Conclusão\n[informar — fundamentada nos procedimentos descritos]",
        "",
        "5. Referências\n[se aplicável]",
      ].join("\n");
    case "opinion":
      return [
        "PARECER PSICOLÓGICO",
        "",
        "Questão técnica apresentada: [descrever a questão do campo da Psicologia a ser respondida]",
        "",
        "1. Análise técnica\n[informar — fundamentação técnico-científica]",
        "",
        "2. Conclusão\n[informar]",
        "",
        "Referências\n[se aplicável]",
      ].join("\n");
    case "consent_term":
      return [
        "TERMO DE AUTORIZAÇÃO",
        "",
        `Eu, ${p}, autorizo o compartilhamento das informações descritas abaixo.`,
        "",
        "Informações a compartilhar: [descrever exatamente o quê]",
        "Com quem: [destinatário/serviço]",
        "Para qual finalidade: [descrever]",
        "Prazo de validade: [informar]",
        "",
        "Estou ciente de que posso revogar esta autorização a qualquer tempo.",
      ].join("\n");
    default:
      return "";
  }
}
