import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fase B — gratis-quotum per categorie per kalendermaand. Eén genoemde
 * constante i.p.v. verspreide magic numbers, zodat een limietwijziging op
 * één plek gebeurt. Betaalde abonnees (facula.profiles.subscription_status
 * === 'active') omzeilen dit quotum volledig — zie isPaidSubscriber().
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
 * Betaalde abonnees slaan de quota-check in checkAndIncrementUsage() over.
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

export interface UsageCheckResult {
  allowed: boolean;
  newCount: number;
}

/**
 * Atomaire quota-check + increment via de facula.try_increment_usage-RPC
 * (SELECT ... FOR UPDATE in de database, zie migratie facula_fase_b_quota_
 * and_subscriptions). Dit voorkomt race conditions bij gelijktijdige
 * requests van dezelfde gebruiker — de check en de verhoging gebeuren in
 * één databasetransactie, nooit als aparte read-then-write vanuit deze
 * route/functie.
 *
 * Betaalde abonnees (isPaidSubscriber === true) worden hier NIET doorheen
 * gestuurd door de aanroeper — zie gebruik in de API-routes: als de
 * gebruiker betaalt, wordt deze functie helemaal niet aangeroepen en wordt
 * er ook niet geteld (geen quotum voor abonnees).
 */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  kind: UsageKind
): Promise<UsageCheckResult> {
  const { data, error } = await supabase
    .schema("facula")
    .rpc("try_increment_usage", {
      p_user_id: userId,
      p_kind: kind,
      p_limit: FREE_QUOTA_PER_MONTH,
    })
    .single();

  if (error || !data) {
    // Fail-closed: als de quota-RPC zelf faalt, blokkeer de generatie
    // liever dan een gebruiker onbeperkt door te laten genereren.
    console.error("Quota-RPC try_increment_usage mislukt", error);
    throw new Error("Quotum kon niet worden gecontroleerd.");
  }

  const row = data as { allowed: boolean; new_count: number };
  return { allowed: row.allowed, newCount: row.new_count };
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
