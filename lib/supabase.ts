import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Fail loudly at startup if required env vars are missing
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error(
    "[Supabase] Missing env vars — check .env.local:",
    JSON.stringify({
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    })
  );
}

// Browser client — uses anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client — bypasses RLS, used only in API routes.
// autoRefreshToken and detectSessionInUrl must be false for server contexts.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// ============================================================
// Storage helpers — PDF bucket
// ============================================================
const BUCKET = "pdfs";

export async function uploadPDFToStorage(
  buffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  const path = `${userId}/${Date.now()}-${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deletePDFFromStorage(publicUrl: string): Promise<void> {
  const url = new URL(publicUrl);
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return;

  const storagePath = url.pathname.slice(idx + marker.length);
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    console.error("[Supabase Storage] Delete error:", error.message);
  }
}
