"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveAnamnesisTemplate, type InviteState } from "./actions";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  QUESTION_TYPE_LABEL,
  type AnamnesisQuestion,
} from "@/lib/anamnese";

const TYPES: AnamnesisQuestion["type"][] = ["short", "long", "yesno"];

// Editor do modelo de anamnese — o psicólogo adapta as perguntas à sua
// abordagem. O JSON das perguntas vai num campo oculto no submit.
export function AnamnesisEditor({
  initial,
}: {
  initial: AnamnesisQuestion[];
}) {
  const [questions, setQuestions] = useState<AnamnesisQuestion[]>(initial);
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    saveAnamnesisTemplate,
    null,
  );

  const update = (i: number, patch: Partial<AnamnesisQuestion>) =>
    setQuestions((qs) =>
      qs.map((q, j) => (j === i ? { ...q, ...patch } : q)),
    );

  const move = (i: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form action={formAction} className="grid gap-4">
      <input
        type="hidden"
        name="questions"
        value={JSON.stringify(questions)}
      />

      <ul className="space-y-2">
        {questions.map((q, i) => (
          <li
            key={i}
            className="flex items-center gap-2 rounded-md border border-border p-2"
          >
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
              {i + 1}
            </span>
            <Input
              value={q.q}
              onChange={(e) => update(i, { q: e.target.value })}
              placeholder="Pergunta"
              className="flex-1"
            />
            <select
              value={q.type}
              onChange={(e) =>
                update(i, {
                  type: e.target.value as AnamnesisQuestion["type"],
                })
              }
              className="h-9 rounded-md border border-input bg-transparent px-2 text-xs outline-none"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Mover para cima"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === questions.length - 1}
              className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Mover para baixo"
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setQuestions((qs) => qs.filter((_, j) => j !== i))
              }
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              title="Remover pergunta"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setQuestions((qs) => [...qs, { q: "", type: "long" }])
          }
        >
          <Plus className="size-4" />
          Adicionar pergunta
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar modelo"}
        </Button>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-600">Modelo de anamnese salvo.</p>
      )}
    </form>
  );
}
