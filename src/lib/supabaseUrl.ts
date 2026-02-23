// Central Supabase URL and key for direct fetch calls (e.g., edge functions)
// Uses env vars with fallback to hardcoded values to prevent "undefined" URLs
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://sxzmtnsfsyifujdnqyzr.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4em10bnNmc3lpZnVqZG5xeXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDc1OTcsImV4cCI6MjA4NjMyMzU5N30.WIaOFGFVrQ2eqroPSrujSC79gWdEz8UsIcrFbeL--X0";
