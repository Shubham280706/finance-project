"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "@/lib/client";

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  error?: boolean;
};

const SUGGESTIONS = [
  "What was total revenue this year?",
  "Summarize the key risks mentioned.",
  "What did management say about margins?",
];

export function Chat({
  messages,
  loading,
  onSend,
}: {
  messages: Message[];
  loading: boolean;
  onSend: (q: string) => void;
}) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  function submit() {
    const q = value.trim();
    if (!q || loading) return;
    onSend(q);
    setValue("");
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="thin-scroll flex-1 space-y-6 overflow-y-auto px-1 py-2"
      >
        {messages.length === 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-ink-soft">
              Ask anything about this document. Try one of these:
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="rounded-full border border-line-strong bg-paper-raised px-4 py-1.5 text-sm text-ink-soft transition hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-ink-faint">
            <span className="dot-pulse inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="text-sm">Reading the document…</span>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-end gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask about revenue, risks, guidance…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-line-strong bg-paper-raised px-4 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={loading || !value.trim()}
            className="h-[44px] rounded-xl bg-accent px-5 text-sm font-medium text-white transition hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="animate-rise flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-paper">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise max-w-[92%]">
      {message.error ? (
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-danger">
          {message.content}
        </div>
      ) : (
        <Markdown content={message.content} />
      )}
      {message.citations && message.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {message.citations.map((c) => (
            <CitationPill key={c.page} citation={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 font-serif text-xl text-ink first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 font-serif text-lg text-ink first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-sm font-semibold uppercase tracking-wide text-ink-soft first:mt-0">
              {children}
            </h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          code: ({ children }) => (
            <code className="rounded bg-line/60 px-1 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-sm tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-accent-soft text-accent-ink">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-line px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line/60 px-3 py-1.5">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CitationPill({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition ${
          open
            ? "border-accent bg-accent text-white"
            : "border-accent/40 bg-accent-soft text-accent-ink hover:border-accent"
        }`}
      >
        p. {citation.page}
      </button>
      {open && (
        <div className="animate-rise mt-2 max-w-md rounded-lg border border-line-strong bg-paper-raised p-3 text-xs leading-relaxed text-ink-soft">
          <span className="font-mono text-ink-faint">
            Page {citation.page} —{" "}
          </span>
          {citation.snippet}
        </div>
      )}
    </div>
  );
}
