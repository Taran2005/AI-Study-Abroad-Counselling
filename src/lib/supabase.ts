import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error(
		"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.",
	);
}

/**
 * Server-side Supabase client using the service role key.
 * Only use in API routes / server components — never expose to the browser.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
