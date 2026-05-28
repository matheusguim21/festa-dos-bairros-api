import { PDFParse } from 'pdf-parse'

export type CardapioFb2026ParsedSection = {
  stallLabel: string
  stallNumber?: number
  items: Array<{ name: string; price: number }>
}

export type CardapioFb2026ParseResult = {
  sections: CardapioFb2026ParsedSection[]
  warnings: Array<{ line: number; raw: string; reason: string }>
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

export function parseBrazilianMoneyToNumber(raw: string) {
  const cleaned = raw
    .replace(/\./g, '')
    .replace(/R\$\s*/gi, '')
    .trim()
    .replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function looksLikePageMarker(line: string) {
  return /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)
}

function tryParseHeader(
  line: string,
): { stallLabel: string; stallNumber?: number } | null {
  // Examples:
  // "PEDRA 1"
  // "CATRUZ 2"
  // "BRINCADEIRAS"
  const m = /^([A-Z0-9'ÁÀÂÃÉÊÍÓÔÕÚÜÇ \-]+?)\s+(\d+)$/.exec(line)
  if (m) {
    return { stallLabel: normalizeWhitespace(m[1]), stallNumber: Number(m[2]) }
  }
  if (line === 'BRINCADEIRAS') {
    return { stallLabel: line }
  }
  return null
}

function tryParseItemLine(
  line: string,
): { name: string; price: number } | null {
  // Examples:
  // "Yakisoba Frango R$ 15,00"
  // "Batata P Simples 12,00"
  const m = /^(.*?)\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})$/.exec(line)
  if (!m) return null

  const name = normalizeWhitespace(m[1])
  if (!name) return null

  const price = parseBrazilianMoneyToNumber(m[2])
  if (price == null) return null

  return { name, price }
}

export function parseCardapioFb2026Text(
  text: string,
): CardapioFb2026ParseResult {
  const warnings: CardapioFb2026ParseResult['warnings'] = []
  const sections: CardapioFb2026ParsedSection[] = []

  const lines = text
    .split(/\r?\n/g)
    .map((l) => normalizeWhitespace(l))
    .filter((l) => l.length > 0)

  let current: CardapioFb2026ParsedSection | null = null

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const lineNo = i + 1

    if (looksLikePageMarker(raw)) continue
    if (raw === 'CARDAPIO FB 2026') continue

    const header = tryParseHeader(raw)
    if (header) {
      if (current) sections.push(current)
      current = {
        stallLabel: header.stallLabel,
        stallNumber: header.stallNumber,
        items: [],
      }
      continue
    }

    const item = tryParseItemLine(raw)
    if (item) {
      if (!current) {
        warnings.push({
          line: lineNo,
          raw,
          reason: 'Item antes de qualquer cabeçalho de barraca',
        })
        continue
      }
      current.items.push(item)
      continue
    }

    warnings.push({ line: lineNo, raw, reason: 'Linha não reconhecida' })
  }

  if (current) sections.push(current)

  return { sections, warnings }
}

export async function parseCardapioFb2026PdfBuffer(
  buffer: Buffer,
): Promise<CardapioFb2026ParseResult> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return parseCardapioFb2026Text(result.text ?? '')
  } finally {
    await parser.destroy()
  }
}
