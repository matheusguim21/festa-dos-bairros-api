import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import { SponsorService } from "@/services/sponsor.service";
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

const createSponsorSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().url(),
  websiteUrl: z.string().max(2048).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateSponsorSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().max(2048).nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

@Controller("admin/sponsors")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminSponsorsController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Get()
  findAll() {
    return this.sponsorService.findAllAdmin();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createSponsorSchema))
    body: z.infer<typeof createSponsorSchema>,
  ) {
    return this.sponsorService.create(body);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateSponsorSchema))
    body: z.infer<typeof updateSponsorSchema>,
  ) {
    return this.sponsorService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.sponsorService.remove(id);
  }
}
