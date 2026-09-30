import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { haalActueleFeedItems } from "@/lib/bronnen";

/**
 * Dagelijkse taak (Vercel Cron): bewaart titel, link, datum en samenvatting van
 * wat er in de kranten-feeds staat, en ruimt artikelen ouder dan 12 maanden op.
 * Alleen aanroepbaar met het CRON_SECRET dat Vercel zelf meestuurt.
 */
export async function GET(request: NextRequest) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || request.headers.get("authorization") !== `Bearer ${geheim}`) {
    return NextResponse.json({ error: "Niet toegestaan." }, { status: 401 });
  }
  const items = await haalActueleFeedItems();
  const db = createServiceRoleClient().schema("facula");

  // Eén rij per URL: dezelfde link in twee feeds mag niet dubbel in één upsert.
  const uniek = [...new Map(items.map((i) => [i.url, i])).values()];
  const rijen = uniek.slice(0, 600).map((i) => ({
    url: i.url.slice(0, 500),
    titel: i.titel.slice(0, 400),
    domein: i.domein,
    datum: i.datum || null,
    samenvatting: i.samenvatting.slice(0, 1200),
  }));
  const { error } = await db.from("bronnen_archief").upsert(rijen, { onConflict: "url" });
  if (error) {
    console.error("bronnen-archief upsert:", error.message);
    return NextResponse.json({ error: "Opslaan mislukt." }, { status: 500 });
  }

  const grens = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
  await db.from("bronnen_archief").delete().lt("datum", grens);

  return NextResponse.json({ opgeslagen: rijen.length });
}
