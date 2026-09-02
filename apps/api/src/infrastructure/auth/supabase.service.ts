import { Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseAuthUser {
  id: string;
  email: string;
}

// Cliente com a secret key: só existe no backend, nunca chega ao frontend
// (docs/02-arquitetura.md, 2.1 — o Supabase aqui é infraestrutura atrás da API própria).
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url || !secretKey) {
      this.logger.warn(
        "SUPABASE_URL/SUPABASE_SECRET_KEY não configurados — validação de sessão sempre falhará.",
      );
      this.client = null;
    } else {
      this.client = createClient(url, secretKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }

  // Valida o JWT chamando o Supabase Auth (não verifica a assinatura localmente,
  // então funciona com qualquer formato de chave — legado ou sb_publishable/sb_secret).
  async verifyToken(jwt: string): Promise<SupabaseAuthUser | null> {
    if (!this.client) return null;

    const { data, error } = await this.client.auth.getUser(jwt);
    if (error || !data.user?.email) return null;

    return { id: data.user.id, email: data.user.email };
  }
}
