import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { fail, handler, ok, clientIp } from "@/lib/api";
import { getSessionUser } from "@/lib/supabase-server";
import { consume, LIMITS } from "@/lib/rate-limit";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { embedQuery } from "@/lib/embed";
import { matchChunks } from "@/lib/retrieve";
import { answerQuestion } from "@/lib/anthropic";
import { MATCH_COUNT } from "@/lib/constants";

export const maxDuration = 60;

const bodySchema = z.object({
  documentId: z.string().uuid(),
  question: z.string().min(1).max(2000),
});

export const POST = handler(async (req: Request) => {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in.", 401);

  const ip = clientIp(req);
  const rl = consume(`chat:${ip}`, LIMITS.chat.limit, LIMITS.chat.windowMs);
  if (!rl.allowed) {
    return fail(
      `Message limit reached. Try again in about ${Math.ceil(
        rl.retryAfterSeconds / 60,
      )} minute(s).`,
      429,
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("Invalid request: documentId and question are required.");
  }
  const { documentId, question } = parsed.data;

  // Confirm the document is ready before answering.
  const [doc] = await db
    .select({ status: documents.status, errorMessage: documents.errorMessage })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
    .limit(1);

  if (!doc) return fail("Document not found.", 404);
  if (doc.status === "error") {
    return fail(doc.errorMessage ?? "This document could not be processed.");
  }
  if (doc.status !== "ready") {
    return fail("Document is still processing.");
  }

  // Embed the question (input_type: query) and retrieve top chunks.
  const queryEmbedding = await embedQuery(question);
  const retrieved = await matchChunks(queryEmbedding, documentId, MATCH_COUNT);

  if (retrieved.length === 0) {
    return ok({
      answer: "I couldn't find that in this document.",
      citations: [],
    });
  }

  const { answer, citations } = await answerQuestion(question, retrieved);
  return ok({ answer, citations });
});
