import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const runtime = 'nodejs';

const maxFileSize = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('cv');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose a CV file first.' }, { status: 400 });
    }
    if (file.size > maxFileSize) {
      return NextResponse.json({ error: 'The CV must be 5 MB or smaller.' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      text = result.text;
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.type === 'text/plain' || name.endsWith('.txt')) {
      text = buffer.toString('utf8');
    } else {
      return NextResponse.json({ error: 'Upload a PDF, DOCX, or TXT CV.' }, { status: 400 });
    }

    const normalizedText = text.replace(/\s{3,}/g, '\n\n').trim();
    if (!normalizedText) {
      return NextResponse.json({ error: 'No readable text was found. Use a text-based PDF or DOCX file.' }, { status: 422 });
    }

    return NextResponse.json({ text: normalizedText.slice(0, 30_000), fileName: file.name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read the CV.' },
      { status: 500 }
    );
  }
}
