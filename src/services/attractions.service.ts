import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { FestaS3Service } from "@/infra/storage/festa-s3.service";
import { Injectable, NotFoundException } from "@nestjs/common";

export type PublicAttraction = {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
};

export type CreateAttraction = {
  name: string;
  description: string;
  imageUrl: string;
  displayOrder?: number;
  isActive?: boolean;
};

@Injectable()
export class AttractionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly festaS3: FestaS3Service,
  ) {}

  async findAllPublic(): Promise<PublicAttraction[]> {
    const rows = await this.prismaService.attraction.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
      },
    });
    return rows;
  }

  findAllAdmin() {
    return this.prismaService.attraction.findMany({
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
  }

  async findOnePublic(id: number): Promise<PublicAttraction> {
    const row = await this.prismaService.attraction.findUnique({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        displayOrder: true,
      }
    });
    if (!row) {
      throw new NotFoundException("Atração não encontrada");
    }
    return row;
  }

  async create(data: CreateAttraction) {
    return this.prismaService.attraction.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      imageUrl: string;
      displayOrder: number;
      isActive: boolean;
    }>,
  ) {
    const existing = await this.prismaService.attraction.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    if (!existing) {
      throw new NotFoundException("Atração não encontrada");
    }

    try {
      const updated = await this.prismaService.attraction.update({
        where: { id },
        data,
      });

      if (
        typeof data.imageUrl === "string" &&
        data.imageUrl !== existing.imageUrl
      ) {
        const oldKey = this.festaS3.extractAttractionImageKeyFromPublicUrl(
          existing.imageUrl,
        );
        const newKey = this.festaS3.extractAttractionImageKeyFromPublicUrl(
          data.imageUrl,
        );
        if (oldKey && oldKey !== newKey) {
          await this.festaS3.tryDeletePublicObject(oldKey);
        }
      }

      return updated;
    } catch {
      throw new NotFoundException("Atração não encontrada");
    }
  }

  async remove(id: number) {
    const row = await this.prismaService.attraction.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    try {
      const deleted = await this.prismaService.attraction.delete({
        where: { id },
      });
      if (row?.imageUrl) {
        const key = this.festaS3.extractAttractionImageKeyFromPublicUrl(
          row.imageUrl,
        );
        if (key) {
          await this.festaS3.tryDeletePublicObject(key);
        }
      }
      return deleted;
    } catch {
      throw new NotFoundException("Atração não encontrada");
    }
  }
}
