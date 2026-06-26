import { desc, eq } from "drizzle-orm";
import { fail, handler, ok } from "@/lib/api";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { getSessionUser } from "@/lib/supabase-server";

/** Lists the signed-in user's documents, newest first (for the history sidebar). */
export const GET = handler(async () => {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in.", 401);

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      status: documents.status,
      errorMessage: documents.errorMessage,
      pageCount: documents.pageCount,
      chunkCount: documents.chunkCount,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.createdAt));

  return ok(docs);
});
