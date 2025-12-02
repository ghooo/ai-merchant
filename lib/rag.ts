import { createEmbedding } from './openai';
import { searchDocuments, addDocuments } from './chroma';
import { randomUUID } from 'crypto';

const CHUNK_SIZE = 500; // words (approximate)
const CHUNK_OVERLAP = 50;

export async function ingestText(
  text: string,
  filename: string
): Promise<{ documentId: string; chunksCreated: number }> {
  const documentId = randomUUID();

  // Split into chunks
  const chunks = splitIntoChunks(text, CHUNK_SIZE, CHUNK_OVERLAP);

  // Generate embeddings and store
  const ids: string[] = [];
  const documents: string[] = [];
  const embeddings: number[][] = [];
  const metadatas: Record<string, string>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await createEmbedding(chunk);

    ids.push(`${documentId}-${i}`);
    documents.push(chunk);
    embeddings.push(embedding);
    metadatas.push({
      document_id: documentId,
      filename,
      chunk_index: String(i),
    });
  }

  await addDocuments(ids, documents, embeddings, metadatas);

  return { documentId, chunksCreated: chunks.length };
}

export async function ingestPDF(
  buffer: Buffer,
  filename: string
): Promise<{ documentId: string; chunksCreated: number }> {
  // Dynamic import to avoid build issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const data = await pdfParse(buffer);
  return ingestText(data.text, filename);
}

export async function searchKnowledge(query: string): Promise<string[]> {
  const queryEmbedding = await createEmbedding(query);
  const results = await searchDocuments(queryEmbedding, 5);
  return results.documents;
}

function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}
