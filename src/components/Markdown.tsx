"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders assistant Markdown (GFM tables, headings, lists) in the DocAlpha style. */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[15.5px] leading-[1.62] text-ink-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="my-2.5 first:mt-0 last:mb-0">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 font-serif text-xl text-ink first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 font-serif text-lg text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-faint first:mt-0">
              {children}
            </h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 list-disc space-y-1.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 list-decimal space-y-1.5 pl-5">{children}</ol>
          ),
          code: ({ children }) => (
            <code className="rounded bg-line-2 px-1 py-0.5 font-mono text-[13px] text-ink-2">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-brand underline underline-offset-2">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-[11px] border border-line bg-card">
              <table className="w-full border-collapse text-sm [font-variant-numeric:tabular-nums]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-brand-tint text-brand">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-line px-3 py-2 text-left font-mono text-[11px] font-medium uppercase tracking-[0.1em]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line-2 px-3 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
