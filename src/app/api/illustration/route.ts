import { NextRequest } from 'next/server';
import { createReadStream, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const BY_TITLE_DIR = join(process.cwd(), '.data', 'texts', 'by-title');

// 1x1 transparent PNG for fallback
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9m7QAAAAASUVORK5CYII=',
  'base64'
);

function normalizeKey(input: string) {
  return input
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    // Treat curly quotes/apostrophes as plain apostrophes.
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

/**
 * GET /api/illustration?title=BookTitle&image=1.png
 * Serves an illustration from the book's Illustrations folder.
 */
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title');
  const image = req.nextUrl.searchParams.get('image');

  if (!title || !image) {
    return new Response('Missing title or image parameter', { status: 400 });
  }

  // Sanitize image filename to prevent path traversal
  const safeImage = image.replace(/[/\\]/g, '').replace(/\.\./g, '');
  if (!safeImage) {
    return new Response('Invalid image parameter', { status: 400 });
  }

  const requestedKey = normalizeKey(title);

  // Find matching folder
  let matchedFolderName: string | null = null;
  try {
    const entries = readdirSync(BY_TITLE_DIR, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    const exact = folders.find((f) => normalizeKey(f) === requestedKey);
    matchedFolderName = exact ?? null;

    // Fallback: partial match
    if (!matchedFolderName) {
      matchedFolderName =
        folders.find((f) => normalizeKey(f).includes(requestedKey)) ??
        folders.find((f) => requestedKey.includes(normalizeKey(f))) ??
        null;
    }
  } catch {
    matchedFolderName = null;
  }

  if (!matchedFolderName) {
    return new Response(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // Check Illustrations folder
  const illustrationsPath = join(BY_TITLE_DIR, matchedFolderName, 'Illustrations');
  const imagePath = join(illustrationsPath, safeImage);

  // Helper to find and serve an image file
  const serveImage = (filePath: string, fileName: string) => {
    const stream = createReadStream(filePath);
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': guessContentType(fileName),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  };

  // Try exact path first
  if (existsSync(imagePath)) {
    return serveImage(imagePath, safeImage);
  }

  // Try finding the image with various matching strategies
  try {
    const files = readdirSync(illustrationsPath);
    
    // 1. Case-insensitive exact match
    let match = files.find((f) => f.toLowerCase() === safeImage.toLowerCase());
    
    // 2. Try with "image" prefix (e.g., "1.png" -> "image1.png")
    if (!match) {
      const withPrefix = 'image' + safeImage;
      match = files.find((f) => f.toLowerCase() === withPrefix.toLowerCase());
    }
    
    // 3. Try extracting number and matching (e.g., "1.png" matches "image1.png", "illustration_1.png", etc.)
    if (!match) {
      const numMatch = safeImage.match(/^(\d+)\.(png|jpg|jpeg|webp)$/i);
      if (numMatch) {
        const num = numMatch[1];
        const ext = numMatch[2].toLowerCase();
        match = files.find((f) => {
          const lower = f.toLowerCase();
          // Match patterns like: image1.png, illustration1.png, img_1.png, 01.png
          return (
            lower.endsWith(`.${ext}`) &&
            (lower.includes(num) || lower.match(new RegExp(`0*${num}\\.[^.]+$`)))
          );
        });
      }
    }
    
    if (match) {
      const matchedPath = join(illustrationsPath, match);
      return serveImage(matchedPath, match);
    }
  } catch {
    // Illustrations folder doesn't exist
  }

  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
