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
 * Slaat atomair de huidige staat op als versie en werkt daarna de bronrij bij
 * met de nieuwe input/output. De databasefunctie bepaalt de eigenaar en het
 * versienummer onder een row lock.
 */
export async function saveVersionAndUpdate(
  supabase: SupabaseClient,
  contentType: VersionedContentType,
  contentId: string,
  newInput: unknown,
  newOutput: unknown
): Promise<number> {
  const { data, error } = await supabase
    .schema("facula")
    .rpc("save_version_and_update", {
      p_content_type: contentType,
      p_content_id: contentId,
      p_new_input: newInput,
      p_new_output: newOutput,
    });
  if (error) throw error;
  return data as number;
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
