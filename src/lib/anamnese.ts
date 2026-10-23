// Anamnese — modelo padrão do sistema + tipos compartilhados.
// O psicólogo pode editar as perguntas (cada abordagem pergunta diferente).

export interface AnamnesisQuestion {
  q: string;
  type: "short" | "long" | "yesno";
}

export interface AnamnesisAnswer {
  q: string;
  a: string;
}

export const QUESTION_TYPE_LABEL: Record<AnamnesisQuestion["type"], string> = {
  short: "Resposta curta",
  long: "Texto livre",
  yesno: "Sim / Não",
};

export const DEFAULT_ANAMNESIS: AnamnesisQuestion[] = [
  { q: "O que o(a) trouxe ao atendimento psicológico?", type: "long" },
  { q: "Quando essas questões começaram?", type: "short" },
  {
    q: "Já realizou acompanhamento psicológico anteriormente? Como foi a experiência?",
    type: "long",
  },
  { q: "Faz uso de medicações? Quais?", type: "short" },
  { q: "Possui alguma condição de saúde relevante?", type: "short" },
  { q: "Como estão seu sono e sua alimentação?", type: "long" },
  {
    q: "Conte um pouco sobre sua família e relações importantes.",
    type: "long",
  },
  {
    q: "Como é sua rotina atual (trabalho, estudos, lazer)?",
    type: "long",
  },
  {
    q: "Existe alguma questão legal ou judicial envolvida no seu caso?",
    type: "yesno",
  },
  { q: "O que você espera do processo terapêutico?", type: "long" },
];
