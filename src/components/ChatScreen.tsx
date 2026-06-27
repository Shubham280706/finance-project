"use client";

import { useEffect, useRef, useState } from "react";
import type { Citation, DocumentInfo, Message } from "@/lib/client";
import { Markdown } from "./Markdown";
import { LogoMark } from "./LogoMark";

const SUGGESTIONS = [
  "What was revenue growth year over year?",
  "Summarise the key risk factors",
  "How did operating margin move?",
];

export function ChatScreen({
  email,
  documents,
  doc,
  messages,
  loading,
  onSend,
  onSelectDoc,
  onNew,
  onNewChat,
  onDelete,
  onSignOut,
}: {
  email: string | undefined;
  documents: DocumentInfo[];
  doc: DocumentInfo;
  messages: Message[];
  loading: boolean;
  onSend: (q: string) => void;
  onSelectDoc: (id: string) => void;
  onNew: () => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState<Citation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Reset the source panel when switching documents.
  useEffect(() => setSource(null), [doc.id]);

  function submit() {
    const q = draft.trim();
    if (!q || loading) return;
    onSend(q);
    setDraft("");
  }

  return (
    <div className="flex h-screen min-h-[720px] w-full overflow-hidden bg-paper text-ink">
      {/* ============ LEFT GREEN RAIL ============ */}
      <aside className="hidden w-[248px] shrink-0 flex-col bg-brand px-[18px] py-[22px] text-on-green md:flex">
        <div className="flex items-center gap-[10px] px-1">
          <span className="flex h-[31px] w-[31px] items-center justify-center rounded-lg bg-on-green text-brand">
            <LogoMark size={17} />
          </span>
          <span className="font-serif text-[20px] font-semibold tracking-[-0.01em] text-on-green-bright">
            FilingIQ
          </span>
        </div>

        <button
          onClick={onNew}
          className="mt-[22px] flex items-center gap-2 rounded-lg border border-white/[0.22] bg-white/[0.06] px-[13px] py-[10px] text-[13.5px] font-medium text-on-green transition hover:bg-white/[0.12]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New document
        </button>

        <div className="mt-6 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-green-mono">
          Filings
        </div>
        <div className="fiq-scroll mt-[11px] flex flex-1 flex-col gap-1 overflow-y-auto">
          {documents.map((f) => {
            const active = f.id === doc.id;
            return (
              <div
                key={f.id}
                onClick={() => f.status === "ready" && onSelectDoc(f.id)}
                className={`group flex flex-col gap-[5px] rounded-lg px-[11px] py-[10px] text-left transition ${
                  active ? "bg-white/[0.12]" : "hover:bg-white/[0.06]"
                } ${f.status === "ready" ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate font-mono text-[12.5px] font-medium ${
                      active ? "text-on-green-bright" : "text-[#cfe0d7]"
                    }`}
                  >
                    {f.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className="h-[6px] w-[6px] rounded-full group-hover:hidden"
                      style={{ background: railDot(f.status) }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Delete "${f.title}"? This removes the file and its index permanently.`,
                          )
                        )
                          onDelete(f.id);
                      }}
                      title="Delete document"
                      aria-label={`Delete ${f.title}`}
                      className="hidden text-on-green-mono transition hover:text-[#e08a7c] group-hover:block"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </span>
                </span>
                <span className="font-mono text-[10.5px] text-[#7fa28f]">
                  {f.pageCount ? `${f.pageCount}p · ` : ""}
                  {railStatus(f.status)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center gap-[9px] border-t border-white/[0.13] px-[6px] pb-1 pt-3">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/[0.14] text-[11px] font-medium text-on-green-bright">
            {(email?.[0] ?? "?").toUpperCase()}
          </span>
          <span className="truncate font-mono text-[11px] text-on-green-muted">
            {email}
          </span>
          <button
            onClick={onSignOut}
            className="ml-auto font-mono text-[11px] text-on-green-mono hover:text-on-green-bright"
          >
            exit
          </button>
        </div>
      </aside>

      {/* ============ CENTER CHAT COLUMN ============ */}
      <main className="flex min-w-0 flex-1 flex-col bg-paper">
        {/* doc header */}
        <header className="flex flex-none items-center justify-between gap-4 border-b border-line bg-paper-2 px-5 py-[18px] sm:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-[10px]">
              <span className="truncate font-serif text-[21px] font-medium text-ink">
                {doc.title}
              </span>
              <span className="hidden shrink-0 rounded-[5px] border border-[#c4d8cd] bg-brand-tint px-[7px] py-[3px] font-mono text-[10.5px] tracking-[0.06em] text-ready sm:inline">
                INDEXED
              </span>
            </div>
            <div className="mt-[5px] truncate font-mono text-[11.5px] text-muted">
              {doc.title}.pdf · {doc.pageCount ?? "—"} pages ·{" "}
              {doc.chunkCount ?? "—"} passages
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              onClick={onNewChat}
              className="flex items-center gap-[7px] rounded-[7px] border border-line-3 bg-card-2 px-[13px] py-2 font-mono text-[11.5px] text-ink-2 transition hover:bg-[#f1efe6]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              New chat
            </button>
            {/* mobile doc switcher */}
            <select
              value={doc.id}
              onChange={(e) =>
                e.target.value === "__new"
                  ? onNew()
                  : onSelectDoc(e.target.value)
              }
              className="rounded-[7px] border border-line-3 bg-card-2 px-2 py-2 font-mono text-[11.5px] text-ink-2 md:hidden"
            >
              {documents
                .filter((d) => d.status === "ready")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              <option value="__new">+ New document</option>
            </select>
          </div>
        </header>

        {/* thread */}
        <div ref={scrollRef} className="fiq-scroll flex-1 overflow-y-auto px-5 pb-2 pt-[30px] sm:px-8">
          <div className="mx-auto flex max-w-[720px] flex-col gap-[30px]">
            {messages.length === 0 && (
              <div className="mt-4 text-center font-mono text-[12.5px] text-muted">
                Ask anything about{" "}
                <span className="text-ink-2">{doc.title}</span>. Answers cite the
                page they came from.
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="animate-rise flex justify-end">
                  <div className="max-w-[80%] rounded-[13px_13px_4px_13px] bg-brand px-4 py-3 text-[15px] leading-[1.5] text-brand-tint">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="animate-rise flex gap-[14px]">
                  <span className="mt-0.5 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-brand text-paper">
                    <LogoMark size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.error ? (
                      <p className="text-[15.5px] leading-[1.62] text-danger">
                        {m.content}
                      </p>
                    ) : (
                      <Markdown content={m.content} />
                    )}
                    {m.citations && m.citations.length > 0 && (
                      <CitationRow
                        citations={m.citations}
                        onCite={setSource}
                        activePage={source?.page}
                      />
                    )}
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex items-center gap-[14px]">
                <span className="mt-0.5 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-brand text-paper">
                  <LogoMark size={16} />
                </span>
                <span className="dot-pulse inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="flex-none bg-gradient-to-b from-transparent to-paper px-5 pb-[22px] pt-[14px] sm:px-8">
          <div className="mx-auto max-w-[720px]">
            {messages.length === 0 && (
              <div className="mb-[11px] flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setDraft(s)}
                    className="rounded-full border border-line-3 bg-card-2 px-[13px] py-[7px] font-mono text-[11.5px] text-ink-2 transition hover:border-brand hover:text-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-[10px] rounded-[13px] border-[1.5px] border-line-3 bg-card-2 py-[10px] pl-4 pr-[10px] transition focus-within:border-brand">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder="Ask about this filing…"
                className="max-h-[120px] min-h-[28px] flex-1 resize-none bg-transparent py-[5px] text-[15px] leading-[1.5] text-ink outline-none"
              />
              <button
                onClick={submit}
                disabled={!draft.trim() || loading}
                className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[9px] text-paper transition disabled:bg-[#b7bcad] [&:not(:disabled)]:bg-brand [&:not(:disabled)]:hover:bg-brand-dark"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="mt-[9px] text-center font-mono text-[10.5px] text-[#b0b1a5]">
              Grounded in {doc.title}.pdf · For analysis only, not financial
              advice.
            </div>
          </div>
        </div>
      </main>

      {/* ============ RIGHT SOURCE PANEL ============ */}
      <aside className="hidden w-[336px] shrink-0 flex-col border-l border-line bg-paper-2 xl:flex">
        <div className="flex flex-none items-center justify-between border-b border-line px-[22px] py-[18px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Source
          </span>
          {source && (
            <span className="rounded-[5px] border border-[#c4d8cd] bg-brand-tint px-[9px] py-[3px] font-mono text-[11.5px] text-brand">
              Page {source.page}
            </span>
          )}
        </div>
        <div className="fiq-scroll flex-1 overflow-y-auto p-[22px]">
          {source ? (
            <>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-faint">
                Cited passage
              </div>
              <div className="mt-[14px] rounded-[9px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(20,30,20,.04)]">
                <div className="flex justify-between font-mono text-[9.5px] tracking-[0.04em] text-[#bdbdb2]">
                  <span className="truncate">{doc.title.toUpperCase()}</span>
                  <span>p. {source.page}</span>
                </div>
                <div className="mt-4 rounded-[0_5px_5px_0] border-l-2 border-brand bg-brand-tint px-[11px] py-2 text-[13px] leading-[1.74] text-ink">
                  {source.snippet}
                </div>
                <div className="mt-[10px] font-mono text-[10.5px] text-faint">
                  Retrieved passage from page {source.page}, used to ground the
                  answer.
                </div>
              </div>
            </>
          ) : (
            <div className="mt-10 text-center font-mono text-[11.5px] leading-[1.7] text-muted">
              Click a{" "}
              <span className="rounded-[5px] border border-[#cbdfd2] bg-brand-tint px-[6px] py-[1px] text-brand">
                p. 42
              </span>{" "}
              citation in an answer to see the exact passage it came from.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function CitationRow({
  citations,
  onCite,
  activePage,
}: {
  citations: Citation[];
  onCite: (c: Citation) => void;
  activePage?: number;
}) {
  const [openInline, setOpenInline] = useState<number | null>(null);
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c) => {
          const active = activePage === c.page;
          return (
            <button
              key={c.page}
              onClick={() => {
                onCite(c);
                setOpenInline((p) => (p === c.page ? null : c.page));
              }}
              className={`rounded-[5px] border px-[6px] py-[1px] font-mono text-[11px] transition ${
                active
                  ? "border-brand bg-brand text-paper"
                  : "border-[#cbdfd2] bg-brand-tint text-brand hover:bg-[#d8e8dd]"
              }`}
            >
              p. {c.page}
            </button>
          );
        })}
      </div>
      {/* inline snippet (small screens only — the side panel covers xl+) */}
      {openInline !== null && (
        <div className="animate-rise rounded-lg border border-line bg-card p-3 text-xs leading-relaxed text-ink-3 xl:hidden">
          <span className="font-mono text-faint">p. {openInline} — </span>
          {citations.find((c) => c.page === openInline)?.snippet}
        </div>
      )}
    </div>
  );
}

function railDot(status: DocumentInfo["status"]) {
  return status === "ready" ? "#7fd3a8" : status === "processing" ? "#d9a441" : "#e08a7c";
}
function railStatus(status: DocumentInfo["status"]) {
  return status === "ready" ? "indexed" : status === "processing" ? "indexing…" : "failed";
}
