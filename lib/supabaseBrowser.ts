"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function browserClient(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { storageKey: "vf-auth" },
    });
  }
  return client;
}

// 로그인한 자녀 API 호출 (Bearer 토큰)
export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await browserClient().auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "요청 실패");
  return json as T;
}

// 탭 이동이 바로 뜨게: 마지막으로 받은 화면 데이터를 이 세션 동안 기억해 두고 먼저 보여준다
export function cached<T = any>(key: string): T | null {
  try { const v = sessionStorage.getItem("wr-c:" + key); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function remember(key: string, v: any) {
  try { sessionStorage.setItem("wr-c:" + key, JSON.stringify(v)); } catch {}
}
