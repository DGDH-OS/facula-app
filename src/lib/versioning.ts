import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fase D — versiegeschiedenis. content_type spiegelt de brontabel
 * (lessons/tests/reports) maar is enkelvoud, zie migratie
 * facula_fase_d_content_versions.
 */
export type VersionedContentType = "lesson" | "test" | "report";

export interface ContentVersionSummary {
  versionNumber: number;
  createdAt: string;
}

export interface ContentVersionDetail<TInput = unknown, TOutput = unknown>
  extends ContentVersionSummary {
  input: TInput;
  output: TOutput;
}

/**
 * Schrijft de OUDE staat (input+output) van een lesson/test/report weg als
 * nieuwe versie-rij. Moet aangeroepen worden VOORDAT de brontabel wordt
 * geüpdatet — de aanroeper geeft dus expliciet de staat mee zoals die vóór
 * de update was, niet de nieuwe staat.
 */
export async function saveVersionSnapshot(
  supabase: SupabaseClient,
  userId: string,
  contentType: VersionedContentType,
  contentId: string,
  input: unknown,
  output: unknown
): Promise<void> {
  const { data: laatste, error: leesError } = await supabase
    .schema("facula")
    .from("content_versions")
    .select("version_number")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (leesError) throw leesError;

  const volgendVersienummer = (laatste?.version_number ?? 0) + 1;

  const { error: schrijfError } = await supabase
    .schema("facula")
    .from("content_versions")
    .insert({
      content_type: contentType,
      content_id: contentId,
      user_id: userId,
      version_number: volgendVersienummer,
      input,
      output,
    });

  if (schrijfError) throw schrijfError;
}

/** Lijst van eerdere versies (zonder input/output, licht voor een overzicht), nieuwste eerst. */
export async function listVersions(
  supabase: SupabaseClient,
  userId: string,
  contentType: VersionedContentType,
  contentId: string
): Promise<ContentVersionSummary[]> {
  const { data, error } = await supabase
    .schema("facula")
    .from("content_versions")
    .select("version_number, created_at")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .order("version_number", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((rij) => ({
    versionNumber: rij.version_number as number,
    createdAt: rij.created_at as string,
  }));
}

/** Eén specifieke versie inclusief input/output, voor read-only weergave of restore. */
export async function getVersion<TInput = unknown, TOutput = unknown>(
  supabase: SupabaseClient,
  userId: string,
  contentType: VersionedContentType,
  contentId: string,
  versionNumber: number
): Promise<ContentVersionDetail<TInput, TOutput> | null> {
  const { data, error } = await supabase
    .schema("facula")
    .from("content_versions")
    .select("version_number, created_at, input, output")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    versionNumber: data.version_number as number,
    createdAt: data.created_at as string,
    input: data.input as TInput,
    output: data.output as TOutput,
  };
}
