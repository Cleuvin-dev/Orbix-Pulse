import { Module } from "@nestjs/common";

import { HealthController } from "./controllers/health.controller";
import { PrismaModule } from "./infrastructure/database/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
