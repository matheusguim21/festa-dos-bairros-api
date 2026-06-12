import { PrismaService } from "@/infra/database/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

export type PublicFestaConfig = {
  festivalDay1: string;
  festivalDay2: string;
};

export type AdminFestaConfig = PublicFestaConfig & {
  evolutionApiKey: string | null;
  evolutionApiKeyMasked: string | null;
  evolutionInstanceName: string | null;
  criticalStockAlertsEnabled: boolean;
};

export type FestaAlertPhoneRow = {
  id: number;
  phone: string;
  label: string | null;
  createdAt: Date;
};

const DEFAULT_CONFIG: PublicFestaConfig = {
  festivalDay1: "2026-06-12",
  festivalDay2: "2026-06-13",
};

function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

@Injectable()
export class FestaConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(): Promise<PublicFestaConfig> {
    const row = await this.prisma.festaConfig.findUnique({
      where: { id: 1 },
    });
    if (!row) return DEFAULT_CONFIG;
    return {
      festivalDay1: row.festivalDay1,
      festivalDay2: row.festivalDay2,
    };
  }

  async getAdmin(): Promise<AdminFestaConfig> {
    const row = await this.ensureConfig();
    return {
      festivalDay1: row.festivalDay1,
      festivalDay2: row.festivalDay2,
      evolutionApiKey: row.evolutionApiKey,
      evolutionApiKeyMasked: maskApiKey(row.evolutionApiKey),
      evolutionInstanceName: row.evolutionInstanceName,
      criticalStockAlertsEnabled: row.criticalStockAlertsEnabled,
    };
  }

  /** Retorna credenciais completas para envio interno (não expor em endpoints). */
  async getAlertCredentials() {
    const row = await this.ensureConfig();
    const phones = await this.prisma.festaAlertPhone.findMany({
      orderBy: { id: "asc" },
    });
    return {
      criticalStockAlertsEnabled: row.criticalStockAlertsEnabled,
      evolutionApiKey: row.evolutionApiKey,
      evolutionInstanceName: row.evolutionInstanceName,
      phones,
    };
  }

  async upsertConfig(data: {
    festivalDay1?: string;
    festivalDay2?: string;
    evolutionApiKey?: string | null;
    evolutionInstanceName?: string | null;
    criticalStockAlertsEnabled?: boolean;
  }) {
    const existing = await this.ensureConfig();

    const day1 = data.festivalDay1 ?? existing.festivalDay1;
    const day2 = data.festivalDay2 ?? existing.festivalDay2;
    if (day1 === day2) {
      throw new BadRequestException("Os dois dias da festa devem ser diferentes");
    }

    const updateData: Record<string, unknown> = {};
    if (data.festivalDay1 !== undefined) updateData.festivalDay1 = data.festivalDay1;
    if (data.festivalDay2 !== undefined) updateData.festivalDay2 = data.festivalDay2;
    if (data.evolutionInstanceName !== undefined) {
      updateData.evolutionInstanceName = data.evolutionInstanceName;
    }
    if (data.criticalStockAlertsEnabled !== undefined) {
      updateData.criticalStockAlertsEnabled = data.criticalStockAlertsEnabled;
    }
    if (data.evolutionApiKey !== undefined) {
      updateData.evolutionApiKey = data.evolutionApiKey;
    }

    await this.prisma.festaConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        festivalDay1: data.festivalDay1 ?? DEFAULT_CONFIG.festivalDay1,
        festivalDay2: data.festivalDay2 ?? DEFAULT_CONFIG.festivalDay2,
        evolutionApiKey: data.evolutionApiKey ?? null,
        evolutionInstanceName: data.evolutionInstanceName ?? null,
        criticalStockAlertsEnabled: data.criticalStockAlertsEnabled ?? true,
      },
      update: updateData,
    });

    return this.getAdmin();
  }

  async listPhones(): Promise<FestaAlertPhoneRow[]> {
    return this.prisma.festaAlertPhone.findMany({
      orderBy: { id: "asc" },
    });
  }

  async addPhone(phone: string, label?: string | null) {
    const normalized = normalizePhone(phone);
    return this.prisma.festaAlertPhone.create({
      data: { phone: normalized, label: label ?? null },
    });
  }

  async removePhone(id: number) {
    return this.prisma.festaAlertPhone.delete({ where: { id } });
  }

  async updatePhone(
    id: number,
    data: { phone?: string; label?: string | null },
  ) {
    const existing = await this.prisma.festaAlertPhone.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException("Telefone não encontrado");
    }

    const updateData: { phone?: string; label?: string | null } = {};
    if (data.phone !== undefined) {
      const normalized = normalizePhone(data.phone);
      if (normalized.length < 10) {
        throw new BadRequestException("Telefone inválido");
      }
      updateData.phone = normalized;
    }
    if (data.label !== undefined) {
      updateData.label = data.label;
    }

    return this.prisma.festaAlertPhone.update({
      where: { id },
      data: updateData,
    });
  }

  private async ensureConfig() {
    return this.prisma.festaConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        festivalDay1: DEFAULT_CONFIG.festivalDay1,
        festivalDay2: DEFAULT_CONFIG.festivalDay2,
        criticalStockAlertsEnabled: true,
      },
      update: {},
    });
  }
}
