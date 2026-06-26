import { getSupabaseBrowser } from "./supabase-browser";
import { MAX_UPLOAD_BYTES } from "./constants";
import type { ApiResponse } from "./api";

export type DocStatus = "processing" | "ready" | "error";

export type DocumentInfo = {
  id: string;
  title: string;
  status: DocStatus;
  errorMessage: string | null;
  pageCount: number | null;
  chunkCount: number | null;
};

export type Citation = { page: number; snippet: string };
export type ChatResult = { answer: string; citations: Citation[] };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

/**
 * Full upload flow: validate, request a signed URL, upload the file directly to
 * Supabase Storage (bypassing the API body-size limit), then kick off ingest.
 * Returns the created document id.
 */
export async function uploadAndIngest(
  file: File,
  onProgress?: (phase: "uploading" | "starting") => void,
): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large. The limit is ${Math.round(
        MAX_UPLOAD_BYTES / (1024 * 1024),
      )} MB.`,
    );
  }

  onProgress?.("uploading");
  const { token, storagePath, bucket } = await postJson<{
    signedUrl: string;
    token: string;
    path: string;
    storagePath: string;
    bucket: string;
  }>("/api/upload-url", { filename: file.name, sizeBytes: file.size });

  const { error } = await getSupabaseBrowser().storage
    .from(bucket)
    .uploadToSignedUrl(storagePath, token, file);
  if (error) {
    throw new Error("Upload failed. Please try again.");
  }

  onProgress?.("starting");
  const title = file.name.replace(/\.pdf$/i, "");
  const { documentId } = await postJson<{
    documentId: string;
    status: DocStatus;
  }>("/api/ingest", { storagePath, title });

  return documentId;
}

export async function getDocument(id: string): Promise<DocumentInfo> {
  const res = await fetch(`/api/documents/${id}`);
  const json = (await res.json()) as ApiResponse<DocumentInfo>;
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export async function askQuestion(
  documentId: string,
  question: string,
): Promise<ChatResult> {
  return postJson<ChatResult>("/api/chat", { documentId, question });
}
