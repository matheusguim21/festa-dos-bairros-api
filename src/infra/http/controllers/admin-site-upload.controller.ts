import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { FestaS3Service } from "@/infra/storage/festa-s3.service";
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@webundsoehne/nest-fastify-file-upload";
import { randomUUID } from "node:crypto";

type MemoryUploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

@Controller("admin/site")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminSiteUploadController {
  constructor(private readonly festaS3: FestaS3Service) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: MemoryUploadedFile,
    @Body() body: { purpose?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Arquivo obrigatório no campo file");
    }
    const purpose = body?.purpose ?? "gallery";
    if (purpose !== "gallery" && purpose !== "sponsor" && purpose !== "video") {
      throw new BadRequestException(
        "purpose deve ser gallery, sponsor ou video",
      );
    }
    if (purpose === "video" && !VIDEO_MIME.has(file.mimetype)) {
      throw new BadRequestException("Vídeo deve ser MP4 ou WebM");
    }
    if (
      (purpose === "gallery" || purpose === "sponsor") &&
      !IMAGE_MIME.has(file.mimetype)
    ) {
      throw new BadRequestException("Imagem deve ser JPEG, PNG, WebP ou GIF");
    }

    const ext =
      file.originalname.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "bin";
    const folder =
      purpose === "video"
        ? "festa-site/video"
        : purpose === "sponsor"
          ? "festa-site/sponsors"
          : "festa-site/gallery";
    const key = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    await this.festaS3.uploadPublicObject(key, file.buffer, file.mimetype);
    const url = this.festaS3.getPublicUrl(key);
    return { url, key };
  }
}
