# 11 — Deploy e Infraestrutura

## 11.1 Ambientes

```
local        → desenvolvimento na máquina do dev, Supabase local (via CLI) ou projeto de dev na nuvem
staging      → réplica de produção, usada para validar releases antes do deploy final
production   → ambiente real dos clientes
```

## 11.2 Infraestrutura por componente

| Componente | Onde roda |
|---|---|
| Frontend (Next.js/PWA) | Vercel (recomendado, integração nativa com Next.js) ou similar |
| Backend (API) | Container Docker — plataforma a definir (Railway, Render, Fly.io ou provedor cloud tradicional conforme escala) |
| Banco de dados | Supabase (PostgreSQL gerenciado) |
| Storage de arquivos (XML, PDF fiscal) | Supabase Storage |
| Cache/filas (a partir da fase de escala) | Redis gerenciado |

## 11.3 Containerização

Todo serviço de backend roda em Docker, com `docker-compose` para ambiente local reproduzível (API + banco local + serviços auxiliares).

## 11.4 CI/CD (GitHub Actions)

```
Pull Request
   ├── Lint
   ├── Testes unitários
   ├── Testes de integração
   └── Build

Merge em main
   ├── Todos os passos acima
   ├── Deploy automático em staging
   └── Deploy em produção via aprovação manual (gate)
```

## 11.5 Migrations de banco

- Versionadas desde o primeiro commit (via Prisma Migrate ou Supabase Migrations).
- Nunca aplicadas manualmente em produção — sempre via pipeline.
- Toda migration destrutiva (drop de coluna/tabela) passa por um passo intermediário de "deprecar antes de remover", dado que dispositivos offline podem estar rodando uma versão anterior do app por dias.

## 11.6 Observabilidade

- Logs estruturados (JSON) em toda a API, com `tenant_id`, `device_id` e `operation_id` como campos padrão de correlação — essencial para depurar problemas de sincronização relatados por um cliente específico.
- OpenTelemetry para tracing entre API → banco → provedor fiscal.
- Alertas configurados para: taxa elevada de `sync_operations` em `REJECTED`/`CONFLICT`, falhas do provedor fiscal, erro 5xx acima de limiar.

## 11.7 Backups

- Backup automático do PostgreSQL (recurso nativo do Supabase), com teste periódico de restauração — não basta ter backup, é preciso validar que ele restaura.
- Retenção mínima recomendada: 30 dias.

## 11.8 Segurança de infraestrutura

- Segredos (chaves de API do provedor fiscal, credenciais de banco) nunca em código-fonte — gerenciados via variáveis de ambiente/secret manager da plataforma de deploy.
- Certificados digitais dos tenants (necessários para o provedor fiscal) armazenados conforme exigência de segurança do próprio provedor — nunca em texto puro no banco do Orbix Pulse.
- HTTPS obrigatório em todos os ambientes, inclusive staging.

## 11.9 Atualização de PWA em dispositivos offline

Como um dispositivo pode operar offline por dias, é preciso uma estratégia explícita de atualização de versão do app:
- Service Worker verifica nova versão disponível ao reconectar.
- Atualização é aplicada de forma não disruptiva (não interrompe uma venda em andamento) — geralmente na próxima abertura do app ou em momento de ociosidade.
- Compatibilidade retroativa da API (via versionamento, ver `09-api.md`) garante que um dispositivo em versão antiga continue funcionando até atualizar.
