import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { CancelSaleInput, CreateSaleInput } from "@orbix/validation";
import { cancelSaleSchema, createSaleSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { SalesService } from "../../application/sales/sales.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("sales")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @RequirePermission("sales.create") // sem sales.view dedicado em docs/05-permissoes-rbac.md (5.4)
  list(
    @CurrentUser() user: CurrentUserType,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("cashRegisterId") cashRegisterId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.sales.list(user.tenantId, {
      branchId,
      status,
      cashRegisterId,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.max(1, Number(pageSize) || 20),
    });
  }

  @Get(":id")
  @RequirePermission("sales.create")
  findOne(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.sales.findByIdOrThrow(user.tenantId, id);
  }

  @Post()
  @RequirePermission("sales.create")
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createSaleSchema)) body: CreateSaleInput,
  ) {
    return this.sales.create(user.tenantId, user.id, body);
  }

  @Post(":id/cancel")
  @RequirePermission("sales.cancel")
  cancel(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(cancelSaleSchema)) body: CancelSaleInput,
  ) {
    return this.sales.cancel(user, id, body.reason);
  }
}
