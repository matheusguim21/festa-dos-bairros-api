import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { MenuImportService } from "@/services/menu-import.service";
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

type MemoryUploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Controller("admin/menu")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminMenuImportController {
  constructor(private readonly menuImport: MenuImportService) {}

  @Post("import-pdf")
  @UseInterceptors(FileInterceptor("file"))
  async importPdf(
    @UploadedFile() file: MemoryUploadedFile,
    @Body()
    body: { includeBrincadeiras?: string; defaultQuantity?: string },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Arquivo obrigatório no campo file");
    }
    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Arquivo deve ser um PDF");
    }

    const includeBrincadeiras =
      String(body?.includeBrincadeiras ?? "").toLowerCase() === "true";

    const parsedQty = body?.defaultQuantity
      ? Number(body.defaultQuantity)
      : undefined;
    const defaultQuantity =
      parsedQty != null && Number.isFinite(parsedQty) && parsedQty >= 0
        ? parsedQty
        : 50;

    return this.menuImport.importCardapioFb2026Pdf(file.buffer, {
      includeBrincadeiras,
      defaultQuantity,
    });
  }
}

