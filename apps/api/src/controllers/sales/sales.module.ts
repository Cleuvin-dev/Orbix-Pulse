import { Module } from "@nestjs/common";

import { CashRegistersService } from "../../application/sales/cash-registers.service";
import { SalesService } from "../../application/sales/sales.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { StockModule } from "../stock/stock.module";
import { CashRegistersController } from "./cash-registers.controller";
import { SalesController } from "./sales.controller";

@Module({
  imports: [AuthModule, PermissionsModule, StockModule],
  controllers: [SalesController, CashRegistersController],
  providers: [SalesService, CashRegistersService],
  exports: [SalesService, CashRegistersService],
})
export class SalesModule {}
