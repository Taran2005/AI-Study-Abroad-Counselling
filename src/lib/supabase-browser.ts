import { createClient } from "@supabase/supabase-js";

/**
 * Browser-safe Supabase client using the public anon key.
 * Used for client-side Realtime subscriptions only.
 * Never use this for mutations — all writes go through the API routes.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
