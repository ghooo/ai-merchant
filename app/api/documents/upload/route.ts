import { NextRequest, NextResponse } from 'next/server';
import { ingestPDF } from '@/lib/rag';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files allowed' },
        { status: 400 }
      );
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filepath = path.join(process.cwd(), 'uploads', file.name);
    await writeFile(filepath, buffer);

    // Ingest into RAG
    const result = await ingestPDF(buffer, file.name);

    return NextResponse.json({
      document_id: result.documentId,
      filename: file.name,
      chunks_created: result.chunksCreated,
      status: 'processed',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
