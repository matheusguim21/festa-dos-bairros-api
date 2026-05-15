import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { FestaS3Service } from "@/infra/storage/festa-s3.service";
import { Injectable, NotFoundException } from "@nestjs/common";

export type PublicSponsor = {
  id: number;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  displayOrder: number;
};

@Injectable()
export class SponsorService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly festaS3: FestaS3Service,
  ) {}

  async findAllPublic(): Promise<PublicSponsor[]> {
    const rows = await this.prismaService.sponsor.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        logoUrl: true,
        websiteUrl: true,
        displayOrder: true,
      },
    });
    return rows;
  }

  findAllAdmin() {
    return this.prismaService.sponsor.findMany({
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
  }

  async create(data: {
    name: string;
    logoUrl: string;
    websiteUrl?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const websiteUrl =
      data.websiteUrl === undefined || data.websiteUrl === ""
        ? null
        : data.websiteUrl;
    return this.prismaService.sponsor.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        websiteUrl,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      logoUrl: string;
      websiteUrl: string | null;
      displayOrder: number;
      isActive: boolean;
    }>,
  ) {
    const existing = await this.prismaService.sponsor.findUnique({
      where: { id },
      select: { logoUrl: true },
    });
    if (!existing) {
      throw new NotFoundException("Patrocinador não encontrado");
    }

    const payload = { ...data };
    if (payload.websiteUrl === "") {
      payload.websiteUrl = null;
    }
    try {
      const updated = await this.prismaService.sponsor.update({
        where: { id },
        data: payload,
      });

      if (
        typeof data.logoUrl === "string" &&
        data.logoUrl !== existing.logoUrl
      ) {
        const oldKey = this.festaS3.extractSponsorLogoKeyFromPublicUrl(
          existing.logoUrl,
        );
        const newKey = this.festaS3.extractSponsorLogoKeyFromPublicUrl(
          data.logoUrl,
        );
        if (oldKey && oldKey !== newKey) {
          await this.festaS3.tryDeletePublicObject(oldKey);
        }
      }

      return updated;
    } catch {
      throw new NotFoundException("Patrocinador não encontrado");
    }
  }

  async remove(id: number) {
    const row = await this.prismaService.sponsor.findUnique({
      where: { id },
      select: { logoUrl: true },
    });
    try {
      const deleted = await this.prismaService.sponsor.delete({
        where: { id },
      });
      if (row?.logoUrl) {
        const key = this.festaS3.extractSponsorLogoKeyFromPublicUrl(
          row.logoUrl,
        );
        if (key) {
          await this.festaS3.tryDeletePublicObject(key);
        }
      }
      return deleted;
    } catch {
      throw new NotFoundException("Patrocinador não encontrado");
    }
  }
}
