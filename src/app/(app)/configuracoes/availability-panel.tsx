import { Trash2 } from "lucide-react";
import { addAvailability, removeAvailability } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

interface Slot {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export function AvailabilityPanel({ slots }: { slots: Slot[] }) {
  const byDay = new Map<number, Slot[]>();
  for (const s of slots) {
    byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), s]);
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border text-sm">
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
          <li key={wd} className="flex items-center gap-4 py-2.5">
            <span className="w-20 shrink-0 font-medium">{WEEKDAYS[wd]}</span>
            <div className="flex flex-wrap items-center gap-2">
              {(byDay.get(wd) ?? []).map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 tabular-nums"
                >
                  {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  <form action={removeAvailability.bind(null, s.id)}>
                    <button
                      type="submit"
                      aria-label="Remover"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </span>
              ))}
              {!byDay.has(wd) && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form
        action={addAvailability}
        className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      >
        <div className="grid gap-2">
          <Label htmlFor="weekday">Dia</Label>
          <select
            id="weekday"
            name="weekday"
            required
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
              <option key={wd} value={wd}>
                {WEEKDAYS[wd]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="start_time">Início</Label>
          <Input id="start_time" name="start_time" type="time" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end_time">Fim</Label>
          <Input id="end_time" name="end_time" type="time" required />
        </div>
        <Button type="submit" variant="outline">
          Adicionar
        </Button>
      </form>
    </div>
  );
}
