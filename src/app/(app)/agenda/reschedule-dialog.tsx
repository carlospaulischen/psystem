"use client";

import { useState, useTransition, type FormEvent } from "react";
import { rescheduleAppointment } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RescheduleDialog({
  appointmentId,
  currentStart,
  open,
  onOpenChange,
}: {
  appointmentId: string;
  currentStart: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const d = new Date(currentStart);
  const defaultDate = d.toISOString().slice(0, 10);
  const defaultTime = d.toTimeString().slice(0, 5);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await rescheduleAppointment(appointmentId, fd);
      if (res?.error) setError(res.error);
      else onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remarcar consulta</DialogTitle>
          <DialogDescription>
            A consulta volta a ficar como &quot;Aguardando confirmação&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={defaultDate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                name="time"
                type="time"
                required
                defaultValue={defaultTime}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="duration_min">Duração (minutos)</Label>
            <Input
              id="duration_min"
              name="duration_min"
              type="number"
              min={15}
              step={5}
              defaultValue={50}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Remarcar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
