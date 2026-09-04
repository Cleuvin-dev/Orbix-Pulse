import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateFinanceEntryInput, UpdateFinanceEntryInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface ListFinanceEntriesFilters {
  type?: string;
  status?: string;
  categoryId?: string;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;

type EntryWithStatus = { status: Prisma.FinanceEntryGetPayload<object>["status"]; dueDate: Date };

// `OVERDUE` existe no enum desde a Fase 1, mas nenhuma transição de estado
// jamais o gravava — e docs/04-regras-negocio.md (4.6) não descreve quem o
// escreveria. "Vencido" não é um estado de negócio próprio: é `PENDING` que
// passou do vencimento, uma função do relógio, não de uma ação do usuário.
// Por isso é derivado na leitura em vez de persistido: gravar exigiria um job
// agendado (infra que não existe) e um GET nunca deve ter efeito colateral de
// escrita. O banco continua guardando `PENDING` — que é o estado acionável —
// e os guards de escrita (update/markPaid/cancel) checam PAID/CANCELLED
// explicitamente, então um lançamento derivado como OVERDUE continua sendo
// tratado como pendente por eles, que é o comportamento correto.
// Lacuna sinalizada em docs/12-roadmap-fases.md (Fase 7).
function withDerivedStatus<T extends EntryWithStatus>(entry: T, now: Date): T {
  if (entry.status === "PENDING" && entry.dueDate < now) {
    return { ...entry, status: "OVERDUE" };
  }
  return entry;
}

// Contas a pagar/receber (docs/04-regras-negocio.md, 4.6) — lançamentos
// independentes de venda. Sem idempotência forçada por operation_id: campo
// opcional no schema (Fase 1), fase online-only como Produtos (Fase 4).
@Injectable()
export class FinanceEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, filters: ListFinanceEntriesFilters) {
    const pageSize = Math.min(filters.pageSize, MAX_PAGE_SIZE);
    const where: Prisma.FinanceEntryWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.type ? { type: filters.type as Prisma.EnumFinanceEntryTypeFilter["equals"] } : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumFinanceEntryStatusFilter["equals"] } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.financeEntry.findMany({
        where,
        include: { category: true },
        orderBy: { dueDate: "asc" },
        skip: (filters.page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.financeEntry.count({ where }),
    ]);

    const now = new Date();
    return {
      items: items.map((entry) => withDerivedStatus(entry, now)),
      total,
      page: filters.page,
      pageSize,
    };
  }

  async findByIdOrThrow(tenantId: string, id: string) {
    const entry = await this.prisma.financeEntry.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { category: true },
    });
    if (!entry) throw new NotFoundException("Lançamento financeiro não encontrado.");
    return withDerivedStatus(entry, new Date());
  }

  async create(tenantId: string, userId: string, input: CreateFinanceEntryInput) {
    await this.assertCategoryBelongsToTenant(tenantId, input.categoryId);

    return this.prisma.financeEntry.create({
      data: {
        tenantId,
        type: input.type,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        dueDate: input.dueDate,
        referenceId: input.referenceId ?? null,
        createdBy: userId,
      },
    });
  }

  async update(tenantId: string, id: string, input: UpdateFinanceEntryInput) {
    const entry = await this.findByIdOrThrow(tenantId, id);
    if (entry.status === "PAID" || entry.status === "CANCELLED") {
      throw new ConflictException(`Lançamento ${entry.status === "PAID" ? "já pago" : "cancelado"} não pode ser editado.`);
    }
    if (input.categoryId) {
      await this.assertCategoryBelongsToTenant(tenantId, input.categoryId);
    }

    return this.prisma.financeEntry.update({
      where: { id },
      data: {
        type: input.type,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        dueDate: input.dueDate,
        referenceId: input.referenceId,
      },
    });
  }

  async markPaid(tenantId: string, id: string, paidAt?: Date) {
    const entry = await this.findByIdOrThrow(tenantId, id);
    if (entry.status === "PAID") return entry; // idempotente
    if (entry.status === "CANCELLED") {
      throw new ConflictException("Lançamento cancelado não pode ser marcado como pago.");
    }

    return this.prisma.financeEntry.update({
      where: { id },
      data: { status: "PAID", paidAt: paidAt ?? new Date() },
    });
  }

  async cancel(tenantId: string, id: string) {
    const entry = await this.findByIdOrThrow(tenantId, id);
    if (entry.status === "CANCELLED") return entry; // idempotente
    if (entry.status === "PAID") {
      throw new ConflictException("Lançamento já pago não pode ser cancelado — estorne manualmente.");
    }

    return this.prisma.financeEntry.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  async remove(tenantId: string, id: string) {
    await this.findByIdOrThrow(tenantId, id);
    await this.prisma.financeEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async assertCategoryBelongsToTenant(tenantId: string, categoryId: string) {
    const category = await this.prisma.financeCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
    });
    if (!category) throw new NotFoundException("Categoria financeira informada não encontrada.");
  }
}
