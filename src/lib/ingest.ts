import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, chunks } from "@/db/schema";
import { getSupabaseService, FILINGS_BUCKET } from "./supabase";
import { parsePdf, ScannedPdfError } from "./parse-pdf";
import { chunkPages } from "./chunk";
import { embedTexts, EmbeddingRateLimitError, EmbeddingAuthError } from "./embed";
import { MAX_PAGES } from "./constants";

const INSERT_BATCH = 200;

/**
 * Full ingest pipeline for one document. Runs in the background after the
 * ingest route responds. Any failure is recorded on the document row so the
 * UI can surface a friendly message — it never throws to an unhandled context.
 */
export async function processDocument(
  documentId: string,
  storagePath: string,
): Promise<void> {
  try {
    // 1. Download the PDF from storage (server-side, service role).
    const supabase = getSupabaseService();
    const { data, error } = await supabase.storage
      .from(FILINGS_BUCKET)
      .download(storagePath);
    if (error || !data) {
      throw new Error(`Could not download file from storage: ${error?.message}`);
    }
    const buffer = Buffer.from(await data.arrayBuffer());

    // 2. Parse into per-page text.
    const pages = await parsePdf(buffer);

    if (pages.length > MAX_PAGES) {
      await markError(
        documentId,
        `This document has ${pages.length} pages, which exceeds the ${MAX_PAGES}-page limit.`,
      );
      return;
    }

    // 3. Chunk with page metadata.
    const docChunks = await chunkPages(pages);
    if (docChunks.length === 0) {
      throw new ScannedPdfError();
    }

    // 4. Embed all chunks (input_type: document).
    const vectors = await embedTexts(
      docChunks.map((c) => c.content),
      "document",
    );

    // 5. Insert chunks in batches.
    for (let i = 0; i < docChunks.length; i += INSERT_BATCH) {
      const slice = docChunks.slice(i, i + INSERT_BATCH);
      const vecSlice = vectors.slice(i, i + INSERT_BATCH);
      await db.insert(chunks).values(
        slice.map((c, j) => ({
          documentId,
          content: c.content,
          pageNumber: c.pageNumber,
          embedding: vecSlice[j],
        })),
      );
    }

    // 6. Mark ready.
    await db
      .update(documents)
      .set({
        status: "ready",
        pageCount: pages.length,
        chunkCount: docChunks.length,
        errorMessage: null,
      })
      .where(eq(documents.id, documentId));
  } catch (err) {
    console.error(`[FilingIQ] Ingest failed for ${documentId}:`, err);
    let message: string;
    if (err instanceof ScannedPdfError) {
      message = "This looks like a scanned document; OCR isn't supported yet.";
    } else if (err instanceof EmbeddingAuthError) {
      message =
        "The embedding service rejected our credentials. This is a server configuration issue, not a problem with your file.";
    } else if (err instanceof EmbeddingRateLimitError) {
      message =
        "The embedding service is busy right now (rate limit). Please wait a minute and upload again.";
    } else {
      message = "We couldn't process this document. Please try a different file.";
    }
    await markError(documentId, message);
  }
}

async function markError(documentId: string, message: string): Promise<void> {
  try {
    await db
      .update(documents)
      .set({ status: "error", errorMessage: message })
      .where(eq(documents.id, documentId));
  } catch (err) {
    console.error(`[FilingIQ] Failed to mark error for ${documentId}:`, err);
  }
}
