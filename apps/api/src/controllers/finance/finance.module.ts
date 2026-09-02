import { Module } from "@nestjs/common";

import { FinanceCategoriesService } from "../../application/finance/finance-categories.service";
import { FinanceEntriesService } from "../../application/finance/finance-entries.service";
import { FinanceReportsService } from "../../application/finance/finance-reports.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { FinanceCategoriesController } from "./finance-categories.controller";
import { FinanceEntriesController } from "./finance-entries.controller";
import { FinanceReportsController } from "./finance-reports.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [FinanceCategoriesController, FinanceEntriesController, FinanceReportsController],
  providers: [FinanceCategoriesService, FinanceEntriesService, FinanceReportsService],
})
export class FinanceModule {}
