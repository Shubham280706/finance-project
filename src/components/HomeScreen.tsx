"use client";

import { useRef, useState } from "react";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { DocumentInfo } from "@/lib/client";
import { LogoMark } from "./LogoMark";

const STEPS = [
  { n: "01", label: "Upload a filing", note: "PDF · up to 25 MB" },
  { n: "02", label: "We index every page", note: "~30 seconds" },
  { n: "03", label: "Ask in plain English", note: "Answers cite the page" },
];

export function HomeScreen({
  email,
  documents,
  uploading,
  busyLabel,
  uploadError,
  onFile,
  onOpenDoc,
  onDelete,
  onSignOut,
}: {
  email: string | undefined;
  documents: DocumentInfo[];
  uploading: boolean;
  busyLabel?: string;
  uploadError: string | null;
  onFile: (f: File) => void;
  onOpenDoc: (id: string) => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (f) onFile(f);
  }

  return (
    <div className="flex h-screen min-h-[740px] w-full overflow-hidden bg-paper text-ink">
      {/* ============ LEFT GREEN PANEL ============ */}
      <section className="hidden shrink-0 flex-col bg-brand px-10 pb-9 pt-11 text-on-green lg:flex lg:w-[clamp(384px,34%,468px)]">
        <div className="flex items-center gap-3">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-on-green text-brand">
            <LogoMark size={18} />
          </span>
          <span className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-on-green-bright">
            FilingIQ
          </span>
        </div>

        <div className="my-auto py-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-on-green-mono">
            Document intelligence
          </div>
          <h1 className="mt-[18px] font-serif text-[clamp(36px,3.6vw,46px)] font-normal leading-[1.1] tracking-[-0.018em] text-on-green-bright">
            Chat with annual reports{" "}
            <span className="italic">and earnings calls.</span>
          </h1>
          <p className="mt-5 max-w-[330px] text-base leading-[1.62] text-on-green-muted">
            Upload a filing and ask questions in plain English — every answer
            cites the exact page it came from.
          </p>
        </div>

        <div className="flex flex-col">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex items-baseline gap-4 border-t border-white/[0.13] py-[15px]"
            >
              <span className="font-mono text-xs text-on-green-mono">{s.n}</span>
              <div className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-[15px] text-on-green">{s.label}</span>
                <span className="whitespace-nowrap font-mono text-[11.5px] text-[#7fa28f]">
                  {s.note}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[30px] flex items-center gap-2 font-mono text-[10.5px] tracking-[0.04em] text-on-green-mono">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          SOC 2 Type II · Documents never trained on
        </div>
      </section>

      {/* ============ RIGHT WORKING AREA ============ */}
      <main className="flex min-w-0 flex-1 flex-col px-[clamp(20px,4vw,54px)] pb-[30px] pt-[clamp(24px,3.4vw,46px)]">
        {/* top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-brand px-[17px] py-[11px] text-sm font-medium text-paper transition hover:bg-brand-dark"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New document
          </button>
          <div className="flex items-center gap-[11px] font-mono text-xs text-muted">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line-3 bg-[#e6e9df] text-[11px] font-medium text-brand">
              {(email?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="hidden truncate sm:inline">{email}</span>
            <span className="text-line-4">·</span>
            <button onClick={onSignOut} className="text-ink-2 hover:text-brand">
              Sign out
            </button>
          </div>
        </div>

        {/* dropzone */}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading) pick(e.dataTransfer.files);
          }}
          className={`mt-[22px] flex min-h-[104px] cursor-pointer items-center rounded-xl border-[1.5px] border-dashed px-7 py-6 transition ${
            uploading
              ? "border-brand bg-[#f1f5f1]"
              : dragging
                ? "border-brand bg-[#edf2ed]"
                : "border-line-4 bg-card-2 hover:border-brand"
          }`}
        >
          {uploading ? (
            <div className="flex w-full items-center gap-5">
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[11px] bg-brand text-paper">
                <FileIcon size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[13.5px] font-medium text-ink">
                  {busyLabel ?? "Working…"}
                </div>
                <div className="mt-[9px] h-[6px] overflow-hidden rounded-full bg-[#dcdacd]">
                  <div className="h-full w-1/3 animate-[fiq-pulse_1.4s_ease-in-out_infinite] rounded-full bg-brand" />
                </div>
                <div className="mt-[9px] font-mono text-[11.5px] text-muted-2">
                  This usually takes under a minute.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center gap-[22px]">
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[11px] border border-[#d8e0d6] bg-[#eef1ec] text-brand">
                <FileIcon size={25} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-semibold text-ink">
                  Drop a PDF here, or click to browse
                </div>
                <div className="mt-[5px] font-mono text-xs text-muted">
                  Annual reports · 10-Ks · earnings-call transcripts — up to{" "}
                  {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB
                </div>
              </div>
              <span className="hidden shrink-0 rounded-[7px] border border-line-4 bg-card-2 px-[15px] py-[9px] text-[13.5px] font-medium text-ink-2 sm:inline">
                Browse
              </span>
            </div>
          )}
        </div>

        {uploadError && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {uploadError}
          </p>
        )}

        {/* recent filings */}
        <div className="mt-[34px] flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Recent filings
          </span>
          <span className="font-mono text-[11.5px] text-[#b6b7ab]">
            {documents.length} total
          </span>
        </div>

        <div className="mt-[14px] overflow-hidden rounded-[11px] border border-line bg-card">
          <div className="grid grid-cols-[1fr_110px_56px_92px_34px] gap-4 border-b border-line px-[18px] py-[11px] font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            <span>Document</span>
            <span>Added</span>
            <span className="text-right">Pages</span>
            <span className="text-right">Status</span>
            <span />
          </div>
          {documents.length === 0 ? (
            <div className="px-[18px] py-6 font-mono text-[12.5px] text-muted">
              No filings yet — upload one above to get started.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => doc.status === "ready" && onOpenDoc(doc.id)}
                className={`group grid grid-cols-[1fr_110px_56px_92px_34px] items-center gap-4 border-t border-line-2 px-[18px] py-[15px] text-left transition ${
                  doc.status === "ready"
                    ? "cursor-pointer hover:bg-[#f1efe6]"
                    : "cursor-default"
                }`}
              >
                <span className="flex min-w-0 items-center gap-[10px]">
                  <span
                    className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
                    style={{ background: statusAccent(doc.status) }}
                  />
                  <span className="truncate font-mono text-[13.5px] font-medium text-ink">
                    {doc.title}
                  </span>
                </span>
                <span className="font-mono text-[12px] text-muted-2">
                  {formatDate(doc.createdAt)}
                </span>
                <span className="text-right font-mono text-[13px] text-muted-2 [font-variant-numeric:tabular-nums]">
                  {doc.pageCount ?? "—"}
                </span>
                <StatusCell status={doc.status} />
                <DeleteButton title={doc.title} onConfirm={() => onDelete(doc.id)} />
              </div>
            ))
          )}
        </div>

        <div className="flex-1" />
        <div className="mt-[22px] border-t border-line pt-[15px] font-mono text-[11.5px] text-faint">
          Answers are grounded in the uploaded document. For analysis only — not
          financial advice.
        </div>
      </main>
    </div>
  );
}

function DeleteButton({
  title,
  onConfirm,
}: {
  title: string;
  onConfirm: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (
          window.confirm(
            `Delete "${title}"? This removes the file and its index permanently.`,
          )
        ) {
          onConfirm();
        }
      }}
      title="Delete document"
      aria-label={`Delete ${title}`}
      className="flex h-7 w-7 items-center justify-center rounded-md text-faint opacity-0 transition hover:bg-danger-soft hover:text-danger focus:opacity-100 group-hover:opacity-100"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

function StatusCell({ status }: { status: DocumentInfo["status"] }) {
  const { label, color, dot } = statusMeta(status);
  return (
    <span
      className="flex items-center justify-end gap-[7px] font-mono text-[11.5px]"
      style={{ color }}
    >
      <span className="h-[6px] w-[6px] rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

function statusMeta(status: DocumentInfo["status"]) {
  if (status === "ready")
    return { label: "Ready", color: "#3f8c6a", dot: "#10503b" };
  if (status === "processing")
    return { label: "Indexing", color: "#b0863a", dot: "#d9a441" };
  return { label: "Failed", color: "#9a3328", dot: "#9a3328" };
}
function statusAccent(status: DocumentInfo["status"]) {
  return status === "processing" ? "#d9a441" : status === "error" ? "#9a3328" : "#10503b";
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && d.getDate() === new Date().getDate()) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function FileIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}
