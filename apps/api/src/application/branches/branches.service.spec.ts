import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { BranchesService } from "./branches.service";

const TENANT_ID = "tenant-1";

describe("BranchesService", () => {
  let findMany: ReturnType<typeof vi.fn>;
  let service: BranchesService;

  beforeEach(() => {
    findMany = vi.fn();
    const prisma = { branch: { findMany } } as unknown as PrismaService;
    service = new BranchesService(prisma);
  });

  it("lista filiais ativas do tenant, ordenadas por nome", async () => {
    findMany.mockResolvedValue([{ id: "branch-1", name: "Loja Matriz" }]);

    const result = await service.list(TENANT_ID);

    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([{ id: "branch-1", name: "Loja Matriz" }]);
  });
});
