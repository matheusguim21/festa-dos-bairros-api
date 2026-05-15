import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

export type PublicSiteConfig = {
  videoFileUrl: string | null;
  videoEmbedUrl: string | null;
};

@Injectable()
export class FestaSiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(): Promise<PublicSiteConfig> {
    const row = await this.prisma.festaSiteConfig.findUnique({
      where: { id: 1 },
    });
    if (!row) {
      return { videoFileUrl: null, videoEmbedUrl: null };
    }
    return {
      videoFileUrl: row.videoFileUrl,
      videoEmbedUrl: row.videoEmbedUrl,
    };
  }

  async upsertConfig(data: {
    videoFileUrl?: string | null;
    videoEmbedUrl?: string | null;
  }) {
    return this.prisma.festaSiteConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        videoFileUrl: data.videoFileUrl ?? null,
        videoEmbedUrl: data.videoEmbedUrl ?? null,
      },
      update: {
        ...(data.videoFileUrl !== undefined && {
          videoFileUrl: data.videoFileUrl,
        }),
        ...(data.videoEmbedUrl !== undefined && {
          videoEmbedUrl: data.videoEmbedUrl,
        }),
      },
    });
  }
}
