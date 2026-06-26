"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { AuthForm } from "@/components/AuthForm";
import { Sidebar } from "@/components/Sidebar";
import { UploadZone } from "@/components/UploadZone";
import { Chat, type Message } from "@/components/Chat";
import {
  askQuestion,
  getDocument,
  listDocuments,
  uploadAndIngest,
  type DocumentInfo,
} from "@/lib/client";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-ink-faint">Loading…</span>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10">
        <Brand />
        <AuthForm />
        <Footer />
      </main>
    );
  }

  return <Workspace user={user} />;
}

function Workspace({ user }: { user: User }) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string>();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messagesByDoc, setMessagesByDoc] = useState<Record<string, Message[]>>(
    {},
  );
  const [chatLoading, setChatLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  // Load the user's documents once.
  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => {});
    return stopPolling;
  }, []);

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  function upsertDoc(doc: DocumentInfo) {
    setDocuments((docs) => {
      const exists = docs.some((d) => d.id === doc.id);
      return exists
        ? docs.map((d) => (d.id === doc.id ? { ...d, ...doc } : d))
        : [doc, ...docs];
    });
  }

  function pollDocument(id: string) {
    stopPolling();
    const tick = async () => {
      try {
        const info = await getDocument(id);
        upsertDoc(info);
        if (info.status !== "processing") stopPolling();
      } catch {
        // transient — keep trying
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
  }

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    setBusyLabel("Uploading…");
    try {
      const id = await uploadAndIngest(file, (phase) =>
        setBusyLabel(phase === "uploading" ? "Uploading…" : "Starting…"),
      );
      upsertDoc({
        id,
        title: file.name.replace(/\.pdf$/i, ""),
        status: "processing",
        errorMessage: null,
        pageCount: null,
        chunkCount: null,
      });
      setSelectedId(id);
      pollDocument(id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, []);

  function selectDoc(id: string) {
    setSelectedId(id);
    setUploadError(null);
    const doc = documents.find((d) => d.id === id);
    if (doc?.status === "processing") pollDocument(id);
    else stopPolling();
  }

  function newDocument() {
    stopPolling();
    setSelectedId(null);
    setUploadError(null);
  }

  async function handleSend(question: string) {
    if (!selectedId) return;
    const id = selectedId;
    setMessagesByDoc((m) => ({
      ...m,
      [id]: [...(m[id] ?? []), { role: "user", content: question }],
    }));
    setChatLoading(true);
    try {
      const res = await askQuestion(id, question);
      setMessagesByDoc((m) => ({
        ...m,
        [id]: [
          ...(m[id] ?? []),
          { role: "assistant", content: res.answer, citations: res.citations },
        ],
      }));
    } catch (err) {
      setMessagesByDoc((m) => ({
        ...m,
        [id]: [
          ...(m[id] ?? []),
          {
            role: "assistant",
            content:
              err instanceof Error ? err.message : "Something went wrong.",
            error: true,
          },
        ],
      }));
    } finally {
      setChatLoading(false);
    }
  }

  async function signOut() {
    stopPolling();
    await getSupabaseBrowser().auth.signOut();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 py-6">
      {/* Sidebar (desktop) */}
      <div className="hidden w-64 shrink-0 flex-col md:flex">
        <Brand compact />
        <div className="mt-6 flex-1">
          <Sidebar
            documents={documents}
            selectedId={selectedId}
            email={user.email}
            onSelect={selectDoc}
            onNew={newDocument}
            onSignOut={signOut}
          />
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="mb-4 flex items-center gap-2 md:hidden">
          <Brand compact />
          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedId ?? ""}
              onChange={(e) =>
                e.target.value ? selectDoc(e.target.value) : newDocument()
              }
              className="max-w-[40vw] rounded-lg border border-line-strong bg-paper-raised px-2 py-1.5 text-sm text-ink"
            >
              <option value="">+ New document</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <button
              onClick={signOut}
              className="text-sm text-ink-soft hover:text-accent"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {selectedId === null ? (
            <NewDocumentView
              uploading={uploading}
              busyLabel={busyLabel}
              uploadError={uploadError}
              onFile={handleFile}
            />
          ) : selectedDoc?.status === "processing" ? (
            <ProcessingView pageCount={selectedDoc.pageCount} />
          ) : selectedDoc?.status === "error" ? (
            <ErrorView message={selectedDoc.errorMessage} onNew={newDocument} />
          ) : selectedDoc?.status === "ready" ? (
            <ReadyView
              doc={selectedDoc}
              messages={messagesByDoc[selectedDoc.id] ?? []}
              loading={chatLoading}
              onSend={handleSend}
            />
          ) : null}
        </div>

        <Footer />
      </div>
    </main>
  );
}

function NewDocumentView({
  uploading,
  busyLabel,
  uploadError,
  onFile,
}: {
  uploading: boolean;
  busyLabel?: string;
  uploadError: string | null;
  onFile: (f: File) => void;
}) {
  return (
    <section className="mt-6 sm:mt-10">
      <h1 className="font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
        Chat with annual reports
        <br />
        <span className="italic text-accent">&amp; earnings calls.</span>
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft">
        Upload a financial filing and ask questions in plain English. Every
        answer is grounded in the document and cites the exact page.
      </p>
      <div className="mt-8">
        <UploadZone
          busy={uploading}
          busyLabel={busyLabel}
          error={uploadError}
          onFile={onFile}
        />
      </div>
    </section>
  );
}

function ProcessingView({ pageCount }: { pageCount: number | null }) {
  return (
    <section className="mt-24 flex flex-col items-center text-center">
      <PulseRing />
      <h2 className="mt-8 font-serif text-2xl text-ink">
        {pageCount ? `Reading ${pageCount} pages…` : "Reading the document…"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        Parsing pages, splitting into passages, and building a searchable index.
        This usually takes under a minute.
      </p>
    </section>
  );
}

function ErrorView({
  message,
  onNew,
}: {
  message: string | null;
  onNew: () => void;
}) {
  return (
    <section className="mt-24 flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M12 8v5M12 16.5v.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h2 className="mt-6 font-serif text-2xl text-ink">
        Couldn&apos;t process this document
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        {message ?? "Please try a different file."}
      </p>
      <button
        onClick={onNew}
        className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-ink"
      >
        Upload another file
      </button>
    </section>
  );
}

function ReadyView({
  doc,
  messages,
  loading,
  onSend,
}: {
  doc: DocumentInfo;
  messages: Message[];
  loading: boolean;
  onSend: (q: string) => void;
}) {
  return (
    <section className="flex flex-1 flex-col">
      <div className="rounded-xl border border-line bg-paper-raised px-4 py-3">
        <p className="truncate font-serif text-lg text-ink">{doc.title}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {doc.pageCount ?? "—"} pages · {doc.chunkCount ?? "—"} passages indexed
          · grounded answers with page citations
        </p>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <Chat messages={messages} loading={loading} onSend={onSend} />
      </div>
    </section>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-paper">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19V5M4 19h16M8 16v-5M13 16V8M18 16v-3" />
        </svg>
      </span>
      {!compact && (
        <span className="font-serif text-xl font-medium tracking-tight text-ink">
          FilingIQ
        </span>
      )}
      {compact && (
        <span className="font-serif text-lg font-medium tracking-tight text-ink">
          FilingIQ
        </span>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-line pt-4">
      <p className="text-xs text-ink-faint">
        Answers are grounded in the uploaded document. For analysis only, not
        financial advice.
      </p>
    </footer>
  );
}

function PulseRing() {
  return (
    <span className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-20" />
      <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
