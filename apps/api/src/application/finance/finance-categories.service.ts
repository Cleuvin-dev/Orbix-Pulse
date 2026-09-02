import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateFinanceCategoryInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class FinanceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.financeCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findByIdOrThrow(tenantId: string, id: string) {
    const category = await this.prisma.financeCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!category) throw new NotFoundException("Categoria financeira não encontrada.");
    return category;
  }

  create(tenantId: string, input: CreateFinanceCategoryInput) {
    return this.prisma.financeCategory.create({
      data: { tenantId, name: input.name, kind: input.kind },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findByIdOrThrow(tenantId, id);
    await this.prisma.financeCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
