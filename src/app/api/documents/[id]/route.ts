import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { fail, handler, ok } from "@/lib/api";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { getSessionUser } from "@/lib/supabase-server";
import { getSupabaseService, FILINGS_BUCKET } from "@/lib/supabase";

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

export const DELETE = handler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const user = await getSessionUser();
    if (!user) return fail("Please sign in.", 401);

    const parsed = paramsSchema.safeParse(await ctx.params);
    if (!parsed.success) {
      return fail("Invalid document id.");
    }

    // Verify ownership and grab the storage path before deleting.
    const [doc] = await db
      .select({ storagePath: documents.storagePath })
      .from(documents)
      .where(
        and(eq(documents.id, parsed.data.id), eq(documents.userId, user.id)),
      )
      .limit(1);

    if (!doc) {
      return fail("Document not found.", 404);
    }

    // Remove the stored PDF (best-effort — don't fail the delete if it's gone).
    try {
      await getSupabaseService()
        .storage.from(FILINGS_BUCKET)
        .remove([doc.storagePath]);
    } catch (err) {
      console.error("[FilingIQ] Failed to remove storage object:", err);
    }

    // Delete the row; chunks cascade via the FK.
    await db
      .delete(documents)
      .where(
        and(eq(documents.id, parsed.data.id), eq(documents.userId, user.id)),
      );

    return ok({ deleted: true });
  },
);
