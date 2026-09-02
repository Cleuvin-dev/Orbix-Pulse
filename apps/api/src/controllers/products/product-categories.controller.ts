import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { CreateProductCategoryInput, UpdateProductCategoryInput } from "@orbix/validation";
import { createProductCategorySchema, updateProductCategorySchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { ProductCategoriesService } from "../../application/products/product-categories.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

// Sem permissão dedicada de categoria em docs/05-permissoes-rbac.md (5.4) —
// reaproveita products.view/products.update/products.delete, já que categoria
// é um sub-recurso do catálogo de produtos. Lacuna sinalizada em docs/12-roadmap-fases.md.
@Controller("product-categories")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class ProductCategoriesController {
  constructor(private readonly categories: ProductCategoriesService) {}

  @Get()
  @RequirePermission("products.view")
  list(@CurrentUser() user: CurrentUserType) {
    return this.categories.list(user.tenantId);
  }

  @Get(":id")
  @RequirePermission("products.view")
  findOne(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.categories.findByIdOrThrow(user.tenantId, id);
  }

  @Post()
  @RequirePermission("products.update")
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createProductCategorySchema)) body: CreateProductCategoryInput,
  ) {
    return this.categories.create(user.tenantId, body);
  }

  @Patch(":id")
  @RequirePermission("products.update")
  update(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProductCategorySchema)) body: UpdateProductCategoryInput,
  ) {
    return this.categories.update(user.tenantId, id, body);
  }

  @Delete(":id")
  @RequirePermission("products.delete")
  remove(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.categories.remove(user.tenantId, id);
  }
}
