import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSupplierInput, UpdateSupplierInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

// Fornecedores (docs/03-modelo-dados.md, 3.3) — cadastro existe desde a Fase
// 1, mas sem CRUD implementado em fase nenhuma até agora. "Pedidos de
// compra" continua fora de escopo (sem entidade de banco definida, lacuna
// estrutural sinalizada desde a Fase 0, não resolvida aqui).
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findByIdOrThrow(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado.");
    return supplier;
  }

  create(tenantId: string, userId: string, input: CreateSupplierInput) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: input.name,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        isActive: input.isActive ?? true,
        createdBy: userId,
      },
    });
  }

  async update(tenantId: string, id: string, input: UpdateSupplierInput) {
    await this.findByIdOrThrow(tenantId, id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: input.name,
        document: input.document,
        email: input.email,
        phone: input.phone,
        address: input.address,
        isActive: input.isActive,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findByIdOrThrow(tenantId, id);
    await this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
