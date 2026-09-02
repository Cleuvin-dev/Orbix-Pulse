import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateBarcodeInput, CreateProductInput, UpdateProductInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface ListProductsFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, filters: ListProductsFilters) {
    const pageSize = Math.min(filters.pageSize, MAX_PAGE_SIZE);
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { sku: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { barcodes: { where: { deletedAt: null } } },
        orderBy: { name: "asc" },
        skip: (filters.page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize };
  }

  async findByIdOrThrow(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { barcodes: { where: { deletedAt: null } } },
    });
    if (!product) {
      throw new NotFoundException("Produto não encontrado.");
    }
    return product;
  }

  findByBarcode(tenantId: string, code: string) {
    return this.prisma.product.findFirst({
      where: { tenantId, deletedAt: null, barcodes: { some: { code, deletedAt: null } } },
      include: { barcodes: { where: { deletedAt: null } } },
    });
  }

  async create(tenantId: string, createdBy: string, input: CreateProductInput) {
    await this.assertReferencesBelongToTenant(tenantId, input);

    try {
      return await this.prisma.product.create({
        data: {
          tenantId,
          createdBy,
          sku: input.sku,
          name: input.name,
          categoryId: input.categoryId ?? null,
          unit: input.unit,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          minimumStock: input.minimumStock ?? null,
          maximumStock: input.maximumStock ?? null,
          supplierId: input.supplierId ?? null,
          isActive: input.isActive ?? true,
          // current_stock nunca vem do payload — cache derivado de
          // stock_movements (docs/03-modelo-dados.md, 3.3), fica no default 0
          // até a Fase 5 existir.
        },
      });
    } catch (error) {
      throw this.translateSkuConflict(error);
    }
  }

  async update(tenantId: string, id: string, input: UpdateProductInput) {
    await this.findByIdOrThrow(tenantId, id);
    await this.assertReferencesBelongToTenant(tenantId, input);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          sku: input.sku,
          name: input.name,
          categoryId: input.categoryId,
          unit: input.unit,
          costPrice: input.costPrice,
          salePrice: input.salePrice,
          minimumStock: input.minimumStock,
          maximumStock: input.maximumStock,
          supplierId: input.supplierId,
          isActive: input.isActive,
        },
      });
    } catch (error) {
      throw this.translateSkuConflict(error);
    }
  }

  async remove(tenantId: string, id: string) {
    await this.findByIdOrThrow(tenantId, id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addBarcode(tenantId: string, productId: string, input: CreateBarcodeInput) {
    await this.findByIdOrThrow(tenantId, productId);
    try {
      return await this.prisma.barcode.create({
        data: { tenantId, productId, code: input.code, type: input.type },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Já existe um código de barras igual cadastrado neste tenant.");
      }
      throw error;
    }
  }

  async removeBarcode(tenantId: string, productId: string, barcodeId: string) {
    const barcode = await this.prisma.barcode.findFirst({
      where: { id: barcodeId, productId, tenantId, deletedAt: null },
    });
    if (!barcode) {
      throw new NotFoundException("Código de barras não encontrado.");
    }
    await this.prisma.barcode.update({ where: { id: barcodeId }, data: { deletedAt: new Date() } });
  }

  private translateSkuConflict(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("Já existe um produto com este SKU neste tenant.");
    }
    return error;
  }

  // Nunca confia em categoryId/supplierId vindos do cliente sem checar que
  // pertencem ao mesmo tenant (CLAUDE.md regra 4) — evita um usuário de um
  // tenant referenciar dado de outro só adivinhando um UUID.
  private async assertReferencesBelongToTenant(
    tenantId: string,
    input: Pick<CreateProductInput, "categoryId" | "supplierId">,
  ) {
    if (input.categoryId) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: input.categoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundException("Categoria informada não encontrada.");
      }
    }
    if (input.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: input.supplierId, tenantId, deletedAt: null },
      });
      if (!supplier) {
        throw new NotFoundException("Fornecedor informado não encontrado.");
      }
    }
  }
}
