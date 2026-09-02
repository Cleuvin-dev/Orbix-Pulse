import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateProductCategoryInput, UpdateProductCategoryInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findByIdOrThrow(tenantId: string, id: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException("Categoria não encontrada.");
    }
    return category;
  }

  async create(tenantId: string, input: CreateProductCategoryInput) {
    if (input.parentId) {
      await this.findByIdOrThrow(tenantId, input.parentId);
    }
    return this.prisma.productCategory.create({
      data: { tenantId, name: input.name, parentId: input.parentId ?? null },
    });
  }

  async update(tenantId: string, id: string, input: UpdateProductCategoryInput) {
    await this.findByIdOrThrow(tenantId, id);

    if (input.parentId) {
      if (input.parentId === id) {
        throw new BadRequestException("Uma categoria não pode ser pai dela mesma.");
      }
      await this.findByIdOrThrow(tenantId, input.parentId);
      await this.assertNoCycle(tenantId, id, input.parentId);
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: { name: input.name, parentId: input.parentId },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findByIdOrThrow(tenantId, id);
    await this.prisma.productCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Impede um ciclo na hierarquia (ex: A -> B -> A) subindo a cadeia de pais a
  // partir do novo pai proposto até achar a própria categoria ou a raiz.
  private async assertNoCycle(tenantId: string, categoryId: string, newParentId: string) {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        throw new BadRequestException("Isso criaria um ciclo na hierarquia de categorias.");
      }
      if (visited.has(currentId)) break; // segurança contra dado já inconsistente
      visited.add(currentId);

      const parent: { parentId: string | null } | null = await this.prisma.productCategory.findFirst({
        where: { id: currentId, tenantId },
        select: { parentId: true },
      });
      currentId = parent?.parentId ?? null;
    }
  }
}
