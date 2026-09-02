import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { DevicesService } from "./devices.service";

const TENANT_ID = "tenant-1";

describe("DevicesService", () => {
  let findMany: ReturnType<typeof vi.fn>;
  let service: DevicesService;

  beforeEach(() => {
    findMany = vi.fn();
    const prisma = { device: { findMany } } as unknown as PrismaService;
    service = new DevicesService(prisma);
  });

  it("lista devices ativos do tenant, ordenados por nome", async () => {
    findMany.mockResolvedValue([{ id: "device-1", name: "PC-CAIXA-01" }]);

    const result = await service.list(TENANT_ID);

    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, deletedAt: null, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([{ id: "device-1", name: "PC-CAIXA-01" }]);
  });
});
