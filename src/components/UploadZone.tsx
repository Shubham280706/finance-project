"use client";

import { useRef, useState } from "react";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export function UploadZone({
  busy,
  busyLabel,
  error,
  onFile,
}: {
  busy: boolean;
  busyLabel?: string;
  error?: string | null;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) pick(e.dataTransfer.files);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center transition ${
          dragging
            ? "border-accent bg-accent-soft"
            : "border-line-strong bg-paper-raised hover:border-accent"
        } ${busy ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />

        {busy ? (
          <>
            <Spinner />
            <p className="mt-4 text-sm font-medium text-ink">
              {busyLabel ?? "Working…"}
            </p>
          </>
        ) : (
          <>
            <DocIcon />
            <p className="mt-4 text-base font-medium text-ink">
              Drop a PDF here, or click to browse
            </p>
            <p className="mt-1.5 text-sm text-ink-faint">
              Annual reports, 10-Ks, earnings-call transcripts · up to{" "}
              {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function DocIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin text-accent"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
