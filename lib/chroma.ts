import { ChromaClient, Collection } from 'chromadb';

let client: ChromaClient | null = null;
let collection: Collection | null = null;

export async function getChromaCollection(): Promise<Collection> {
  if (collection) return collection;

  client = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });
  collection = await client.getOrCreateCollection({
    name: 'knowledge_base',
    metadata: { 'hnsw:space': 'cosine' },
  });

  return collection;
}

export async function addDocuments(
  ids: string[],
  documents: string[],
  embeddings: number[][],
  metadatas: Record<string, string>[]
): Promise<void> {
  const col = await getChromaCollection();
  await col.add({ ids, documents, embeddings, metadatas });
}

export async function searchDocuments(
  queryEmbedding: number[],
  nResults: number = 5
): Promise<{ documents: string[]; metadatas: Record<string, string>[] }> {
  const col = await getChromaCollection();
  const results = await col.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
  });

  return {
    documents: (results.documents?.[0] ?? []) as string[],
    metadatas: (results.metadatas?.[0] ?? []) as Record<string, string>[],
  };
}
