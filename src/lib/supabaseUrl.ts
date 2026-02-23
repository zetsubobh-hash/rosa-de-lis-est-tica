// Central Supabase URL and key — hardcoded to work in ALL environments
// (Docker/EasyPanel builds, Lovable preview, etc.)
// Vite may replace import.meta.env with empty string "" during Docker builds
// when .env is in .dockerignore, so we validate before using

const HARDCODED_URL = "https://sxzmtnsfsyifujdnqyzr.supabase.co";
const HARDCODED_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4em10bnNmc3lpZnVqZG5xeXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDc1OTcsImV4cCI6MjA4NjMyMzU5N30.WIaOFGFVrQ2eqroPSrujSC79gWdEz8UsIcrFbeL--X0";

function getEnv(key: string): string | undefined {
  try {
    const val = import.meta.env[key];
    if (val && typeof val === "string" && val.length > 5) {
      return val;
    }
  } catch {
    // ignore — not in Vite context
  }
  return undefined;
}

export const SUPABASE_URL = getEnv("VITE_SUPABASE_URL") || HARDCODED_URL;
export const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") || HARDCODED_KEY;
