"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  DOC_RULES,
  DOC_TYPE_LABEL,
  DOC_TYPES,
  type DocType,
} from "@/lib/doc-templates";

// Select de tipo + regras normativas do tipo escolhido (cliente, pois o
// hint muda sem reload). Server action valida tudo de novo no submit.
export function DocTypeSelect() {
  const [type, setType] = useState<DocType>("declaration");

  return (
    <div className="grid gap-2">
      <Label htmlFor="type">Tipo *</Label>
      <select
        id="type"
        name="type"
        required
        value={type}
        onChange={(e) => setType(e.target.value as DocType)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        {DOC_TYPES.map((t) => (
          <option key={t} value={t}>
            {DOC_TYPE_LABEL[t]}
          </option>
        ))}
      </select>
      <ul className="mt-1 space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        {DOC_RULES[type].map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-primary">•</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
