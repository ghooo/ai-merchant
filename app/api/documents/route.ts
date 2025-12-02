import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await readdir(uploadsDir);

    const documents = files
      .filter(f => f.endsWith('.pdf'))
      .map(filename => ({
        filename,
        uploaded_at: new Date().toISOString(),
      }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Documents error:', error);
    return NextResponse.json({ documents: [] });
  }
}
