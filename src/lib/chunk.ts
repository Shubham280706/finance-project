import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { ParsedPage } from "./parse-pdf";

export type DocChunk = { content: string; pageNumber: number };

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 150,
});

/**
 * Split parsed pages into chunks while preserving the source page number for
 * each chunk (needed for citations). Splitting is done per page so a chunk
 * never straddles a page boundary and its page number stays exact.
 */
export async function chunkPages(pages: ParsedPage[]): Promise<DocChunk[]> {
  const out: DocChunk[] = [];
  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;
    const parts = await splitter.splitText(text);
    for (const part of parts) {
      const content = part.trim();
      if (content) out.push({ content, pageNumber: page.page });
    }
  }
  return out;
}
