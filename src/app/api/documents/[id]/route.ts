import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { fail, handler, ok } from "@/lib/api";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { getSessionUser } from "@/lib/supabase-server";

const paramsSchema = z.object({ id: z.string().uuid() });

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const user = await getSessionUser();
    if (!user) return fail("Please sign in.", 401);

    const parsed = paramsSchema.safeParse(await ctx.params);
    if (!parsed.success) {
      return fail("Invalid document id.");
    }

    const [doc] = await db
      .select({
        id: documents.id,
        title: documents.title,
        status: documents.status,
        errorMessage: documents.errorMessage,
        pageCount: documents.pageCount,
        chunkCount: documents.chunkCount,
      })
      .from(documents)
      .where(
        and(eq(documents.id, parsed.data.id), eq(documents.userId, user.id)),
      )
      .limit(1);

    if (!doc) {
      return fail("Document not found.", 404);
    }

    return ok(doc);
  },
);
