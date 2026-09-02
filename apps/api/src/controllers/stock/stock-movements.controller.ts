import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { CreateStockMovementInput, ReconcileStockInput } from "@orbix/validation";
import { createStockMovementSchema, reconcileStockSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { StockMovementsService } from "../../application/stock/stock-movements.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("stock")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class StockMovementsController {
  constructor(private readonly stock: StockMovementsService) {}

  @Get("movements")
  @RequirePermission("products.view") // sem stock.view dedicado em docs/05-permissoes-rbac.md (5.4)
  list(
    @CurrentUser() user: CurrentUserType,
    @Query("productId") productId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.stock.list(user.tenantId, {
      productId,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.max(1, Number(pageSize) || 20),
    });
  }

  @Post("movements")
  @RequirePermission("stock.movement.create")
  createMovement(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createStockMovementSchema)) body: CreateStockMovementInput,
  ) {
    return this.stock.createMovement(user.tenantId, user.id, body);
  }

  @Post("reconciliation")
  @RequirePermission("stock.adjust")
  reconcile(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(reconcileStockSchema)) body: ReconcileStockInput,
  ) {
    return this.stock.reconcile(user.tenantId, user.id, body);
  }

  @Get("alerts")
  @RequirePermission("products.view")
  alerts(@CurrentUser() user: CurrentUserType) {
    return this.stock.alerts(user.tenantId);
  }
}
