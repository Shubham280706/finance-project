import { getEnv } from "./env";

export type ParsedPage = { page: number; text: string };

/** Thrown when a PDF yields no extractable text (likely a scanned/image PDF). */
export class ScannedPdfError extends Error {
  constructor(message = "This looks like a scanned document.") {
    super(message);
    this.name = "ScannedPdfError";
  }
}

const LLAMA_BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing";

/**
 * Parse a PDF into per-page text so page numbers are preserved for citations.
 * Uses LlamaParse (better tables) when LLAMA_CLOUD_API_KEY is set, otherwise
 * falls back to unpdf. Throws ScannedPdfError when no text can be extracted.
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const { LLAMA_CLOUD_API_KEY } = getEnv();

  let pages: ParsedPage[];
  if (LLAMA_CLOUD_API_KEY) {
    try {
      pages = await parseWithLlama(buffer, LLAMA_CLOUD_API_KEY);
    } catch (err) {
      if (err instanceof ScannedPdfError) throw err;
      console.error("[FilingIQ] LlamaParse failed, falling back to unpdf:", err);
      pages = await parseWithUnpdf(buffer);
    }
  } else {
    pages = await parseWithUnpdf(buffer);
  }

  const totalChars = pages.reduce((n, p) => n + p.text.trim().length, 0);
  if (totalChars < 50) {
    throw new ScannedPdfError();
  }
  return pages;
}

async function parseWithUnpdf(buffer: Buffer): Promise<ParsedPage[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pageTexts = Array.isArray(text) ? text : [text];
  return pageTexts.map((t, i) => ({ page: i + 1, text: (t ?? "").trim() }));
}

async function parseWithLlama(
  buffer: Buffer,
  apiKey: string,
): Promise<ParsedPage[]> {
  // 1. Upload the file and create a parse job.
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    "filing.pdf",
  );
  form.append("result_type", "markdown");

  const uploadRes = await fetch(`${LLAMA_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!uploadRes.ok) {
    throw new Error(
      `LlamaParse upload failed: ${uploadRes.status} ${await uploadRes.text()}`,
    );
  }
  const { id: jobId } = (await uploadRes.json()) as { id: string };

  // 2. Poll until the job completes (max ~4 minutes).
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(3000);
    const statusRes = await fetch(`${LLAMA_BASE}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!statusRes.ok) continue;
    const { status } = (await statusRes.json()) as { status: string };
    if (status === "SUCCESS") break;
    if (status === "ERROR" || status === "CANCELED") {
      throw new Error(`LlamaParse job ${status.toLowerCase()}`);
    }
  }

  // 3. Fetch the JSON result, which carries per-page markdown.
  const resultRes = await fetch(`${LLAMA_BASE}/job/${jobId}/result/json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resultRes.ok) {
    throw new Error(`LlamaParse result fetch failed: ${resultRes.status}`);
  }
  const result = (await resultRes.json()) as {
    pages?: { page?: number; md?: string; text?: string }[];
  };
  const rawPages = result.pages ?? [];
  return rawPages.map((p, i) => ({
    page: p.page ?? i + 1,
    text: (p.md ?? p.text ?? "").trim(),
  }));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
