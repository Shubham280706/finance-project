import { after } from "next/server";
import { z } from "zod";
import { fail, handler, ok, clientIp } from "@/lib/api";
import { consume, LIMITS } from "@/lib/rate-limit";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { processDocument } from "@/lib/ingest";
import { getSessionUser } from "@/lib/supabase-server";

export const maxDuration = 300;

const bodySchema = z.object({
  storagePath: z.string().min(1),
  title: z.string().min(1).max(300),
});

export const POST = handler(async (req: Request) => {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in to upload a document.", 401);

  const ip = clientIp(req);
  const rl = consume(`ingest:${ip}`, LIMITS.ingest.limit, LIMITS.ingest.windowMs);
  if (!rl.allowed) {
    return fail(
      `Upload limit reached. Try again in about ${Math.ceil(
        rl.retryAfterSeconds / 60,
      )} minute(s).`,
      429,
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("Invalid request: storagePath and title are required.");
  }
  const { storagePath, title } = parsed.data;

  // Create the document row immediately, then process in the background.
  const [doc] = await db
    .insert(documents)
    .values({ title, storagePath, status: "processing", userId: user.id })
    .returning({ id: documents.id, status: documents.status });

  after(() => processDocument(doc.id, storagePath));

  return ok({ documentId: doc.id, status: doc.status });
});
