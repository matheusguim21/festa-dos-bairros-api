import { Role } from "@/generated/prisma/client";

/** Chaves estáveis — manter alinhado a `manager-route-definitions` no front */
export const MANAGER_SCREEN_SEEDS: Array<{
  key: string;
  pathSegment: string;
  label: string;
  sortOrder: number;
}> = [
  { key: "stall_order", pathSegment: "", label: "Venda", sortOrder: 10 },
  { key: "pedidos_home", pathSegment: "", label: "Vendas (início)", sortOrder: 12 },
  { key: "pedidos", pathSegment: "pedidos", label: "Pedidos", sortOrder: 20 },
  { key: "estoque", pathSegment: "estoque", label: "Estoque", sortOrder: 30 },
  { key: "preparar", pathSegment: "preparar", label: "Preparar pedidos", sortOrder: 35 },
  { key: "lancamentos", pathSegment: "lancamentos", label: "Lançamentos", sortOrder: 40 },
  { key: "relatorios", pathSegment: "relatorios", label: "Relatórios", sortOrder: 50 },
  { key: "caixa", pathSegment: "caixa", label: "Caixa", sortOrder: 60 },
  { key: "site_festa", pathSegment: "site-festa", label: "Site da festa", sortOrder: 70 },
  { key: "barracas", pathSegment: "barracas", label: "Barracas", sortOrder: 75 },
  { key: "usuarios", pathSegment: "usuarios", label: "Usuários", sortOrder: 80 },
];

export function legacyAppRoleSlug(role: Role): string {
  return `legacy-${role.toLowerCase().replace(/_/g, "-")}`;
}

export const LEGACY_ROLE_SCREEN_KEYS: Record<Role, string[]> = {
  STALL_SELLER: ["stall_order", "pedidos"],
  STALL_SUPPORT: ["estoque", "pedidos"],
  STALL_ADMIN: ["stall_order", "estoque", "pedidos"],
  ORDER_PREPARER: ["preparar"],
  ADMIN: [
    "lancamentos",
    "pedidos_home",
    "estoque",
    "relatorios",
    "caixa",
    "site_festa",
    "barracas",
    "usuarios",
  ],
  FESTA_ADMIN: ["site_festa", "barracas"],
  CASHIER: ["caixa"],
};
