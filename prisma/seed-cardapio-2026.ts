import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { readFile } from 'node:fs/promises'
import {
  type CardapioFb2026ParsedSection,
  parseCardapioFb2026PdfBuffer,
} from '../src/infra/pdf/cardapio-fb-2026.parser'
import {
  buildStallResolverIndex,
  normalizeStallKey,
  resolveStallFromPdfLabel,
} from '../src/infra/pdf/stall-resolver'

const MANUAL_CARDAPIO_SECTIONS: CardapioFb2026ParsedSection[] = [
  {
    stallLabel: 'SEPETIBA',
    items: [
      { name: '2 reais', price: 2 },
      { name: '5 reais', price: 5 },
      { name: '10 reais', price: 10 },
      { name: '20 reais', price: 20 },
      { name: '30 reais', price: 30 },
      { name: '40 reais', price: 40 },
      { name: '50 reais', price: 50 },
      { name: '100 reais', price: 100 },
    ],
  },
  {
    stallLabel: 'TIROLESA',
    items: [
      { name: 'Tirolesa', price: 15 },
      { name: 'Escalada', price: 10 },
      { name: 'Combo', price: 25 },
    ],
  },
]

function normalizeProductKey(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })

  try {
    const pdfPath =
      process.env.CARDAPIO_PDF_PATH ?? 'prisma/utils-files/CARDAPIO FB 2026.pdf'
    const defaultQuantity = process.env.CARDAPIO_DEFAULT_QUANTITY
      ? Number(process.env.CARDAPIO_DEFAULT_QUANTITY)
      : 100
    const includeBrincadeiras =
      String(process.env.CARDAPIO_INCLUDE_BRINCADEIRAS ?? '').toLowerCase() ===
      'true'

    const buffer = await readFile(pdfPath)
    const parsed = await parseCardapioFb2026PdfBuffer(buffer)

    const stalls = await prisma.stall.findMany({
      select: { id: true, name: true },
    })
    const stallIndex = buildStallResolverIndex(stalls)

    let createdProducts = 0
    let updatedProducts = 0
    let createdStalls = 0
    let matchedStalls = 0
    let skippedSections = 0

    const allSections = [...parsed.sections, ...MANUAL_CARDAPIO_SECTIONS]

    for (const section of allSections) {
      const normalizedLabel = normalizeStallKey(section.stallLabel)
      if (!includeBrincadeiras && normalizedLabel === 'brincadeiras') {
        skippedSections++
        continue
      }

      let stall = resolveStallFromPdfLabel(stallIndex, section.stallLabel)
      if (stall) {
        matchedStalls++
      } else {
        stall = await prisma.stall.create({
          data: { name: section.stallLabel },
          select: { id: true, name: true },
        })
        stallIndex.byKey.set(normalizeStallKey(stall.name), stall)
        stallIndex.all.push(stall)
        createdStalls++
      }

      const existingProducts = await prisma.product.findMany({
        where: { stallId: stall.id },
        select: { id: true, name: true },
      })
      const productByKey = new Map(
        existingProducts.map((p) => [normalizeProductKey(p.name), p]),
      )

      for (const item of section.items) {
        const existing = productByKey.get(normalizeProductKey(item.name))
        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: { name: item.name, price: item.price },
          })
          updatedProducts++
        } else {
          await prisma.product.create({
            data: {
              name: item.name,
              price: item.price,
              quantity: Number.isFinite(defaultQuantity)
                ? defaultQuantity
                : 100,
              stallId: stall.id,
            },
          })
          createdProducts++
        }
      }
    }

    console.log('🌱 Seed cardápio 2026 concluído')
    console.log({
      matchedStalls,
      createdStalls,
      skippedSections,
      createdProducts,
      updatedProducts,
      warnings: parsed.warnings.length,
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Erro ao rodar seed-cardapio-2026:', e)
  process.exit(1)
})
