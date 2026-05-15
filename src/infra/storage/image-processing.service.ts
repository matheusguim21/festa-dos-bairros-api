import { BadRequestException, Injectable } from "@nestjs/common";
import sharp from "sharp";

export type ImageUploadPurpose = "gallery" | "sponsor";

export type ProcessedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

const WEBP_QUALITY = 80;

@Injectable()
export class ImageProcessingService {
  async processForPurpose(
    input: Buffer,
    purpose: ImageUploadPurpose,
  ): Promise<ProcessedImage> {
    const maxWidth = purpose === "sponsor" ? 800 : 1920;

    try {
      const buffer = await sharp(input, { animated: false })
        .rotate()
        .resize({
          width: maxWidth,
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      return {
        buffer,
        contentType: "image/webp",
        ext: "webp",
      };
    } catch {
      throw new BadRequestException(
        "Não foi possível processar a imagem. Verifique se o arquivo é uma imagem válida.",
      );
    }
  }
}
