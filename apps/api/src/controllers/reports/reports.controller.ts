import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { FinancePeriodQuery } from "@orbix/validation";
import { financePeriodQuerySchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { ReportsService } from "../../application/reports/reports.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("reports")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("dashboard")
  @RequirePermission("reports.executive.view")
  dashboard(
    @CurrentUser() user: CurrentUserType,
    @Query(new ZodValidationPipe(financePeriodQuerySchema)) query: FinancePeriodQuery,
  ) {
    return this.reports.dashboard(user.tenantId, query);
  }
}
