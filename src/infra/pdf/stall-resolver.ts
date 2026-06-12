/**
 * Nomes canônicos das barracas — devem coincidir com `prisma/seed.ts` (stallsWithProducts).
 */
export const SEED_STALL_NAMES = [
  "Retiro (BATATA FRITA)",
  "5 Marias (CHURRASCO)",
  "Pedra (JAPA)",
  "Brisa (HAMBURGUER)",
  "Catruz (DOCES)",
  "Jardim Luana (PASTEL)",
  "Jardim Guaratiba (CALDOS)",
  "Pingo D'água (BEBIDAS)",
  "Cabuís (AÇAÍ)",
  "Sepetiba (FICHAS)",
  "TIROLESA",
] as const;

export type SeedStallName = (typeof SEED_STALL_NAMES)[number];

/** Rótulo do PDF (normalizado) → nome exato no seed/banco */
export const PDF_STALL_LABEL_TO_SEED_NAME: Record<string, SeedStallName> = {
  pedra: "Pedra (JAPA)",
  catruz: "Catruz (DOCES)",
  retiro: "Retiro (BATATA FRITA)",
  "jardim guaratiba": "Jardim Guaratiba (CALDOS)",
  "jardim luana": "Jardim Luana (PASTEL)",
  "5 marias": "5 Marias (CHURRASCO)",
  cabuis: "Cabuís (AÇAÍ)",
  cabuís: "Cabuís (AÇAÍ)",
  brisa: "Brisa (HAMBURGUER)",
  "pingo d agua": "Pingo D'água (BEBIDAS)",
  "pingo dagua": "Pingo D'água (BEBIDAS)",
  sepetiba: "Sepetiba (FICHAS)",
  tirolesa: "TIROLESA",
};

export function normalizeStallKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Parte antes do sufixo entre parênteses: "Pedra (JAPA)" → "pedra" */
export function stallShortNameKey(fullName: string): string {
  const short = fullName.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  return normalizeStallKey(short || fullName);
}

export type StallRef = { id: number; name: string };

export type StallResolverIndex = {
  byKey: Map<string, StallRef>;
  all: StallRef[];
};

export function buildStallResolverIndex(stalls: StallRef[]): StallResolverIndex {
  const byKey = new Map<string, StallRef>();

  for (const stall of stalls) {
    byKey.set(normalizeStallKey(stall.name), stall);
    byKey.set(stallShortNameKey(stall.name), stall);
  }

  for (const seedName of SEED_STALL_NAMES) {
    const key = normalizeStallKey(seedName);
    const existing = byKey.get(key);
    if (!existing) continue;
    byKey.set(stallShortNameKey(seedName), existing);
    for (const [pdfLabel, mapped] of Object.entries(PDF_STALL_LABEL_TO_SEED_NAME)) {
      if (mapped === seedName) {
        byKey.set(pdfLabel, existing);
      }
    }
  }

  return { byKey, all: stalls };
}

/**
 * Resolve barraca do PDF para registro existente no banco (evita duplicar por nome diferente).
 */
export function resolveStallFromPdfLabel(
  index: StallResolverIndex,
  pdfLabel: string,
): StallRef | null {
  const n = normalizeStallKey(pdfLabel);
  if (!n) return null;

  const mappedSeedName = PDF_STALL_LABEL_TO_SEED_NAME[n];
  if (mappedSeedName) {
    const hit = index.byKey.get(normalizeStallKey(mappedSeedName));
    if (hit) return hit;
  }

  const direct = index.byKey.get(n);
  if (direct) return direct;

  const short = stallShortNameKey(pdfLabel);
  if (short !== n) {
    const byShort = index.byKey.get(short);
    if (byShort) return byShort;
  }

  for (const stall of index.all) {
    const stallKey = normalizeStallKey(stall.name);
    if (stallKey === n || stallKey.startsWith(`${n} `) || n.startsWith(`${stallShortNameKey(stall.name)} `)) {
      return stall;
    }
    const stallShort = stallShortNameKey(stall.name);
    if (stallShort === n || n.startsWith(stallShort) || stallShort.startsWith(n)) {
      return stall;
    }
  }

  return null;
}
