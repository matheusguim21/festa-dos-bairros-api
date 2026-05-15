import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";

export type PublicGalleryImage = {
  id: number;
  url: string;
  alt: string;
  displayOrder: number;
};

@Injectable()
export class FestaGalleryService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(data: { url: string; alt: string; displayOrder?: number }) {
    return this.prisma.festaGalleryImage.create({
      data: {
        url: data.url,
        alt: data.alt,
        displayOrder: data.displayOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{ url: string; alt: string; displayOrder: number; isActive: boolean }>,
  ) {
    try {
      return await this.prisma.festaGalleryImage.update({
        where: { id },
        data,
      });
    } catch {
      throw new NotFoundException("Imagem não encontrada");
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.festaGalleryImage.delete({ where: { id } });
    } catch {
      throw new NotFoundException("Imagem não encontrada");
    }
  }
}
