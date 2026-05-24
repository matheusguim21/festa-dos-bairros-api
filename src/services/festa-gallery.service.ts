import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { FestaS3Service } from "@/infra/storage/festa-s3.service";
import { Injectable, NotFoundException } from "@nestjs/common";

export type PublicGalleryImage = {
  id: number;
  url: string;
  alt: string;
  displayOrder: number;
};

@Injectable()
export class FestaGalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly festaS3: FestaS3Service,
  ) {}

  findAllPublic(): Promise<PublicGalleryImage[]> {
    return this.prisma.festaGalleryImage.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: { id: true, url: true, alt: true, displayOrder: true },
    });
  }

  findAllAdmin() {
    return this.prisma.festaGalleryImage.findMany({
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
  }

  async create(data: { url: string; alt?: string; displayOrder?: number }) {
    return this.prisma.festaGalleryImage.create({
      data: {
        url: data.url,
        alt: (data.alt ?? "").trim(),
        displayOrder: data.displayOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{ url: string; alt: string; displayOrder: number; isActive: boolean }>,
  ) {
    const existing = await this.prisma.festaGalleryImage.findUnique({
      where: { id },
      select: { url: true },
    });
    if (!existing) {
      throw new NotFoundException("Imagem não encontrada");
    }

    try {
      const updated = await this.prisma.festaGalleryImage.update({
        where: { id },
        data,
      });

      if (typeof data.url === "string" && data.url !== existing.url) {
        const oldKey = this.festaS3.extractGalleryKeyFromPublicUrl(existing.url);
        const newKey = this.festaS3.extractGalleryKeyFromPublicUrl(data.url);
        if (oldKey && oldKey !== newKey) {
          await this.festaS3.tryDeletePublicObject(oldKey);
        }
      }

      return updated;
    } catch {
      throw new NotFoundException("Imagem não encontrada");
    }
  }

  async remove(id: number) {
    const row = await this.prisma.festaGalleryImage.findUnique({
      where: { id },
      select: { url: true },
    });
    try {
      const deleted = await this.prisma.festaGalleryImage.delete({
        where: { id },
      });
      if (row?.url) {
        const key = this.festaS3.extractGalleryKeyFromPublicUrl(row.url);
        if (key) {
          await this.festaS3.tryDeletePublicObject(key);
        }
      }
      return deleted;
    } catch {
      throw new NotFoundException("Imagem não encontrada");
    }
  }
}
