import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const [profileRes, lessonsRes, testsRes, reportsRes, versionsRes, usageRes] =
    await Promise.all([
      supabase.schema("facula").from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.schema("facula").from("lessons").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("tests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("content_versions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.schema("facula").from("usage_counters").select("*").eq("user_id", user.id),
    ]);

  const fout = [profileRes, lessonsRes, testsRes, reportsRes, versionsRes, usageRes].find(
    (res) => res.error
  );
  if (fout) {
    console.error("Gegevens-export ophalen mislukt", fout.error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van je gegevens." },
      { status: 500 }
    );
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
