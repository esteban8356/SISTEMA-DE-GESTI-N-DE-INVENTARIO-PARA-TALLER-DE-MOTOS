import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount || 0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  try {
    return dateFormatter.format(new Date(dateString));
  } catch {
    return dateString;
  }
}

// Zona horaria del taller: Colombia (UTC-5, sin horario de verano)
const OFFSET_COLOMBIA = "-05:00";

/** Devuelve la fecha local en formato YYYY-MM-DD (para los campos tipo date). */
export function toFechaLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inicio del día (00:00) en hora Colombia, para filtrar por fecha. */
export function inicioDelDia(fecha: string): string {
  return `${fecha}T00:00:00${OFFSET_COLOMBIA}`;
}

/** Fin del día (23:59:59) en hora Colombia, para filtrar por fecha. */
export function finDelDia(fecha: string): string {
  return `${fecha}T23:59:59.999${OFFSET_COLOMBIA}`;
}
