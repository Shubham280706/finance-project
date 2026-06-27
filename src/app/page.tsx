"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { AuthForm } from "@/components/AuthForm";
import { HomeScreen } from "@/components/HomeScreen";
import { ChatScreen } from "@/components/ChatScreen";
import { LogoMark } from "@/components/LogoMark";
import {
  askQuestion,
  getDocument,
  listDocuments,
  uploadAndIngest,
  type DocumentInfo,
  type Message,
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
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <span className="flex items-center gap-2 font-mono text-sm text-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-paper">
            <LogoMark size={15} />
          </span>
          Loading…
        </span>
      </main>
    );
  }

  if (!user) return <AuthForm />;

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

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(() => {});
    return stopPolling;
  }, []);

  function upsertDoc(doc: DocumentInfo) {
    setDocuments((docs) => {
      const exists = docs.some((d) => d.id === doc.id);
      return exists
        ? docs.map((d) => (d.id === doc.id ? { ...d, ...doc } : d))
        : [doc, ...docs];
    });
  }

  function pollNewDocument(id: string) {
    stopPolling();
    const tick = async () => {
      try {
        const info = await getDocument(id);
        upsertDoc(info);
        if (info.status === "ready") {
          stopPolling();
          setUploading(false);
          setSelectedId(id);
        } else if (info.status === "error") {
          stopPolling();
          setUploading(false);
          setUploadError(
            info.errorMessage ?? "We couldn't process this document.",
          );
        } else {
          setBusyLabel(
            info.pageCount
              ? `Indexing ${info.pageCount} pages — extracting tables & figures…`
              : "Indexing pages — extracting tables & figures…",
          );
        }
      } catch {
        // transient — keep polling
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
        createdAt: new Date().toISOString(),
      });
      setBusyLabel("Indexing pages — extracting tables & figures…");
      pollNewDocument(id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setUploading(false);
    }
  }, []);

  function selectDoc(id: string) {
    stopPolling();
    setUploadError(null);
    setUploading(false);
    setSelectedId(id);
  }

  function newDocument() {
    stopPolling();
    setSelectedId(null);
    setUploadError(null);
    setUploading(false);
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

  function newChat() {
    if (selectedId) setMessagesByDoc((m) => ({ ...m, [selectedId]: [] }));
  }

  async function signOut() {
    stopPolling();
    await getSupabaseBrowser().auth.signOut();
  }

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;
  const showChat = selectedDoc?.status === "ready";

  if (showChat && selectedDoc) {
    return (
      <ChatScreen
        email={user.email}
        documents={documents}
        doc={selectedDoc}
        messages={messagesByDoc[selectedDoc.id] ?? []}
        loading={chatLoading}
        onSend={handleSend}
        onSelectDoc={selectDoc}
        onNew={newDocument}
        onNewChat={newChat}
        onSignOut={signOut}
      />
    );
  }

  return (
    <HomeScreen
      email={user.email}
      documents={documents}
      uploading={uploading}
      busyLabel={busyLabel}
      uploadError={uploadError}
      onFile={handleFile}
      onOpenDoc={selectDoc}
      onSignOut={signOut}
    />
  );
}
