import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { CreateBarcodeInput, CreateProductInput, UpdateProductInput } from "@orbix/validation";
import { createBarcodeSchema, createProductSchema, updateProductSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { ProductsService } from "../../application/products/products.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("products")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermission("products.view")
  list(
    @CurrentUser() user: CurrentUserType,
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("isActive") isActive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.products.list(user.tenantId, {
      search,
      categoryId,
      isActive: isActive === undefined ? undefined : isActive === "true",
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.max(1, Number(pageSize) || 20),
    });
  }

  @Get("barcode/:code")
  @RequirePermission("products.view")
  findByBarcode(@CurrentUser() user: CurrentUserType, @Param("code") code: string) {
    return this.products.findByBarcode(user.tenantId, code);
  }

  @Get(":id")
  @RequirePermission("products.view")
  findOne(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.products.findByIdOrThrow(user.tenantId, id);
  }

  @Post()
  // Sem permissão products.create dedicada em docs/05-permissoes-rbac.md (5.4)
  // — reaproveita products.update (mesmos roles: OWNER/ADMIN/MANAGER). Lacuna
  // sinalizada em docs/12-roadmap-fases.md.
  @RequirePermission("products.update")
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductInput,
  ) {
    return this.products.create(user.tenantId, user.id, body);
  }

  @Patch(":id")
  @RequirePermission("products.update")
  update(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
  ) {
    return this.products.update(user.tenantId, id, body);
  }

  @Delete(":id")
  @RequirePermission("products.delete")
  remove(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.products.remove(user.tenantId, id);
  }

  @Post(":id/barcodes")
  @RequirePermission("products.update")
  addBarcode(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createBarcodeSchema)) body: CreateBarcodeInput,
  ) {
    return this.products.addBarcode(user.tenantId, id, body);
  }

  @Delete(":id/barcodes/:barcodeId")
  @RequirePermission("products.update")
  removeBarcode(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Param("barcodeId") barcodeId: string,
  ) {
    return this.products.removeBarcode(user.tenantId, id, barcodeId);
  }
}
