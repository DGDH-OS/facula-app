import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LOGO_BUCKET } from "@/lib/huisstijl/server";

/**
 * GET /api/account/export
 * Levert alle gegevens van de ingelogde gebruiker als downloadbare JSON —
 * dataportabiliteit onder de AVG. Gaat via de gewone RLS-client (niet de
 * service-role-client), dus dit kan per constructie nooit gegevens van een
 * andere gebruiker teruggeven.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  // Naast RLS ook expliciet op user_id filteren — zelfde verdedigingslaag
  // als de andere account-scoped routes in deze codebase.
  const [profileRes, lessonsRes, testsRes, reportsRes, versionsRes, usageRes, huisstijlRes] =
    await Promise.all([
      supabase.schema("facula").from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.schema("facula").from("lessons").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("tests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("content_versions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("usage_counters").select("*").eq("user_id", user.id),
      supabase.schema("facula").from("huisstijl").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  const fout = [
    profileRes,
    lessonsRes,
    testsRes,
    reportsRes,
    versionsRes,
    usageRes,
    huisstijlRes,
  ].find((res) => res.error);
  if (fout) {
    console.error("Gegevens-export ophalen mislukt", fout.error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van je gegevens." },
      { status: 500 }
    );
  }

  // Het schoollogo is een bestand in storage en staat dus niet in een van de
  // tabellen hierboven. Een export met alleen logo_path is geen kopie van je
  // gegevens maar een verwijzing ernaar, dus gaat het bestand zelf mee, als
  // base64 in dezelfde JSON. Bewust geen signed URL: die verloopt, en een
  // export die na een uur de helft van zijn inhoud kwijt is, voldoet niet aan
  // het recht op dataportabiliteit.
  const logoPath =
    (huisstijlRes.data as { logo_path?: string | null } | null)?.logo_path ?? null;
  let logo: { bestandsnaam: string; mimeType: string; base64: string } | null = null;

  if (logoPath) {
    const { data: bestand, error: logoFout } = await supabase.storage
      .from(LOGO_BUCKET)
      .download(logoPath);

    if (logoFout || !bestand) {
      // Niet stil overslaan: dan zou de docent een export krijgen die
      // compleet lijkt en het niet is.
      console.error("Schoollogo voor gegevens-export ophalen mislukt", logoFout);
      return NextResponse.json(
        { error: "Je schoollogo kon niet worden opgehaald. Probeer het later opnieuw." },
        { status: 500 }
      );
    }

    logo = {
      bestandsnaam: logoPath.split("/").pop() || "logo",
      mimeType:
        bestand.type ||
        (logoPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg"),
      base64: Buffer.from(await bestand.arrayBuffer()).toString("base64"),
    };
  }

  const exportData = {
    geexporteerdOp: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profileRes.data,
    lessons: lessonsRes.data,
    tests: testsRes.data,
    reports: reportsRes.data,
    contentVersions: versionsRes.data,
    usageCounters: usageRes.data,
    huisstijl: huisstijlRes.data,
    // null als er geen logo is ingesteld; anders het volledige bestand,
    // base64-gecodeerd, met de bijbehorende mimeType om het terug te kunnen
    // decoderen.
    schoollogo: logo,
  };

  const datum = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="facula-export-${datum}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
