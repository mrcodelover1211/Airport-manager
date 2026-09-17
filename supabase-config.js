// Public Supabase client configuration for the browser.
// Never put a Supabase service-role key in this file.
const SUPABASE_URL = 'https://saiitxwsqudxkctspmqh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_84y9PHpxiv9jC_jmBvus2g_0LRRAPRG';
window.airportManagerSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
