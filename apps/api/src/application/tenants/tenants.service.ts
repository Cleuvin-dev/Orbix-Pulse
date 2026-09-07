import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { UpdateTenantSettingsInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface TenantSettings {
  allowNegativeStock?: boolean;
  saleCancelWindowHours?: number;
  [key: string]: unknown; // preserva chaves futuras não conhecidas por este serviço
}

// Dados da empresa + as únicas duas chaves de tenant.settings hoje lidas em
// algum lugar do backend (docs/04-regras-negocio.md, 4.2/4.3) mas nunca
// configuráveis por nenhuma tela — Configurações (Fase 2/12) fecha essa
// lacuna sem inventar chave nova.
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  async updateSettings(tenantId: string, input: UpdateTenantSettingsInput) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const current = (tenant.settings ?? {}) as TenantSettings;

    const next: TenantSettings = { ...current };
    if (input.allowNegativeStock !== undefined) next.allowNegativeStock = input.allowNegativeStock;
    if (input.saleCancelWindowHours !== undefined) next.saleCancelWindowHours = input.saleCancelWindowHours;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: next as Prisma.InputJsonValue },
    });
  }
}
