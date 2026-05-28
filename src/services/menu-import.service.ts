import { PrismaService } from "@/infra/database/prisma/prisma.service";
import {
  parseCardapioFb2026PdfBuffer,
  type CardapioFb2026ParseResult,
} from "@/infra/pdf/cardapio-fb-2026.parser";
import {
  buildStallResolverIndex,
  normalizeStallKey,
  resolveStallFromPdfLabel,
} from "@/infra/pdf/stall-resolver";
import { Injectable } from "@nestjs/common";

type ImportOptions = {
  defaultQuantity: number;
  includeBrincadeiras: boolean;
};

type ImportSummary = {
  stallsTotal: number;
  stallsMatched: number;
  stallsCreated: number;
  stallsSkipped: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  warnings: CardapioFb2026ParseResult["warnings"];
  skippedSections: Array<{ stallLabel: string; reason: string }>;
};

function normalizeProductKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

@Injectable()
export class MenuImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCardapioFb2026Pdf(
    buffer: Buffer,
    opts?: Partial<ImportOptions>,
  ): Promise<ImportSummary> {
    const options: ImportOptions = {
      defaultQuantity: 50,
      includeBrincadeiras: false,
      ...opts,
    };

    const parsed = await parseCardapioFb2026PdfBuffer(buffer);

    const existingStalls = await this.prisma.stall.findMany({
      select: { id: true, name: true },
    });
    const stallIndex = buildStallResolverIndex(existingStalls);

    const summary: ImportSummary = {
      stallsTotal: parsed.sections.length,
      stallsMatched: 0,
      stallsCreated: 0,
      stallsSkipped: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsSkipped: 0,
      warnings: parsed.warnings,
      skippedSections: [],
    };

    for (const section of parsed.sections) {
      const rawLabel = section.stallLabel;
      const normalizedLabel = normalizeStallKey(rawLabel);

      if (!options.includeBrincadeiras && normalizedLabel === "brincadeiras") {
        summary.stallsSkipped++;
        summary.skippedSections.push({
          stallLabel: rawLabel,
          reason: "Seção ignorada (includeBrincadeiras=false)",
        });
        continue;
      }

      let stall = resolveStallFromPdfLabel(stallIndex, rawLabel);
      if (stall) {
        summary.stallsMatched++;
      } else {
        const created = await this.prisma.stall.create({
          data: { name: rawLabel },
          select: { id: true, name: true },
        });
        stall = created;
        stallIndex.byKey.set(normalizeStallKey(created.name), created);
        stallIndex.all.push(created);
        summary.stallsCreated++;
      }

      const existingProducts = await this.prisma.product.findMany({
        where: { stallId: stall.id },
        select: { id: true, name: true },
      });
      const productByKey = new Map(
        existingProducts.map((p) => [normalizeProductKey(p.name), p]),
      );

      for (const item of section.items) {
        const key = normalizeProductKey(item.name);
        const existing = productByKey.get(key);
        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              price: item.price,
            },
          });
          summary.productsUpdated++;
          continue;
        }

        await this.prisma.product.create({
          data: {
            name: item.name,
            price: item.price,
            quantity: options.defaultQuantity,
            stallId: stall.id,
          },
        });
        summary.productsCreated++;
      }
    }

    return summary;
  }
}

