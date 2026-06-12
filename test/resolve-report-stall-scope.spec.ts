import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Role } from "../src/generated/prisma/client";
import { resolveReportStallScope } from "../src/infra/auth/resolve-report-stall-scope";
import type { PublicUser } from "../src/services/user.service";

function makeUser(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 1,
    name: "Test User",
    username: "test",
    role: Role.STALL_ADMIN,
    stall: { id: 10, name: "Barraca Teste" },
    appRoleId: null,
    appRole: null,
    allowedScreens: [{ key: "relatorios", pathSegment: "relatorios", label: "Relatórios", sortOrder: 50 }],
    ...overrides,
  };
}

describe("resolveReportStallScope", () => {
  it("allows admin to query any stall or all stalls", () => {
    const admin = makeUser({ role: Role.ADMIN, stall: null });
    expect(resolveReportStallScope(admin)).toBeUndefined();
    expect(resolveReportStallScope(admin, 5)).toBe(5);
  });

  it("allows appRole admin to query any stall", () => {
    const user = makeUser({
      role: Role.STALL_ADMIN,
      appRole: { id: 1, name: "Admin", slug: "admin", isAdmin: true },
    });
    expect(resolveReportStallScope(user, 3)).toBe(3);
  });

  it("forces stall admin to their own stall", () => {
    const user = makeUser();
    expect(resolveReportStallScope(user)).toBe(10);
    expect(resolveReportStallScope(user, 10)).toBe(10);
  });

  it("rejects stall admin requesting another stall", () => {
    const user = makeUser();
    expect(() => resolveReportStallScope(user, 99)).toThrow(ForbiddenException);
  });

  it("rejects user without relatorios screen", () => {
    const user = makeUser({
      allowedScreens: [{ key: "pedidos", pathSegment: "pedidos", label: "Pedidos", sortOrder: 20 }],
    });
    expect(() => resolveReportStallScope(user)).toThrow(ForbiddenException);
  });

  it("rejects user with relatorios but no stall", () => {
    const user = makeUser({ stall: null });
    expect(() => resolveReportStallScope(user)).toThrow(ForbiddenException);
  });
});
