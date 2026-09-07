import { Module } from "@nestjs/common";

import { AuthModule } from "./controllers/auth/auth.module";
import { BranchesModule } from "./controllers/branches/branches.module";
import { FinanceModule } from "./controllers/finance/finance.module";
import { HealthController } from "./controllers/health.controller";
import { PermissionsModule } from "./controllers/permissions/permissions.module";
import { ProductsModule } from "./controllers/products/products.module";
import { ReportsModule } from "./controllers/reports/reports.module";
import { SalesModule } from "./controllers/sales/sales.module";
import { StockModule } from "./controllers/stock/stock.module";
import { SyncModule } from "./controllers/sync/sync.module";
import { TenantsModule } from "./controllers/tenants/tenants.module";
import { UsersModule } from "./controllers/users/users.module";
import { SupabaseAuthModule } from "./infrastructure/auth/supabase-auth.module";
import { PrismaModule } from "./infrastructure/database/prisma.module";

@Module({
  imports: [
    PrismaModule,
    SupabaseAuthModule,
    AuthModule,
    PermissionsModule,
    ProductsModule,
    BranchesModule,
    StockModule,
    SalesModule,
    FinanceModule,
    ReportsModule,
    SyncModule,
    TenantsModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
