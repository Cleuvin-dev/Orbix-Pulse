# 09 — API

## 9.1 Estilo

REST + OpenAPI (documentação gerada automaticamente a partir dos schemas Zod/DTOs compartilhados entre frontend e backend).

## 9.2 Autenticação

- Supabase Auth emite o JWT no login.
- Toda requisição à API Orbix Pulse carrega o JWT no header `Authorization: Bearer`.
- A API valida o JWT, extrai `user_id`, resolve `tenant_id` e `role`/`permissions` a partir do banco (não confia em claims de tenant vindas do cliente).

## 9.3 Autorização

Toda rota declara a(s) permissão(ões) necessária(s). Middleware comum:

```
Rota → Middleware de Auth (valida JWT) → Middleware de Authorization (CanPerform) → Controller → Caso de uso
```

Resposta padrão para acesso negado: `403`, com log em `audit_log` (tentativa negada).

## 9.4 Endpoints centrais (visão de alto nível — detalhamento fica no OpenAPI gerado)

```
POST   /auth/session                 (troca de sessão/refresh)

GET    /products
POST   /products
PATCH  /products/:id
DELETE /products/:id

POST   /sales                         (criação — idempotente via operation_id)
POST   /sales/:id/cancel

POST   /stock/movements               (idempotente via operation_id)
GET    /stock/movements?product_id=

POST   /cash-registers/open
POST   /cash-registers/:id/close

GET    /finance/entries
POST   /finance/entries
GET    /finance/cash-flow?from=&to=
GET    /finance/dre?from=&to=

POST   /fiscal/issue/:sale_id
GET    /fiscal/documents/:id
POST   /fiscal/cancel/:document_id

POST   /sync/batch                    (endpoint central do Sync Engine — recebe lote de operações)
GET    /sync/status

GET    /reports/executive
GET    /audit-log
```

## 9.5 Contrato do endpoint de sincronização (`POST /sync/batch`)

Este é o endpoint mais importante do sistema — ver `07-sync-engine.md` para a lógica completa.

```
Request:
{
  "device_id": "uuid",
  "operations": [
    {
      "operation_id": "uuid",
      "entity": "SALE_CREATED",
      "payload": { ... },
      "created_at": "timestamp local de criação"
    },
    ...
  ]
}

Response:
{
  "results": [
    { "operation_id": "uuid", "status": "APPLIED", "server_id": "uuid" },
    { "operation_id": "uuid", "status": "REJECTED", "error": "cash_register_closed" },
    { "operation_id": "uuid", "status": "ALREADY_PROCESSED", "server_id": "uuid" }
  ]
}
```

Regra: o processamento de cada operação dentro do lote é individual e transacional — uma operação rejeitada não impede as demais de serem aplicadas.

## 9.6 Versionamento

API versionada por path (`/v1/...`) desde o início, mesmo com um único cliente (o próprio Orbix Pulse web), para permitir evolução sem quebrar dispositivos com versões antigas do PWA ainda não atualizadas (cenário realista em offline-first, já que um dispositivo pode ficar dias sem atualizar o app).

## 9.7 Rate limiting e abuso

Endpoints de sincronização e emissão fiscal devem ter rate limiting por `tenant_id`/`device_id`, para evitar que um dispositivo com bug em loop de retry sobrecarregue a API ou gere custo indevido no provedor fiscal (que cobra por documento emitido).

## 9.8 Validação

Todo payload de entrada é validado com o mesmo schema Zod usado no frontend (via `packages/validation`), garantindo que a validação de formato nunca diverge entre cliente e servidor. Validação de **regra de negócio** (diferente de formato) acontece na camada de aplicação, não no schema.
