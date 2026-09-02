import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { CreateFinanceCategoryInput } from "@orbix/validation";
import { createFinanceCategorySchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { FinanceCategoriesService } from "../../application/finance/finance-categories.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("finance-categories")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class FinanceCategoriesController {
  constructor(private readonly categories: FinanceCategoriesService) {}

  @Get()
  @RequirePermission("finance.view")
  list(@CurrentUser() user: CurrentUserType) {
    return this.categories.list(user.tenantId);
  }

  @Post()
  @RequirePermission("finance.manage")
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createFinanceCategorySchema)) body: CreateFinanceCategoryInput,
  ) {
    return this.categories.create(user.tenantId, body);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  remove(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.categories.remove(user.tenantId, id);
  }
}
