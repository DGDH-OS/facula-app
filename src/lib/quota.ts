import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fase B — gratis-quotum per categorie per kalendermaand. Eén genoemde
 * constante i.p.v. verspreide magic numbers, zodat een limietwijziging op
 * één plek gebeurt. Betaalde abonnees (facula.profiles.subscription_status
 * === 'active') omzeilen dit quotum volledig — zie saveWithQuota(), dat die
 * status database-side leest.
 */
export const FREE_QUOTA_PER_MONTH = 5;

export type UsageKind = "lessons" | "tests" | "reports";

const KIND_LABELS: Record<UsageKind, string> = {
  lessons: "lessen",
  tests: "toetsen",
  reports: "rapporten",
};

export function quotaLabel(kind: UsageKind): string {
  return KIND_LABELS[kind];
}

export function quotaLimitBoodschap(kind: UsageKind): string {
  return `Je hebt je gratis limiet van ${FREE_QUOTA_PER_MONTH} ${KIND_LABELS[kind]} deze maand bereikt.`;
}

/**
 * Vraagt op of de ingelogde gebruiker een actief betaald abonnement heeft.
 * Alleen voor de goedkope voorcheck in de routes: wie betaalt, hoeft daar
 * niet tegen de limiet aangehouden te worden. De bindende beslissing valt in
 * saveWithQuota(), die het abonnement zelf opnieuw leest.
 */
export async function isPaidSubscriber(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .schema("facula")
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return data.subscription_status === "active";
}

export interface SaveWithQuotaResult {
  /** True als de limiet vol was: er is niets opgeslagen en niets geteld. */
  quotaExceeded: boolean;
  /** Id van de nieuwe rij, of null als quotaExceeded. */
  id: string | null;
  /** created_at van de nieuwe rij, of null als quotaExceeded. */
  createdAt: string | null;
  /** Stand van de teller na deze aanroep (bij abonnees ongewijzigd). */
  newCount: number;
}

/**
 * Slaat een gegenereerde les/toets/rapport op en verrekent het quotum in
 * dezelfde databasetransactie, via facula.save_with_quota (zie migratie
 * 20260928160000_facula_quota_atomic_save.sql).
 *
 * Waarom dit één aanroep is en geen check-dan-insert: de teller en de
 * opgeslagen rij horen niet uit elkaar te kunnen lopen. De RPC vergrendelt de
 * teller-rij van de lopende maand, controleert de limiet, doet de insert en
 * hoogt daarna op. Mislukt de insert, dan rolt de verhoging mee terug — er
 * valt dus niets terug te boeken, en twee gelijktijdige aanvragen kunnen niet
 * samen door dezelfde laatste vrije plek.
 *
 * De user-id staat bewust niet in de parameters: de RPC leest auth.uid() uit
 * de sessie van de meegegeven client. Of de docent betaalt, bepaalt de RPC
 * ook zelf uit facula.profiles.
 */
export async function saveWithQuota(
  supabase: SupabaseClient,
  kind: UsageKind,
  input: unknown,
  output: unknown
): Promise<SaveWithQuotaResult> {
  const { data, error } = await supabase
    .schema("facula")
    .rpc("save_with_quota", {
      p_kind: kind,
      p_input: input,
      p_output: output,
      p_limit: FREE_QUOTA_PER_MONTH,
    })
    .single();

  if (error || !data) {
    // Fail-closed, net als de oude quota-RPC: gaat dit mis, dan is er niets
    // opgeslagen en niets geteld, en hoort de route een 500 te geven in
    // plaats van te doen alsof het gelukt is.
    console.error("save_with_quota mislukt", { kind, error });
    throw new Error("Opslaan mislukt.");
  }

  const row = data as {
    content_id: string | null;
    content_created_at: string | null;
    quota_exceeded: boolean;
    new_count: number;
  };

  if (!row.quota_exceeded && (!row.content_id || !row.content_created_at)) {
    // Kan alleen als de RPC iets anders teruggeeft dan zijn contract. Liever
    // hier hard stoppen dan een les met een lege id naar de client sturen.
    console.error("save_with_quota gaf geen id terug", { kind, row });
    throw new Error("Opslaan mislukt.");
  }

  return {
    quotaExceeded: row.quota_exceeded,
    id: row.content_id,
    createdAt: row.content_created_at,
    newCount: row.new_count,
  };
}

export interface CurrentUsage {
  lessons: number;
  tests: number;
  reports: number;
}

/** Leest het huidige-maand-verbruik van een gebruiker (voor dashboard-indicator). */
export async function getCurrentUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentUsage> {
  const { data, error } = await supabase
    .schema("facula")
    .rpc("get_current_usage", { p_user_id: userId })
    .single();

  if (error || !data) {
    console.error("get_current_usage mislukt", error);
    return { lessons: 0, tests: 0, reports: 0 };
  }

  const row = data as {
    lessons_generated: number;
    tests_generated: number;
    reports_generated: number;
  };
  return {
    lessons: row.lessons_generated,
    tests: row.tests_generated,
    reports: row.reports_generated,
  };
}
