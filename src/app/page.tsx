"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { Chat, type Message } from "@/components/Chat";
import {
  askQuestion,
  getDocument,
  uploadAndIngest,
  type DocumentInfo,
} from "@/lib/client";

type Stage = "idle" | "uploading" | "processing" | "ready" | "error";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string>();
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => stopPolling, []);

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setStage("uploading");
    setBusyLabel("Uploading…");
    try {
      const id = await uploadAndIngest(file, (phase) =>
        setBusyLabel(phase === "uploading" ? "Uploading…" : "Starting…"),
      );
      setStage("processing");
      setBusyLabel("Reading the document…");
      pollDocument(id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setStage("idle");
    }
  }, []);

  function pollDocument(id: string) {
    stopPolling();
    const tick = async () => {
      try {
        const info = await getDocument(id);
        setDoc(info);
        if (info.status === "ready") {
          stopPolling();
          setStage("ready");
        } else if (info.status === "error") {
          stopPolling();
          setDocError(
            info.errorMessage ?? "We couldn't process this document.",
          );
          setStage("error");
        } else {
          setBusyLabel(
            info.pageCount
              ? `Reading ${info.pageCount} pages…`
              : "Reading the document…",
          );
        }
      } catch {
        // Transient poll failure — keep trying.
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
  }

  async function handleSend(question: string) {
    if (!doc) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setChatLoading(true);
    try {
      const res = await askQuestion(doc.id, question);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.answer, citations: res.citations },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function reset() {
    stopPolling();
    setStage("idle");
    setDoc(null);
    setDocError(null);
    setUploadError(null);
    setMessages([]);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10 sm:py-16">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-serif text-xl font-medium tracking-tight text-ink">
            FilingIQ
          </span>
        </div>
        {(stage === "ready" || stage === "error") && (
          <button
            onClick={reset}
            className="text-sm text-ink-soft underline-offset-4 transition hover:text-accent hover:underline"
          >
            New document
          </button>
        )}
      </header>

      {/* Hero (before a doc is loaded) */}
      {(stage === "idle" || stage === "uploading") && (
        <section className="mt-16 sm:mt-24">
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
            Chat with annual reports
            <br />
            <span className="italic text-accent">&amp; earnings calls.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
            Upload a financial filing and ask questions in plain English. Every
            answer is grounded in the document and cites the exact page — and
            when the answer isn&apos;t there, FilingIQ says so.
          </p>
          <div className="mt-10">
            <UploadZone
              busy={stage === "uploading"}
              busyLabel={busyLabel}
              error={uploadError}
              onFile={handleFile}
            />
          </div>
        </section>
      )}

      {/* Processing */}
      {stage === "processing" && (
        <section className="mt-24 flex flex-col items-center text-center">
          <PulseRing />
          <h2 className="mt-8 font-serif text-2xl text-ink">{busyLabel}</h2>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">
            Parsing pages, splitting into passages, and building a searchable
            index. This usually takes under a minute.
          </p>
        </section>
      )}

      {/* Error */}
      {stage === "error" && (
        <section className="mt-24 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M12 8v5M12 16.5v.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <h2 className="mt-6 font-serif text-2xl text-ink">
            Couldn&apos;t process this document
          </h2>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">{docError}</p>
          <button
            onClick={reset}
            className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-ink"
          >
            Try another file
          </button>
        </section>
      )}

      {/* Ready — chat */}
      {stage === "ready" && doc && (
        <section className="mt-8 flex flex-1 flex-col">
          <div className="rounded-xl border border-line bg-paper-raised px-4 py-3">
            <p className="truncate font-serif text-lg text-ink">{doc.title}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {doc.pageCount ?? "—"} pages · {doc.chunkCount ?? "—"} passages
              indexed · grounded answers with page citations
            </p>
          </div>
          <div className="mt-4 flex flex-1 flex-col">
            <Chat
              messages={messages}
              loading={chatLoading}
              onSend={handleSend}
            />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-line pt-5">
        <p className="text-xs text-ink-faint">
          Answers are grounded in the uploaded document. For analysis only, not
          financial advice.
        </p>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-paper">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19V5M4 19h16M8 16v-5M13 16V8M18 16v-3" />
      </svg>
    </span>
  );
}

function PulseRing() {
  return (
    <span className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-20" />
      <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg
          className="animate-spin"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="3"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}
