import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId, deletedAt: null, status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
  }
}
