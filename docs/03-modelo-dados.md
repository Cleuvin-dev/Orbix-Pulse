# 03 — Modelo de Dados

## 3.1 Convenções gerais

- Toda tabela de negócio tem: `id (UUID)`, `tenant_id (UUID)`, `created_at`, `updated_at`, `created_by (user_id)`.
- Toda tabela sincronizável tem também: `device_id`, `sync_status (PENDING | SYNCING | SYNCED | CONFLICT)`, `operation_id (UUID, único)`.
- Exclusão é sempre lógica (`deleted_at`), nunca física, para preservar auditoria e histórico de sincronização.
- Todo valor monetário é armazenado como inteiro em centavos (evita erro de ponto flutuante).

## 3.2 Entidades principais (visão de alto nível)

```
tenants (empresas)
  └── branches (filiais/lojas)
        └── devices (dispositivos registrados)

users
  └── user_roles (papel do usuário por tenant)

products
  ├── product_categories
  └── barcodes (1:N — produto pode ter múltiplos códigos)

stock_movements (livro-razão de estoque — nunca UPDATE direto em "estoque atual")

customers
suppliers

sales
  └── sale_items
  └── payments

cash_registers (sessões de caixa — abertura/fechamento)

finance_entries (contas a pagar/receber, lançamentos)
finance_categories

fiscal_documents (referência ao documento emitido pelo serviço terceirizado)

audit_log
sync_operations (fila/histórico de sincronização)
```

## 3.3 Detalhamento das tabelas centrais

### `tenants`
```
id, name, document (CNPJ), plan, status, settings (jsonb), created_at
```

### `branches`
```
id, tenant_id, name, address, is_active
```

### `devices`
```
id, tenant_id, branch_id, user_id (dono principal do device), name (ex: "PC-CAIXA-01"),
app_version, last_sync_at, status (ACTIVE | INACTIVE)
```

### `users` / `user_roles`
```
users: id, email, name, auth_id (referência ao Supabase Auth), status
user_roles: id, user_id, tenant_id, role (OWNER|ADMIN|MANAGER|FINANCE|CASHIER|STOCK|SELLER|ACCOUNTANT)
```
Permissões finas ficam em tabela separada — ver `05-permissoes-rbac.md`.

### `products`
```
id, tenant_id, sku, name, category_id, unit, cost_price, sale_price,
current_stock (campo derivado/cache — nunca fonte de verdade),
minimum_stock, maximum_stock, supplier_id, is_active
```

### `barcodes`
```
id, product_id, code, type (EAN13|EAN8|UPC|CODE128|QR)
```

### `stock_movements` (fonte de verdade do estoque)
```
id, tenant_id, product_id, branch_id, type (ENTRADA|SAIDA|DEVOLUCAO|AJUSTE|TRANSFERENCIA|VENDA|COMPRA),
quantity, reason, reference_id (ex: sale_id), device_id, operation_id, created_at, created_by
```
O `current_stock` em `products` é um cache recalculável — a soma de `stock_movements` é sempre a verdade. Isso permite auditoria completa ("por que o estoque está em 7?").

### `sales` / `sale_items` / `payments`
```
sales: id, tenant_id, branch_id, customer_id, status (OPEN|COMPLETED|CANCELLED),
total_amount, discount_amount, device_id, operation_id, cash_register_id, created_at

sale_items: id, sale_id, product_id, quantity, unit_price, discount, total

payments: id, sale_id, method (CASH|CARD|PIX|OTHER), amount, status
```

### `cash_registers`
```
id, tenant_id, branch_id, opened_by, opened_at, opening_amount,
closed_by, closed_at, closing_amount, expected_amount, difference, status (OPEN|CLOSED)
```

### `finance_entries`
```
id, tenant_id, type (PAYABLE|RECEIVABLE), category_id, description,
amount, due_date, paid_at, status (PENDING|PAID|OVERDUE|CANCELLED), reference_id
```

### `fiscal_documents`
```
id, tenant_id, sale_id, provider (ex: "focus_nfe"), provider_document_id,
type (NFE|NFCE|NFSE), status (PENDING|PROCESSING|AUTHORIZED|REJECTED|CANCELLED),
xml_url, pdf_url, error_message, requested_at, authorized_at
```
Ver `08-fiscal.md` para o fluxo completo — este registro é apenas a referência local ao que o provedor externo processou.

### `audit_log`
```
id, tenant_id, user_id, device_id, action (ex: "PRODUCT_UPDATED", "SALE_CANCELLED"),
entity, entity_id, before (jsonb), after (jsonb), created_at
```

### `sync_operations`
```
id, tenant_id, device_id, operation_id (UUID único — chave de idempotência),
entity, entity_type, payload (jsonb), status (PENDING|PROCESSING|APPLIED|REJECTED|CONFLICT),
error_message, created_at, processed_at
```
Detalhamento completo do funcionamento em `07-sync-engine.md`.

## 3.4 Isolamento multi-tenant

Toda tabela de negócio tem `tenant_id NOT NULL`. Regras:
1. Toda query no backend filtra por `tenant_id` derivado do usuário autenticado — nunca aceito do cliente sem validação cruzada.
2. RLS no Supabase replica essa regra como segunda camada: `USING (tenant_id = current_tenant())`.
3. Índices compostos sempre começam por `tenant_id` (ex: `(tenant_id, sku)`, `(tenant_id, created_at)`) para performance em queries multi-tenant.

## 3.5 Índices e integridade recomendados

- `products (tenant_id, sku)` único
- `barcodes (code)` único globalmente ou único por tenant, a decidir conforme necessidade de compartilhar catálogo
- `sync_operations (operation_id)` único — base da idempotência
- `stock_movements (tenant_id, product_id, created_at)` para reconstrução rápida do saldo
- Foreign keys com `ON DELETE RESTRICT` em entidades referenciadas por histórico (nunca cascade em vendas/movimentações)

## 3.6 Próximo nível de detalhe

Este documento cobre o modelo conceitual. O DDL completo (schema SQL/Prisma) deve ser gerado na Fase 1 de execução (ver `12-roadmap-fases.md`), a partir deste desenho, com migrations versionadas desde o primeiro commit.
