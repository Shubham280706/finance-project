import { getSupabaseService } from "./supabase";
import type { RetrievedChunk } from "./anthropic";

/**
 * Retrieve the most similar chunks for a query embedding, scoped to a single
 * document. Uses the Postgres `match_chunks` function via Supabase RPC since
 * the `<=>` cosine operator is awkward to express through Drizzle/RPC cleanly.
 */
export async function matchChunks(
  queryEmbedding: number[],
  documentId: string,
  matchCount = 8,
): Promise<RetrievedChunk[]> {
  const supabase = getSupabaseService();
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    doc_id: documentId,
  });

  if (error) {
    throw new Error(`match_chunks RPC failed: ${error.message}`);
  }

  return (data ?? []).map(
    (row: {
      id: string;
      content: string;
      page_number: number;
      similarity: number;
    }) => ({
      id: row.id,
      content: row.content,
      pageNumber: row.page_number,
      similarity: row.similarity,
    }),
  );
}
