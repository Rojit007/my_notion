import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface StorageUploadResult {
  storageKey: string;
  url: string;
}

function uploadsDir() {
  return path.join(process.cwd(), 'public', 'uploads');
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// Local filesystem storage (dev). Set STORAGE_BACKEND=s3 in production
// to swap in an S3-compatible implementation behind this interface.
export const storageService = {
  async upload(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageUploadResult> {
    const ext = path.extname(originalName) || '';
    const key = `${crypto.randomUUID()}${ext}`;
    const dir = uploadsDir();
    await ensureDir(dir);
    await fs.writeFile(path.join(dir, key), buffer);
    return { storageKey: key, url: `/uploads/${key}` };
  },

  async uploadText(content: string, filename: string): Promise<StorageUploadResult> {
    const dir = uploadsDir();
    await ensureDir(dir);
    await fs.writeFile(path.join(dir, filename), content, 'utf-8');
    return { storageKey: filename, url: `/uploads/${filename}` };
  },

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(path.join(uploadsDir(), storageKey));
    } catch {
      // File may not exist — ignore
    }
  },

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(path.join(uploadsDir(), storageKey));
  },
};
