import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { CashRegistersService } from "./cash-registers.service";

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const BRANCH_ID = "branch-1";

describe("CashRegistersService", () => {
  let cashRegisterFindUnique: ReturnType<typeof vi.fn>;
  let cashRegisterFindFirst: ReturnType<typeof vi.fn>;
  let cashRegisterCreate: ReturnType<typeof vi.fn>;
  let cashRegisterUpdate: ReturnType<typeof vi.fn>;
  let cashRegisterFindUniqueOrThrow: ReturnType<typeof vi.fn>;
  let branchFindFirst: ReturnType<typeof vi.fn>;
  let paymentAggregate: ReturnType<typeof vi.fn>;
  let service: CashRegistersService;

  beforeEach(() => {
    cashRegisterFindUnique = vi.fn().mockResolvedValue(null);
    cashRegisterFindFirst = vi.fn().mockResolvedValue(null);
    cashRegisterCreate = vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cash-1", ...data }));
    cashRegisterUpdate = vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "cash-1", ...data }));
    cashRegisterFindUniqueOrThrow = vi.fn();
    branchFindFirst = vi.fn().mockResolvedValue({ id: BRANCH_ID, tenantId: TENANT_ID });
    paymentAggregate = vi.fn().mockResolvedValue({ _sum: { amount: null } });

    const prisma = {
      cashRegister: {
        findUnique: cashRegisterFindUnique,
        findFirst: cashRegisterFindFirst,
        create: cashRegisterCreate,
        update: cashRegisterUpdate,
        findUniqueOrThrow: cashRegisterFindUniqueOrThrow,
      },
      branch: { findFirst: branchFindFirst },
      payment: { aggregate: paymentAggregate },
    } as unknown as PrismaService;

    service = new CashRegistersService(prisma);
  });

  const openInput = { operationId: "11111111-1111-1111-1111-111111111111", branchId: BRANCH_ID, openingAmount: 10000 };

  it("idempotência: retorna o caixa já aberto com o mesmo operationId", async () => {
    cashRegisterFindUnique.mockResolvedValue({ id: "cash-ja-existe" });

    const result = await service.open(TENANT_ID, USER_ID, openInput);

    expect(result).toEqual({ id: "cash-ja-existe" });
    expect(cashRegisterCreate).not.toHaveBeenCalled();
  });

  it("rejeita filial que não pertence ao tenant", async () => {
    branchFindFirst.mockResolvedValue(null);

    await expect(service.open(TENANT_ID, USER_ID, openInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejeita abrir um segundo caixa se o usuário já tem um OPEN", async () => {
    cashRegisterFindFirst.mockResolvedValue({ id: "cash-ja-aberto", status: "OPEN" });

    await expect(service.open(TENANT_ID, USER_ID, openInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("abre o caixa com os dados corretos", async () => {
    const result = await service.open(TENANT_ID, USER_ID, openInput);

    expect(cashRegisterCreate).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        openedBy: USER_ID,
        openedAt: expect.any(Date),
        openingAmount: 10000,
        operationId: openInput.operationId,
      },
    });
    expect(result).toMatchObject({ openingAmount: 10000 });
  });

  it("corrida de idempotência ao abrir: P2002 cai para buscar o já criado", async () => {
    cashRegisterCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" }),
    );
    cashRegisterFindUniqueOrThrow.mockResolvedValue({ id: "cash-que-venceu-a-corrida" });

    const result = await service.open(TENANT_ID, USER_ID, openInput);

    expect(result).toEqual({ id: "cash-que-venceu-a-corrida" });
  });

  it("rejeita fechar caixa inexistente", async () => {
    cashRegisterFindFirst.mockResolvedValue(null);

    await expect(service.close(TENANT_ID, USER_ID, "cash-1", { closingAmount: 10000 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("fechar um caixa já CLOSED é idempotente por estado (não recalcula)", async () => {
    cashRegisterFindFirst.mockResolvedValue({ id: "cash-1", status: "CLOSED", closingAmount: 9500 });

    const result = await service.close(TENANT_ID, USER_ID, "cash-1", { closingAmount: 10000 });

    expect(result).toEqual({ id: "cash-1", status: "CLOSED", closingAmount: 9500 });
    expect(cashRegisterUpdate).not.toHaveBeenCalled();
  });

  it("calcula expectedAmount e difference corretamente ao fechar", async () => {
    cashRegisterFindFirst.mockResolvedValue({ id: "cash-1", status: "OPEN", openingAmount: 10000 });
    paymentAggregate.mockResolvedValue({ _sum: { amount: 5000 } }); // vendas em dinheiro na sessão

    await service.close(TENANT_ID, USER_ID, "cash-1", { closingAmount: 14500 });

    expect(cashRegisterUpdate).toHaveBeenCalledWith({
      where: { id: "cash-1" },
      data: {
        status: "CLOSED",
        closedBy: USER_ID,
        closedAt: expect.any(Date),
        closingAmount: 14500,
        expectedAmount: 15000, // 10000 abertura + 5000 vendas em dinheiro
        difference: -500, // 14500 contado - 15000 esperado
      },
    });
  });

  it("expectedAmount ignora vendas CANCELLED (filtro no aggregate)", async () => {
    cashRegisterFindFirst.mockResolvedValue({ id: "cash-1", status: "OPEN", openingAmount: 10000 });

    await service.close(TENANT_ID, USER_ID, "cash-1", { closingAmount: 10000 });

    expect(paymentAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sale: expect.objectContaining({ cashRegisterId: "cash-1", status: { not: "CANCELLED" } }),
        }),
      }),
    );
  });
});
