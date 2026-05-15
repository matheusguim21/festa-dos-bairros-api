import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { FestaGalleryService } from "@/services/festa-gallery.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const createGallerySchema = z.object({
  url: z.string().url(),
  alt: z.string().min(1),
  displayOrder: z.number().int().optional(),
});

const updateGallerySchema = z.object({
  url: z.string().url().optional(),
  alt: z.string().min(1).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

@Controller("admin/festa-gallery")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminFestaGalleryController {
  constructor(private readonly galleryService: FestaGalleryService) {}

  @Get()
  findAll() {
    return this.galleryService.findAllAdmin();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createGallerySchema))
    body: z.infer<typeof createGallerySchema>,
  ) {
    return this.galleryService.create(body);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateGallerySchema))
    body: z.infer<typeof updateGallerySchema>,
  ) {
    return this.galleryService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.galleryService.remove(id);
  }
}
