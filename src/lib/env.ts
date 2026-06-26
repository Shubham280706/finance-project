import { z } from "zod";

/**
 * Server-side environment validation. Fail fast with a clear message when a
 * required variable is missing. Only import this from server code — it reads
 * secrets that must never reach the browser.
 */
const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  MISTRAL_API_KEY: z.string().min(1, "MISTRAL_API_KEY is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  // Optional with graceful fallback.
  LLAMA_CLOUD_API_KEY: z.string().optional(),
  GENERATION_MODE: z.enum(["quality", "cheap"]).default("quality"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\n` +
        `Copy .env.example to .env.local and fill in the required values.`,
    );
  }
  cached = parsed.data;
  return cached;
}
