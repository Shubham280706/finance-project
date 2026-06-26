import { z } from "zod";
import { eq } from "drizzle-orm";
import { fail, handler, ok } from "@/lib/api";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

const paramsSchema = z.object({ id: z.string().uuid() });

export const GET = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
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
      .where(eq(documents.id, parsed.data.id))
      .limit(1);

    if (!doc) {
      return fail("Document not found.", 404);
    }

    return ok(doc);
  },
);
