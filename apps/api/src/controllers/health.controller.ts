import { Controller, Get } from "@nestjs/common";

import { PrismaService } from "../infrastructure/database/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      return { status: "ok", database: "down" };
    }
  }
}
