import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { zoekBronnen, zoekBronnenMinimaal } from "@/lib/bronnen";
import { VAKKEN_MET_NIEUWSBRON, type Vak } from "@/lib/types";

/** GET /api/bronnen/zoek?q=... Echte nieuwsartikelen, alleen voor ingelogde docenten. */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const begrippen = (request.nextUrl.searchParams.get("begrippen") ?? "")
    .split("|")
    .map((b) => b.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 4);
  const vak = request.nextUrl.searchParams.get("vak") ?? "";
  const nieuwsVak = VAKKEN_MET_NIEUWSBRON.includes(vak as Vak);
  if (begrippen.length > 0) {
    try {
      const bronnen = await zoekBronnenMinimaal(begrippen, nieuwsVak);
      return NextResponse.json({ bronnen });
    } catch {
      return NextResponse.json(
        { error: "Zoeken lukt nu niet. Plak het artikel zelf in het veld hieronder." },
        { status: 502 }
      );
    }
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 3) {
    return NextResponse.json({ error: "Vul een zoekterm in." }, { status: 400 });
  }
  try {
    const bronnen = await zoekBronnen(q);
    return NextResponse.json({ bronnen });
  } catch {
    return NextResponse.json(
      { error: "Zoeken lukt nu niet. Plak het artikel zelf in het veld hieronder." },
      { status: 502 }
    );
  }
}
