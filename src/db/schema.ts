import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  vector,
  index,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  storagePath: text("storage_path").notNull(),
  status: text("status", { enum: ["processing", "ready", "error"] })
    .notNull()
    .default("processing"),
  errorMessage: text("error_message"),
  pageCount: integer("page_count"),
  chunkCount: integer("chunk_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    pageNumber: integer("page_number").notNull(),
    // voyage-3.5 returns 1024-dim vectors. This MUST match match_chunks().
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("chunks_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export type Document = typeof documents.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
