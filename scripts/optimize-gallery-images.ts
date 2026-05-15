/**
 * Reprocessa imagens já publicadas na galeria (resize + WebP) e atualiza URLs no banco.
 * Uso: bun run scripts/optimize-gallery-images.ts
 * Requer DATABASE_URL e credenciais S3 (AWS_* / AWS_S3_FESTA_*).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { S3Client } from "bun";
import sharp from "sharp";

const GALLERY_PREFIX = "festa-site/gallery/";
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 80;

function getPublicBaseUrl(): string {
  const base = process.env.AWS_S3_FESTA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (base) return base;
  const bucket = process.env.AWS_S3_FESTA_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    throw new Error(
      "Defina AWS_S3_FESTA_PUBLIC_BASE_URL ou AWS_S3_FESTA_BUCKET + AWS_REGION",
    );
  }
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

function extractGalleryKeyFromUrl(url: string): string | null {
  const trimmed = url.trim();
  const publicBase = process.env.AWS_S3_FESTA_PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (publicBase && trimmed.startsWith(`${publicBase}/`)) {
    const key = trimmed.slice(publicBase.length + 1).split("?")[0] ?? "";
    return key.startsWith(GALLERY_PREFIX) ? key : null;
  }
  const bucket = process.env.AWS_S3_FESTA_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return null;
  const s3Prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (trimmed.startsWith(s3Prefix)) {
    const key = trimmed.slice(s3Prefix.length).split("?")[0] ?? "";
    return key.startsWith(GALLERY_PREFIX) ? key : null;
  }
  return null;
}

function createS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_FESTA_BUCKET;
  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    throw new Error(
      "S3 não configurado: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_FESTA_BUCKET",
    );
  }
  return new S3Client({ accessKeyId, secretAccessKey, region, bucket });
}

async function processBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input, { animated: false })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const s3 = createS3Client();
  const publicBase = getPublicBaseUrl();

  const items = await prisma.festaGalleryImage.findMany({
    orderBy: { id: "asc" },
  });

  console.log(`Encontradas ${items.length} imagem(ns) na galeria.`);

  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const oldKey = extractGalleryKeyFromUrl(item.url);
    const alreadyWebp =
      item.url.toLowerCase().includes(".webp") ||
      oldKey?.toLowerCase().endsWith(".webp");

    if (alreadyWebp && oldKey) {
      console.log(`[${item.id}] já WebP — ignorando`);
      skipped++;
      continue;
    }

    console.log(`[${item.id}] baixando ${item.url}`);
    const res = await fetch(item.url);
    if (!res.ok) {
      console.error(`[${item.id}] falha HTTP ${res.status} — pulando`);
      continue;
    }

    const raw = Buffer.from(await res.arrayBuffer());
    const optimized = await processBuffer(raw);
    const newKey = `${GALLERY_PREFIX}${Date.now()}-${randomUUID()}.webp`;

    await s3.file(newKey).write(optimized, { type: "image/webp" });
    const newUrl = `${publicBase}/${newKey}`;

    await prisma.festaGalleryImage.update({
      where: { id: item.id },
      data: { url: newUrl },
    });

    if (oldKey && oldKey !== newKey) {
      try {
        await s3.file(oldKey).delete();
        console.log(`[${item.id}] objeto antigo removido: ${oldKey}`);
      } catch (e) {
        console.warn(`[${item.id}] não foi possível apagar ${oldKey}:`, e);
      }
    }

    const kb = Math.round(optimized.length / 1024);
    console.log(`[${item.id}] OK → ${newUrl} (${kb} KB)`);
    updated++;
  }

  await prisma.$disconnect();
  console.log(`Concluído: ${updated} atualizada(s), ${skipped} ignorada(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
