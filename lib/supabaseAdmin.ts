import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 서버 전용 (service role). 브라우저 코드에서 import 금지.
export function admin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수가 없습니다");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const BUCKET = "vf-media";
