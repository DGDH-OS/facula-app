import type { ReportGuardrailResultaat } from "./types";
import type { ReportQualityResult } from "./report-quality";

export const VEILIGE_RAPPORT_GUARDRAIL: ReportGuardrailResultaat = {
  ok: true,
  gevondenWoorden: [],
};

export function normaliseerRapportGuardrail(value: unknown): ReportGuardrailResultaat {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return VEILIGE_RAPPORT_GUARDRAIL;
  }

  const guardrail = value as { ok?: unknown; gevondenWoorden?: unknown };
  return {
    ok: guardrail.ok === false ? false : true,
    gevondenWoorden: Array.isArray(guardrail.gevondenWoorden)
      ? guardrail.gevondenWoorden.filter((woord): woord is string => typeof woord === "string")
      : [],
  };
}

export function rapportExportGeblokkeerd(guardrailOk: boolean, checks: boolean[], kwaliteit?: ReportQualityResult): boolean {
  return !guardrailOk || checks.some((check) => !check) || kwaliteit?.checks.some((check) => check.niveau === "blokkade") === true;
}
