import { Module } from "@nestjs/common";

import { AuthModule } from "./controllers/auth/auth.module";
import { HealthController } from "./controllers/health.controller";
import { SupabaseAuthModule } from "./infrastructure/auth/supabase-auth.module";
import { PrismaModule } from "./infrastructure/database/prisma.module";

@Module({
  imports: [PrismaModule, SupabaseAuthModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
