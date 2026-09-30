import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apaVermelding, domeinVan, haalArtikelTekst, TOEGESTANE_SITES } from "@/lib/bronnen";
import { limitString, readBodyWithLimit } from "@/lib/validation";

/** POST /api/bronnen/tekst { url, datum? }. Haalt de tekst van een gekozen artikel op. */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) return NextResponse.json({ error: "Aanvraag is te groot." }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(bodyResult.text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const url = limitString(body.url, 500);
  const domein = url ? domeinVan(url) : null;
  if (!url || !domein) {
    return NextResponse.json({ error: "Deze bron kan niet worden opgehaald." }, { status: 400 });
  }
  try {
    const { tekst, titel } = await haalArtikelTekst(url);
    if (tekst.length < 200) {
      return NextResponse.json(
        {
          error: "De tekst kon niet worden opgehaald (video of afgeschermd). Plak het artikel zelf.",
        },
        { status: 422 }
      );
    }
    const datumIso =
      typeof body.datum === "string" && !isNaN(new Date(body.datum).getTime())
        ? new Date(body.datum).toISOString()
        : "";
    const vermelding = apaVermelding({
      titel,
      site: TOEGESTANE_SITES[domein],
      domein,
      datum: datumIso,
      url,
    });
    return NextResponse.json({ tekst, titel, vermelding });
  } catch {
    return NextResponse.json(
      { error: "Ophalen lukt nu niet. Plak het artikel zelf." },
      { status: 502 }
    );
  }
}
