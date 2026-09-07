import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  // `includeInactive` existe só pra tela de Configurações (gestão de
  // dispositivos) — o uso original deste endpoint (Vendas/Estoque escolherem
  // um device automaticamente) continua vendo só ACTIVE por padrão.
  list(tenantId: string, includeInactive = false) {
    return this.prisma.device.findMany({
      where: { tenantId, deletedAt: null, ...(includeInactive ? {} : { status: "ACTIVE" }) },
      orderBy: { name: "asc" },
    });
  }
}
