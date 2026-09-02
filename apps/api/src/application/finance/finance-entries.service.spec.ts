import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { FinanceEntriesService } from "./finance-entries.service";

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const CATEGORY_ID = "cat-1";

describe("FinanceEntriesService", () => {
  let entryFindFirst: ReturnType<typeof vi.fn>;
  let entryCreate: ReturnType<typeof vi.fn>;
  let entryUpdate: ReturnType<typeof vi.fn>;
  let categoryFindFirst: ReturnType<typeof vi.fn>;
  let service: FinanceEntriesService;

  beforeEach(() => {
    entryFindFirst = vi.fn().mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "PENDING" });
    entryCreate = vi.fn();
    entryUpdate = vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "entry-1", ...data }));
    categoryFindFirst = vi.fn().mockResolvedValue({ id: CATEGORY_ID, tenantId: TENANT_ID, kind: "EXPENSE" });

    const prisma = {
      financeEntry: { findFirst: entryFindFirst, create: entryCreate, update: entryUpdate, findMany: vi.fn(), count: vi.fn() },
      financeCategory: { findFirst: categoryFindFirst },
    } as unknown as PrismaService;

    service = new FinanceEntriesService(prisma);
  });

  const baseInput = {
    type: "PAYABLE" as const,
    categoryId: CATEGORY_ID,
    description: "Aluguel",
    amount: 250000,
    dueDate: new Date("2026-10-01"),
  };

  it("rejeita categoria que não pertence ao tenant", async () => {
    categoryFindFirst.mockResolvedValue(null);

    await expect(service.create(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cria o lançamento com createdBy", async () => {
    await service.create(TENANT_ID, USER_ID, baseInput);

    expect(entryCreate).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT_ID,
        type: "PAYABLE",
        categoryId: CATEGORY_ID,
        description: "Aluguel",
        amount: 250000,
        dueDate: baseInput.dueDate,
        referenceId: null,
        createdBy: USER_ID,
      },
    });
  });

  it("rejeita editar lançamento já pago", async () => {
    entryFindFirst.mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "PAID" });

    await expect(service.update(TENANT_ID, "entry-1", { description: "x" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rejeita editar lançamento cancelado", async () => {
    entryFindFirst.mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "CANCELLED" });

    await expect(service.update(TENANT_ID, "entry-1", { description: "x" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("markPaid é idempotente: lançamento já pago retorna sem reprocessar", async () => {
    entryFindFirst.mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "PAID" });

    const result = await service.markPaid(TENANT_ID, "entry-1");

    expect(result).toMatchObject({ status: "PAID" });
    expect(entryUpdate).not.toHaveBeenCalled();
  });

  it("markPaid rejeita lançamento cancelado", async () => {
    entryFindFirst.mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "CANCELLED" });

    await expect(service.markPaid(TENANT_ID, "entry-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("markPaid usa a data informada ou agora como default", async () => {
    const paidAt = new Date("2026-09-10");

    await service.markPaid(TENANT_ID, "entry-1", paidAt);

    expect(entryUpdate).toHaveBeenCalledWith({ where: { id: "entry-1" }, data: { status: "PAID", paidAt } });
  });

  it("cancel é idempotente: lançamento já cancelado retorna sem reprocessar", async () => {
    entryFindFirst.mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "CANCELLED" });

    const result = await service.cancel(TENANT_ID, "entry-1");

    expect(result).toMatchObject({ status: "CANCELLED" });
    expect(entryUpdate).not.toHaveBeenCalled();
  });

  it("cancel rejeita lançamento já pago", async () => {
    entryFindFirst.mockResolvedValue({ id: "entry-1", tenantId: TENANT_ID, status: "PAID" });

    await expect(service.cancel(TENANT_ID, "entry-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("remove faz soft delete (deletedAt), nunca físico", async () => {
    await service.remove(TENANT_ID, "entry-1");

    expect(entryUpdate).toHaveBeenCalledWith({ where: { id: "entry-1" }, data: { deletedAt: expect.any(Date) } });
  });
});
