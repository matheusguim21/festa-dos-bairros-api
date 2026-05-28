import { describe, expect, it } from 'vitest'
import {
  buildStallResolverIndex,
  normalizeStallKey,
  resolveStallFromPdfLabel,
} from '../src/infra/pdf/stall-resolver'

const seedStalls = [
  { id: 1, name: 'Pedra (JAPA)' },
  { id: 2, name: "Pingo D'água (BEBIDAS)" },
  { id: 3, name: '5 Marias (CHURRASCO)' },
  { id: 4, name: 'Jardim Guaratiba (CALDOS)' },
]

describe('resolveStallFromPdfLabel', () => {
  const index = buildStallResolverIndex(seedStalls)

  it('maps PDF labels to seed stall names', () => {
    expect(resolveStallFromPdfLabel(index, 'PEDRA')?.name).toBe('Pedra (JAPA)')
    expect(resolveStallFromPdfLabel(index, "PINGO D'ÁGUA")?.name).toBe(
      "Pingo D'água (BEBIDAS)",
    )
    expect(resolveStallFromPdfLabel(index, '5 MARIAS')?.name).toBe(
      '5 Marias (CHURRASCO)',
    )
    expect(resolveStallFromPdfLabel(index, 'JARDIM GUARATIBA')?.name).toBe(
      'Jardim Guaratiba (CALDOS)',
    )
  })

  it('matches by normalized full name in database', () => {
    expect(resolveStallFromPdfLabel(index, 'Pedra (JAPA)')?.id).toBe(1)
  })

  it('resolves PDF label without parenthetical suffix', () => {
    expect(normalizeStallKey("PINGO D'ÁGUA")).toBe('pingo d agua')
    expect(resolveStallFromPdfLabel(index, "PINGO D'ÁGUA")?.id).toBe(2)
  })
})
