import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { TenantsService } from "./tenants.service";

const TENANT_ID = "tenant-1";

describe("TenantsService", () => {
  it("updateSettings: mescla com o settings existente, só sobrescrevendo as chaves enviadas", async () => {
    const findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: TENANT_ID,
      settings: { allowNegativeStock: false, someFutureKey: "preservado" },
    });
    const update = vi.fn().mockResolvedValue({});
    const prisma = { tenant: { findUniqueOrThrow, update } } as unknown as PrismaService;
    const service = new TenantsService(prisma);

    await service.updateSettings(TENANT_ID, { saleCancelWindowHours: 24 });

    expect(update).toHaveBeenCalledWith({
      where: { id: TENANT_ID },
      data: { settings: { allowNegativeStock: false, someFutureKey: "preservado", saleCancelWindowHours: 24 } },
    });
  });

  it("updateSettings: settings nulo (tenant novo) não quebra, trata como objeto vazio", async () => {
    const findUniqueOrThrow = vi.fn().mockResolvedValue({ id: TENANT_ID, settings: null });
    const update = vi.fn().mockResolvedValue({});
    const prisma = { tenant: { findUniqueOrThrow, update } } as unknown as PrismaService;
    const service = new TenantsService(prisma);

    await service.updateSettings(TENANT_ID, { allowNegativeStock: true });

    expect(update).toHaveBeenCalledWith({
      where: { id: TENANT_ID },
      data: { settings: { allowNegativeStock: true } },
    });
  });
});
