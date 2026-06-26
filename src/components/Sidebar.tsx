"use client";

import type { DocumentInfo } from "@/lib/client";

export function Sidebar({
  documents,
  selectedId,
  email,
  onSelect,
  onNew,
  onSignOut,
}: {
  documents: DocumentInfo[];
  selectedId: string | null;
  email: string | undefined;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col">
      <button
        onClick={onNew}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
          selectedId === null
            ? "border-accent bg-accent text-white"
            : "border-line-strong bg-paper-raised text-ink hover:border-accent"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New document
      </button>

      <p className="mb-2 mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        History
      </p>

      <div className="thin-scroll -mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {documents.length === 0 ? (
          <p className="px-1 py-2 text-sm text-ink-faint">
            No documents yet. Upload one to get started.
          </p>
        ) : (
          documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                selectedId === doc.id
                  ? "bg-accent-soft"
                  : "hover:bg-line/40"
              }`}
            >
              <span className="block truncate text-sm text-ink">
                {doc.title}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                <StatusDot status={doc.status} />
                <span className="text-xs text-ink-faint">
                  {doc.status === "ready"
                    ? `${doc.pageCount ?? "—"} pages`
                    : doc.status === "processing"
                      ? "Processing…"
                      : "Failed"}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="truncate px-1 text-xs text-ink-faint">{email}</p>
        <button
          onClick={onSignOut}
          className="mt-1 px-1 text-sm text-ink-soft underline-offset-4 transition hover:text-accent hover:underline"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function StatusDot({ status }: { status: DocumentInfo["status"] }) {
  const color =
    status === "ready"
      ? "bg-accent"
      : status === "processing"
        ? "bg-amber-500"
        : "bg-danger";
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}
