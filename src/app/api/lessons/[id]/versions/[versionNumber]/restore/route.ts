import { NextRequest, NextResponse } from "next/server";
import type { GeneratedLesson } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVersion, saveVersionSnapshot } from "@/lib/versioning";

/**
 * POST /api/lessons/[id]/versions/[versionNumber]/restore
 *
 * Zet een les terug naar een eerdere versie. De HUIDIGE staat (vóór de
 * restore) wordt eerst zelf als nieuwe versie weggeschreven — terugzetten is
 * zelf ook een update, en gaat dus door dezelfde snapshot-vóór-update-regel
 * als sectie-edit/regenerate. Zo is een restore nooit destructief: de staat
 * waar vandaan teruggezet wordt, blijft terug te vinden in de geschiedenis.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionNumber: string }> }
) {
  const { id, versionNumber: versionNumberRaw } = await params;
  const versionNumber = Number(versionNumberRaw);

  if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
    return NextResponse.json({ error: "Ongeldig versienummer." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data: huidigeRij, error: leesError } = await supabase
    .schema("facula")
    .from("lessons")
    .select("id, input, output")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (leesError || !huidigeRij) {
    return NextResponse.json({ error: "Les niet gevonden." }, { status: 404 });
  }

  const teHerstellen = await getVersion<
    GeneratedLesson["input"],
    Omit<GeneratedLesson, "input">
  >(supabase, user.id, "lesson", id, versionNumber);

  if (!teHerstellen) {
    return NextResponse.json({ error: "Versie niet gevonden." }, { status: 404 });
  }

  try {
    await saveVersionSnapshot(
      supabase,
      user.id,
      "lesson",
      id,
      huidigeRij.input,
      huidigeRij.output
    );
  } catch (versionError) {
    console.error("Versiesnapshot vóór restore mislukt", versionError);
    return NextResponse.json({ error: "Terugzetten mislukt." }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .schema("facula")
    .from("lessons")
    .update({
      input: teHerstellen.input,
      output: teHerstellen.output,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Les terugzetten mislukt", updateError);
    return NextResponse.json({ error: "Terugzetten mislukt." }, { status: 500 });
  }

  return NextResponse.json({ input: teHerstellen.input, output: teHerstellen.output });
}
