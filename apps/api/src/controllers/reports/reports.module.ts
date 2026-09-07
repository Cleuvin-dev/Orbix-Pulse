import { Module } from "@nestjs/common";

import { ReportsService } from "../../application/reports/reports.service";
import { AuthModule } from "../auth/auth.module";
import { FinanceModule } from "../finance/finance.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { StockModule } from "../stock/stock.module";
import { ReportsController } from "./reports.controller";

@Module({
  imports: [AuthModule, PermissionsModule, FinanceModule, StockModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
