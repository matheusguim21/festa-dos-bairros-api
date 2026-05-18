import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { AttractionsService } from "@/services/attractions.service";
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

const createAttractionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateAttractionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

@Controller("admin/attractions")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminAttractionsController {
  constructor(private readonly attractionsService: AttractionsService) {}

  @Get()
  findAll() {
    return this.attractionsService.findAllAdmin();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAttractionSchema))
    body: z.infer<typeof createAttractionSchema>,
  ) {
    return this.attractionsService.create(body);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateAttractionSchema))
    body: z.infer<typeof updateAttractionSchema>,
  ) {
    return this.attractionsService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.attractionsService.remove(id);
  }
}
