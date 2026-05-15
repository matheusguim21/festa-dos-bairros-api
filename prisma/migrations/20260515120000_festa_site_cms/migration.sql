-- CreateTable
CREATE TABLE "FestaGalleryImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FestaGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestaSiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "videoFileUrl" TEXT,
    "videoEmbedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FestaSiteConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "FestaSiteConfig" ("id", "createdAt", "updatedAt") VALUES (1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable (alinhado ao @updatedAt do Prisma; tabelas criadas acima)
ALTER TABLE "FestaGalleryImage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FestaSiteConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;
