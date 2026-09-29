import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Het gratis maandquotum per soort, voor een docent zonder school en zonder
 * abonnement.
 *
 * Deze constante is NIET de limiet die iets tegenhoudt. Ze staat hier alleen om
 * een melding te kunnen schrijven als de database een aanvraag weigert. De
 * bindende limiet staat in facula.save_with_quota_v2 (zie
 * 20260929130000_facula_school.sql) en wordt daar afgeleid, niet meegegeven:
 * een limiet die de client meestuurt is geen limiet. De stand en het geldende
 * regime komen uit facula.mijn_verbruik(), zie haalVerbruik() in
 * src/lib/school.ts.
 *
 * Beide getallen moeten wel gelijk blijven, anders leest de docent een ander
 * aantal dan de database hanteert. Wijzig je hier iets, wijzig dan
 * c_gratis_limiet in die migratie mee (en omgekeerd).
 */
export const FREE_QUOTA_PER_MONTH = 5;

export type UsageKind = "lessons" | "tests" | "reports";

const KIND_LABELS: Record<UsageKind, string> = {
  lessons: "lessen",
  tests: "toetsen",
  reports: "rapporten",
};

/**
 * De melding bij een volle limiet, met het regime erin.
 *
 * Een docent op een schoollicentie die "je gratis limiet is bereikt" leest,
 * gaat zoeken naar een abonnement dat hij niet nodig heeft. Bij een pool is de
 * school aan zet, niet hij.
 */
export function quotaBoodschap(kind: UsageKind, regime: string, limiet: number | null): string {
  const soort = KIND_LABELS[kind];

  if (regime === "school_pool") {
    return (
      "Het gezamenlijke aantal " +
      soort +
      " van je school is voor deze maand op" +
      (limiet ? " (" + limiet + ")" : "") +
      ". Vraag je beheerder om ruimte bij te laten zetten."
    );
  }

  if (regime === "gratis") {
    // De limiet is hier bekend, ook als de aanroeper hem niet meestuurde: het
    // gratis quotum is een constante die met de database meebeweegt.
    return `Je hebt je gratis limiet van ${limiet ?? FREE_QUOTA_PER_MONTH} ${soort} deze maand bereikt.`;
  }

  // Abonnement of een onbeperkte schoollicentie en tóch geweigerd: dan klopt
  // er iets niet aan de aanname, en is "probeer het opnieuw" het eerlijkste
  // antwoord dat we kunnen geven.
  return "Opslaan lukte niet vanwege een limiet. Probeer het later opnieuw.";
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
  /**
   * Welk regime er gold: 'gratis', 'abonnement', 'school_onbeperkt' of
   * 'school_pool'. Alleen voor de serverlog. De app beslist hier niets mee:
   * zou hij dat doen, dan stond de regimekeuze op twee plekken.
   */
  regime: string;
}

/**
 * Slaat een gegenereerde les/toets/rapport op en verrekent het quotum in
 * dezelfde databasetransactie, via facula.save_with_quota_v2 (zie migratie
 * 20260929130000_facula_school.sql).
 *
 * v2 en niet meer v1: v2 kiest zelf het regime (schoollicentie, abonnement of
 * het persoonlijke gratis quotum). De vorige versie kende het schoolmodel niet
 * en hield een docent van een school altijd tegen het persoonlijke quotum.
 * Die functie blijft nog even bestaan voor de versie die in productie draait en
 * gaat weg met supabase/post-deploy/20260929140000_facula_drop_save_with_quota_v1.sql.
 *
 * Waarom dit één aanroep is en geen check-dan-insert: de teller en de
 * opgeslagen rij horen niet uit elkaar te kunnen lopen. De RPC vergrendelt de
 * teller-rij van de lopende maand, controleert de limiet, doet de insert en
 * hoogt daarna op. Mislukt de insert, dan rolt de verhoging mee terug — er
 * valt dus niets terug te boeken, en twee gelijktijdige aanvragen kunnen niet
 * samen door dezelfde laatste vrije plek.
 *
 * Niets wat de uitkomst bepaalt, gaat hier de database in. De user-id komt
 * uit auth.uid() op de sessie van de meegegeven client, de gratis limiet is
 * een constante in de functie zelf, en of de docent betaalt leest de RPC uit
 * facula.profiles. Er is dus geen parameter waarmee een aanroeper zijn eigen
 * limiet of abonnement kan opgeven.
 */
export async function saveWithQuota(
  supabase: SupabaseClient,
  kind: UsageKind,
  input: unknown,
  output: unknown
): Promise<SaveWithQuotaResult> {
  const { data, error } = await supabase
    .schema("facula")
    .rpc("save_with_quota_v2", {
      p_kind: kind,
      p_input: input,
      p_output: output,
    })
    .single();

  if (error || !data) {
    // Fail-closed, net als de oude quota-RPC: gaat dit mis, dan is er niets
    // opgeslagen en niets geteld, en hoort de route een 500 te geven in
    // plaats van te doen alsof het gelukt is.
    console.error("save_with_quota_v2 mislukt", { kind, error });
    throw new Error("Opslaan mislukt.");
  }

  const row = data as {
    content_id: string | null;
    content_created_at: string | null;
    quota_exceeded: boolean;
    new_count: number;
    regime: string;
  };

  if (!row.quota_exceeded && (!row.content_id || !row.content_created_at)) {
    // Kan alleen als de RPC iets anders teruggeeft dan zijn contract. Liever
    // hier hard stoppen dan een les met een lege id naar de client sturen.
    console.error("save_with_quota_v2 gaf geen id terug", { kind, row });
    throw new Error("Opslaan mislukt.");
  }

  return {
    quotaExceeded: row.quota_exceeded,
    id: row.content_id,
    createdAt: row.content_created_at,
    newCount: row.new_count,
    regime: row.regime,
  };
}
