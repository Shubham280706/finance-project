import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "./env";

export const FAITHFULNESS_SYSTEM_PROMPT = `You are DocAlpha, an assistant that answers questions about a single financial document
(an annual report, regulatory filing, or earnings-call transcript).

STRICT RULES:
- Answer ONLY using the CONTEXT provided below. The CONTEXT is the sole source of truth.
- Do NOT use any outside knowledge, prior training, or assumptions about the company.
- Every factual claim, especially every number, must come directly from the CONTEXT.
- After each claim, cite the page it came from in the form (p. <number>).
- If the CONTEXT does not contain the information needed to answer, reply exactly:
  "I couldn't find that in this document." Then, optionally, suggest what section might contain it.
- Never fabricate figures, dates, names, or page numbers.
- Be concise and precise. Prefer exact figures from the document over paraphrase.`;

export type RetrievedChunk = {
  id: string;
  content: string;
  pageNumber: number;
  similarity: number;
};

export type Citation = { page: number; snippet: string };

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  const { ANTHROPIC_API_KEY } = getEnv();
  client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

function modelString(): string {
  return getEnv().GENERATION_MODE === "cheap"
    ? "claude-haiku-4-5-20251001"
    : "claude-sonnet-4-6";
}

/**
 * Generate a grounded, page-cited answer from the retrieved chunks only.
 * Returns the answer plus the citations whose pages the model actually cited.
 */
export async function answerQuestion(
  question: string,
  chunks: RetrievedChunk[],
): Promise<{ answer: string; citations: Citation[] }> {
  const context = chunks
    .map((c) => `[page ${c.pageNumber}]\n${c.content}`)
    .join("\n\n---\n\n");

  const userContent = `CONTEXT:\n${context}\n\nQUESTION:\n${question}`;

  const msg = await getClient().messages.create({
    model: modelString(),
    max_tokens: 1024,
    system: FAITHFULNESS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const answer = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { answer, citations: extractCitations(answer, chunks) };
}

/**
 * Pull the page numbers the model cited as `(p. N)` and map them back to the
 * retrieved chunks so the UI can show the exact source snippet.
 */
function extractCitations(
  answer: string,
  chunks: RetrievedChunk[],
): Citation[] {
  const cited = new Set<number>();
  const re = /\(p\.?\s*(\d+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    cited.add(Number(m[1]));
  }

  const byPage = new Map<number, RetrievedChunk>();
  for (const c of chunks) {
    // Keep the highest-similarity chunk per page.
    const existing = byPage.get(c.pageNumber);
    if (!existing || c.similarity > existing.similarity) {
      byPage.set(c.pageNumber, c);
    }
  }

  const citations: Citation[] = [];
  for (const page of [...cited].sort((a, b) => a - b)) {
    const chunk = byPage.get(page);
    if (chunk) {
      citations.push({ page, snippet: truncate(chunk.content, 400) });
    }
  }
  return citations;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n).trimEnd() + "…";
}
