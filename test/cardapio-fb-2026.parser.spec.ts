import { describe, expect, it } from "vitest";
import { parseCardapioFb2026Text } from "../src/infra/pdf/cardapio-fb-2026.parser";

describe("parseCardapioFb2026Text", () => {
  it("parses sections and items with Brazilian money", () => {
    const text = `
CARDAPIO FB 2026
PEDRA \t1
Yakisoba Frango \tR$ 15,00
Yakisoba Carne \tR$ 18,00
CATRUZ \t2
Bolo de Milho \tR$ 7,00
RETIRO \t3
Batata P Simples \t12,00
-- 1 of 2 --
`;

    const result = parseCardapioFb2026Text(text);
    expect(result.warnings.length).toBe(0);
    expect(result.sections.map((s) => s.stallLabel)).toEqual([
      "PEDRA",
      "CATRUZ",
      "RETIRO",
    ]);
    expect(result.sections[0].items).toEqual([
      { name: "Yakisoba Frango", price: 15 },
      { name: "Yakisoba Carne", price: 18 },
    ]);
    expect(result.sections[2].items).toEqual([
      { name: "Batata P Simples", price: 12 },
    ]);
  });
});
