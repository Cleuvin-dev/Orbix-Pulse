import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CloseCashRegisterInput, OpenCashRegisterInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class CashRegistersService {
  constructor(private readonly prisma: PrismaService) {}

  async open(tenantId: string, userId: string, input: OpenCashRegisterInput) {
    const existing = await this.prisma.cashRegister.findUnique({ where: { operationId: input.operationId } });
    if (existing) return existing; // idempotência (docs/07-sync-engine.md, 7.2)

    const branch = await this.prisma.branch.findFirst({
      where: { id: input.branchId, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException("Filial não encontrada.");

    // Regra de negócio, não só de UI (docs/04-regras-negocio.md, 4.5): um
    // único caixa OPEN por usuário por vez.
    const alreadyOpen = await this.prisma.cashRegister.findFirst({
      where: { tenantId, openedBy: userId, status: "OPEN" },
    });
    if (alreadyOpen) {
      throw new ConflictException("Você já tem um caixa aberto — feche-o antes de abrir outro.");
    }

    try {
      return await this.prisma.cashRegister.create({
        data: {
          tenantId,
          branchId: input.branchId,
          openedBy: userId,
          openedAt: new Date(),
          openingAmount: input.openingAmount,
          operationId: input.operationId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return this.prisma.cashRegister.findUniqueOrThrow({ where: { operationId: input.operationId } });
      }
      throw error;
    }
  }

  current(tenantId: string, userId: string) {
    return this.prisma.cashRegister.findFirst({ where: { tenantId, openedBy: userId, status: "OPEN" } });
  }

  async close(tenantId: string, userId: string, id: string, input: CloseCashRegisterInput) {
    const cashRegister = await this.prisma.cashRegister.findFirst({ where: { id, tenantId } });
    if (!cashRegister) throw new NotFoundException("Caixa não encontrado.");

    // Idempotente por estado: CashRegister só tem um operation_id (o da
    // abertura) — fechar de novo com o mesmo id só devolve o resultado já
    // fechado, em vez de tentar fechar de novo um caixa imutável.
    if (cashRegister.status === "CLOSED") return cashRegister;

    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        tenantId,
        method: "CASH",
        status: "CONFIRMED",
        sale: { cashRegisterId: id, status: { not: "CANCELLED" } },
      },
      _sum: { amount: true },
    });
    const expectedAmount = cashRegister.openingAmount + (cashPayments._sum.amount ?? 0);
    const difference = input.closingAmount - expectedAmount;

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedBy: userId,
        closedAt: new Date(),
        closingAmount: input.closingAmount,
        expectedAmount,
        difference,
      },
    });
  }

  async findOpenOrThrow(tenantId: string, id: string) {
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { id, tenantId, status: "OPEN" },
    });
    if (!cashRegister) throw new NotFoundException("Caixa aberto não encontrado.");
    return cashRegister;
  }
}
