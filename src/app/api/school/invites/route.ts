import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { nieuwInviteToken, tokenHash } from "@/lib/school-token";
import { limitString, readBodyWithLimit, zelfdeOrigin } from "@/lib/validation";

/**
 * POST /api/school/invites
 *
 * Maakt een uitnodiging en geeft de link één keer terug. Er gaat geen mail uit:
 * de beheerder kopieert de link en stuurt hem zelf door via de weg die op zijn
 * school gewoon is (mail, Teams, een briefje). Dat is in deze fase bewust zo,
 * en het scherm zegt het ook.
 *
 * Waarom dit een route is en geen insert vanuit de browser: het token moet uit
 * een veilige bron komen en mag daarna nooit meer op te vragen zijn. De route
 * maakt het token, schrijft alleen de SHA-256 weg en geeft het token één keer
 * terug in de respons. Daarna bestaat het alleen nog in de link.
 *
 * De insert loopt via de sessie-client van de beheerder, niet via service_role.
 * Daardoor geldt de policy school_invites_insert_beheerder onverkort: school_id
 * moet de eigen school zijn, de aanvrager moet beheerder zijn, en de
 * geldigheidsduur moet binnen 30 dagen liggen. De route hoeft die regels dus
 * niet na te bouwen, en kan ze ook niet per ongeluk omzeilen.
 */

const GELDIG_DAGEN = 14;
const ROLLEN = ["beheerder", "sectievoorzitter", "docent"] as const;
type Rol = (typeof ROLLEN)[number];

function isRol(waarde: unknown): waarde is Rol {
  return typeof waarde === "string" && (ROLLEN as readonly string[]).includes(waarde);
}

function isEmailachtig(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(waarde);
}

export async function POST(request: NextRequest) {
  if (!zelfdeOrigin(request)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: "Aanvraag is te groot." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyResult.text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const email = limitString(body.email, 200)?.toLowerCase() ?? null;
  if (!email || !isEmailachtig(email)) {
    return NextResponse.json(
      { error: "Vul het e-mailadres van je collega in." },
      { status: 400 }
    );
  }

  const rol: Rol = isRol(body.rol) ? body.rol : "docent";
  const sectieId = typeof body.sectieId === "string" && body.sectieId ? body.sectieId : null;

  // De eigen school komt uit de database, niet uit de body. Een beheerder kan
  // dus geen uitnodiging voor een andere school aanmaken, ook niet als hij het
  // verzoek zelf in elkaar zet.
  const { data: schoolId, error: schoolFout } = await supabase
    .schema("facula")
    .rpc("mijn_school_id");

  if (schoolFout || !schoolId) {
    return NextResponse.json(
      { error: "Je hoort niet bij een school." },
      { status: 403 }
    );
  }

  const token = nieuwInviteToken();
  const verlooptOp = new Date(Date.now() + GELDIG_DAGEN * 24 * 60 * 60 * 1000);

  /*
   * Een openstaande uitnodiging voor hetzelfde adres eerst weghalen. Anders
   * botst de nieuwe op de unieke index (één open uitnodiging per adres per
   * school) en zouden er twee geldige links naast elkaar leven, waarvan de
   * beheerder er maar één heeft gezien. De delete valt onder dezelfde
   * beheerder-policy, dus dit kan alleen binnen de eigen school.
   */
  await supabase
    .schema("facula")
    .from("school_invites")
    .delete()
    .eq("school_id", schoolId)
    .eq("email", email)
    .is("accepted_at", null);

  const { data, error } = await supabase
    .schema("facula")
    .from("school_invites")
    .insert({
      school_id: schoolId,
      email,
      role: rol,
      section_id: sectieId,
      token_hash: tokenHash(token),
      expires_at: verlooptOp.toISOString(),
      created_by: user.id,
    })
    .select("id, email, role, expires_at")
    .single();

  if (error || !data) {
    // Een policy die weigert komt hier ook terecht. Dat is precies goed: de
    // melding zegt niet welke regel het was, en de logregel wel.
    console.error("Uitnodiging aanmaken mislukt", error);
    return NextResponse.json(
      { error: "Uitnodigen lukte niet. Ben je beheerder van deze school?" },
      { status: 403 }
    );
  }

  const basis = request.nextUrl.origin;

  return NextResponse.json({
    id: data.id,
    email: data.email,
    rol: data.role,
    verlooptOp: data.expires_at,
    // Eén keer, hierna nooit meer: in de database staat alleen de hash.
    link: basis + "/uitnodiging/" + token,
  });
}
