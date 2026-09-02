import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { FinancePeriodQuery } from "@orbix/validation";
import { financePeriodQuerySchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { FinanceReportsService } from "../../application/finance/finance-reports.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

@Controller("finance")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class FinanceReportsController {
  constructor(private readonly reports: FinanceReportsService) {}

  @Get("cash-flow")
  @RequirePermission("finance.view")
  cashFlow(
    @CurrentUser() user: CurrentUserType,
    @Query(new ZodValidationPipe(financePeriodQuerySchema)) query: FinancePeriodQuery,
  ) {
    return this.reports.cashFlow(user.tenantId, query);
  }

  // docs/10-testes.md (10.3): "Given: usuário com role CASHIER, When: GET
  // /finance/dre, Then: 403" — finance.view_profit, não finance.view (que
  // CASHIER tem, limitado). DRE mostra lucro, então é a permissão certa aqui.
  @Get("dre")
  @RequirePermission("finance.view_profit")
  dre(
    @CurrentUser() user: CurrentUserType,
    @Query(new ZodValidationPipe(financePeriodQuerySchema)) query: FinancePeriodQuery,
  ) {
    return this.reports.dre(user.tenantId, query);
  }
}
