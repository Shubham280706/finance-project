import { z } from "zod";
import { randomUUID } from "crypto";
import { fail, handler, ok } from "@/lib/api";
import { getSupabaseService, FILINGS_BUCKET } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase-server";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
});

export const POST = handler(async (req: Request) => {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in to upload a document.", 401);

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("Invalid request: filename and sizeBytes are required.");
  }
  const { filename, sizeBytes } = parsed.data;

  if (!filename.toLowerCase().endsWith(".pdf")) {
    return fail("Only PDF files are supported.");
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return fail(
      `File is too large. The limit is ${Math.round(
        MAX_UPLOAD_BYTES / (1024 * 1024),
      )} MB.`,
    );
  }

  const storagePath = `${randomUUID()}.pdf`;
  const supabase = getSupabaseService();
  const { data, error } = await supabase.storage
    .from(FILINGS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error("[FilingIQ] createSignedUploadUrl failed:", error);
    return fail("Could not create an upload URL. Please try again.", 500);
  }

  return ok({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    storagePath,
    bucket: FILINGS_BUCKET,
  });
});
