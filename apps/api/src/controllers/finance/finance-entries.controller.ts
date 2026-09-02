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
import type { CreateFinanceEntryInput, MarkFinanceEntryPaidInput, UpdateFinanceEntryInput } from "@orbix/validation";
import { createFinanceEntrySchema, markFinanceEntryPaidSchema, updateFinanceEntrySchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { FinanceEntriesService } from "../../application/finance/finance-entries.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("finance/entries")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class FinanceEntriesController {
  constructor(private readonly entries: FinanceEntriesService) {}

  @Get()
  @RequirePermission("finance.view")
  list(
    @CurrentUser() user: CurrentUserType,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("categoryId") categoryId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.entries.list(user.tenantId, {
      type,
      status,
      categoryId,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.max(1, Number(pageSize) || 20),
    });
  }

  @Get(":id")
  @RequirePermission("finance.view")
  findOne(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.entries.findByIdOrThrow(user.tenantId, id);
  }

  @Post()
  @RequirePermission("finance.manage")
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createFinanceEntrySchema)) body: CreateFinanceEntryInput,
  ) {
    return this.entries.create(user.tenantId, user.id, body);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  update(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFinanceEntrySchema)) body: UpdateFinanceEntryInput,
  ) {
    return this.entries.update(user.tenantId, id, body);
  }

  @Post(":id/pay")
  @RequirePermission("finance.manage")
  markPaid(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(markFinanceEntryPaidSchema)) body: MarkFinanceEntryPaidInput,
  ) {
    return this.entries.markPaid(user.tenantId, id, body.paidAt);
  }

  @Post(":id/cancel")
  @RequirePermission("finance.manage")
  cancel(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.entries.cancel(user.tenantId, id);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  remove(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.entries.remove(user.tenantId, id);
  }
}
