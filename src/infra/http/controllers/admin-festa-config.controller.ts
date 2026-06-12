import { JWTAuthGuard } from "@/infra/auth/jwt.auth-guard";
import { AdminGuard } from "@/infra/auth/admin.guard";
import {
  FestaConfigService,
  normalizePhone,
} from "@/services/festa-config.service";
import { CriticalStockAlertService } from "@/services/critical-stock-alert.service";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../pipes/zod-validation-pipe";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const updateFestaConfigSchema = z
  .object({
    festivalDay1: z.string().regex(dateRegex).optional(),
    festivalDay2: z.string().regex(dateRegex).optional(),
    evolutionApiKey: z.string().min(1).nullable().optional(),
    evolutionInstanceName: z.string().min(1).nullable().optional(),
    criticalStockAlertsEnabled: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.festivalDay1 && data.festivalDay2) {
        return data.festivalDay1 !== data.festivalDay2;
      }
      return true;
    },
    { message: "Os dois dias da festa devem ser diferentes" },
  );

const addPhoneSchema = z.object({
  phone: z.string().min(1),
  label: z.string().optional().nullable(),
});

const updatePhoneSchema = z.object({
  phone: z.string().min(1).optional(),
  label: z.string().optional().nullable(),
});

const testWhatsappSchema = z.object({
  phone: z.string().min(1),
  text: z.string().min(1).default("Teste de alerta — Festa dos Bairros"),
});

@Controller("admin/festa-config")
@UseGuards(JWTAuthGuard, AdminGuard)
export class AdminFestaConfigController {
  private readonly logger = new Logger(AdminFestaConfigController.name);

  constructor(
    private readonly festaConfigService: FestaConfigService,
    private readonly criticalStockAlertService: CriticalStockAlertService,
  ) {}

  @Get()
  getAdmin() {
    return this.festaConfigService.getAdmin();
  }

  @Put()
  @UsePipes(new ZodValidationPipe(updateFestaConfigSchema))
  updateConfig(@Body() body: z.infer<typeof updateFestaConfigSchema>) {
    this.logger.log(
      `PUT festa-config dias=${body.festivalDay1 ?? "-"} / ${body.festivalDay2 ?? "-"} instância=${body.evolutionInstanceName ?? "-"} alertas=${body.criticalStockAlertsEnabled ?? "-"}`,
    );
    if (body.festivalDay1 && body.festivalDay2 && body.festivalDay1 === body.festivalDay2) {
      throw new BadRequestException("Os dois dias da festa devem ser diferentes");
    }
    return this.festaConfigService.upsertConfig(body);
  }

  @Get("phones")
  listPhones() {
    return this.festaConfigService.listPhones();
  }

  @Post("phones")
  @UsePipes(new ZodValidationPipe(addPhoneSchema))
  addPhone(@Body() body: z.infer<typeof addPhoneSchema>) {
    const normalized = normalizePhone(body.phone);
    this.logger.log(`POST phone raw="${body.phone}" normalizado="${normalized}"`);
    if (normalized.length < 10) {
      throw new BadRequestException(
        "Telefone inválido: informe o número com DDI e DDD (ex.: 5521999999999)",
      );
    }
    return this.festaConfigService.addPhone(normalized, body.label);
  }

  @Delete("phones/:id")
  removePhone(@Param("id", ParseIntPipe) id: number) {
    return this.festaConfigService.removePhone(id);
  }

  @Put("phones/:id")
  @UsePipes(new ZodValidationPipe(updatePhoneSchema))
  updatePhone(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: z.infer<typeof updatePhoneSchema>,
  ) {
    if (body.phone === undefined && body.label === undefined) {
      throw new BadRequestException("Informe o número ou o rótulo para alterar");
    }
    if (body.phone !== undefined) {
      const normalized = normalizePhone(body.phone);
      if (normalized.length < 10) {
        throw new BadRequestException("Telefone inválido");
      }
      return this.festaConfigService.updatePhone(id, {
        phone: normalized,
        label: body.label,
      });
    }
    return this.festaConfigService.updatePhone(id, { label: body.label });
  }

  @Post("test-whatsapp")
  @UsePipes(new ZodValidationPipe(testWhatsappSchema))
  async testWhatsapp(@Body() body: z.infer<typeof testWhatsappSchema>) {
    this.logger.log(
      `POST test-whatsapp rawPhone="${body.phone}" texto="${body.text?.slice(0, 40) ?? ""}"`,
    );

    const normalized = normalizePhone(body.phone);
    this.logger.log(`POST test-whatsapp normalizado="${normalized}"`);

    if (normalized.length < 10) {
      this.logger.warn(
        `POST test-whatsapp rejeitado: "${body.phone}" → "${normalized}" (menos de 10 dígitos)`,
      );
      throw new BadRequestException(
        `Telefone inválido: "${body.phone}" não contém um número válido. Use formato internacional, ex.: 5521999999999`,
      );
    }

    await this.criticalStockAlertService.sendTestMessage(
      normalized,
      body.text ?? "Teste de alerta — Festa dos Bairros",
    );
    return { ok: true };
  }
}
