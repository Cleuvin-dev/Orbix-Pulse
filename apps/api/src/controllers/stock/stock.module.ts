import { Module } from "@nestjs/common";

import { StockMovementsService } from "../../application/stock/stock-movements.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { StockMovementsController } from "./stock-movements.controller";

@Module({
  imports: [AuthModule, PermissionsModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockModule {}
