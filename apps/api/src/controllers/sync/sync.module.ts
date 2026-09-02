import { Module } from "@nestjs/common";

import { SyncService } from "../../application/sync/sync.service";
import { AuthModule } from "../auth/auth.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { SalesModule } from "../sales/sales.module";
import { StockModule } from "../stock/stock.module";
import { SyncController } from "./sync.controller";

@Module({
  imports: [AuthModule, PermissionsModule, SalesModule, StockModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
