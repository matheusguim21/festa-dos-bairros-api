import { Prisma } from "@/generated/prisma/client";

export function normalizeSearchString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const PG_ACCENT_FROM =
  "áàãâäéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ";
const PG_ACCENT_TO =
  "aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOOUUUUCN";

export function accentInsensitiveNameSql(
  column: string,
  normalizedSearch: string,
) {
  const pattern = `%${normalizedSearch}%`;
  return Prisma.sql`translate(lower(${Prisma.raw(column)}), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}`;
}
