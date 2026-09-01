import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Não propaga erro de conexão: a API deve subir mesmo com o banco indisponível
  // (ex: ambiente sem Postgres provisionado ainda); as queries que dependerem
  // dele falharão no momento do uso, não no boot.
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn(`Não foi possível conectar ao banco no boot: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
