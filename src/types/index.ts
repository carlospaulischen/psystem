// Tipos mínimos do domínio. Quando o schema estabilizar, gerar com:
//   npx supabase gen types typescript --local > src/types/database.ts

export type MemberRole = "clinic_admin" | "psychologist" | "receptionist";

export interface Organization {
  id: string;
  type: "clinic" | "individual";
  name: string;
  slug: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  role: MemberRole;
  status: "invited" | "active" | "blocked" | "inactive";
  full_name: string;
  crp: string | null;
  organization?: Organization;
}

export type AppointmentStatus =
  | "scheduled"
  | "awaiting_confirmation"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "blocked";

export interface Appointment {
  id: string;
  patient_id: string | null;
  psychologist_id: string;
  room_id: string | null;
  starts_at: string;
  ends_at: string;
  modality: "in_person" | "online";
  status: AppointmentStatus;
  price_cents: number | null;
  meeting_link?: string | null;
  admin_notes?: string | null;
  patient?: { full_name: string } | null;
}

export interface Patient {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  status: "active" | "paused" | "closed" | "archived";
}

export interface Charge {
  id: string;
  patient_id: string;
  amount_cents: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string | null;
}
