const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "AI_API_KEY",
] as const;

function validateEnv() {
  if (typeof window !== "undefined") return;
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
    }
  }
}

validateEnv();

export const ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  aiApiKey: process.env.AI_API_KEY || "",
} as const;
