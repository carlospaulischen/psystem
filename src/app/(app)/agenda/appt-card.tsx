"use client";

import { useState } from "react";
import { RescheduleDialog } from "./reschedule-dialog";

// Item de agenda clicável — abre o dialog de remarcação.
export function ApptCard({
  id,
  startsAt,
  className,
  children,
}: {
  id: string;
  startsAt: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <li
        className={className}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        {children}
      </li>
      <RescheduleDialog
        appointmentId={id}
        currentStart={startsAt}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
