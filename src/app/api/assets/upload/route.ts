import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/server/db';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
];

export async function POST(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 415 });

  const uploadDir = path.join(UPLOAD_DIR, projectId);
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(uploadDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  const url = `/uploads/${projectId}/${safeName}`;
  const assetType = file.type.startsWith('audio/') ? 'audio' : 'image';

  const asset = await db.asset.create({
    data: {
      projectId,
      name: file.name.replace(/\.[^.]+$/, ''),
      type: assetType,
      mimeType: file.type,
      fileSize: file.size,
      storageKey: `${projectId}/${safeName}`,
      url,
    },
  });

  return NextResponse.json(asset);
}
