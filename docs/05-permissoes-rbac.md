# 05 — Permissões e RBAC

## 5.1 Modelo

Duas camadas:
1. **Role** (papel) — categoria ampla do usuário dentro do tenant.
2. **Permission** (permissão granular) — ação específica, no formato `recurso.acao`.

Um usuário tem um `role`, e cada `role` tem um conjunto padrão de `permissions`, que pode ser customizado por tenant (ex: um dono pode dar permissão extra a um gerente específico).

## 5.2 Papéis (roles)

```
OWNER        — acesso total, não removível/limitável
ADMIN        — quase total, configurável pelo OWNER
MANAGER      — gestão operacional + parte financeira
FINANCE      — foco em financeiro/DRE, sem operação de PDV
CASHIER      — foco em vendas/PDV
STOCK        — foco em estoque/inventário
SELLER       — vendas, sem acesso a caixa/financeiro
ACCOUNTANT   — leitura de relatórios fiscais/financeiros, geralmente externo e remoto
```

## 5.3 Formato de permissão

```
<recurso>.<ação>

Exemplos:
sales.create
sales.cancel
finance.view
finance.view_profit
finance.export
stock.adjust
products.update
products.delete
users.manage
fiscal.issue
fiscal.cancel
reports.executive.view
audit.view
```

## 5.4 Matriz de permissões (resumo — base para a tabela `role_permissions`)

| Permissão | OWNER | ADMIN | MANAGER | FINANCE | CASHIER | STOCK | SELLER | ACCOUNTANT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `sales.create` | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — |
| `sales.cancel` | ✓ | ✓ | política* | — | — | — | — | — |
| `products.view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `products.update` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `products.delete` | ✓ | ✓ | — | — | — | — | — | — |
| `stock.movement.create` | ✓ | ✓ | ✓ | — | — | ✓ | — | — |
| `stock.adjust` | ✓ | ✓ | ✓ | — | — | ✓ | — | — |
| `cash_register.open_close` | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| `finance.view` | ✓ | ✓ | ✓ | ✓ | limitado** | — | — | ✓ |
| `finance.view_profit` | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| `finance.export` | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ |
| `reports.executive.view` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `fiscal.issue` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `fiscal.cancel` | ✓ | ✓ | política* | — | — | — | — | — |
| `users.manage` | ✓ | ✓ | — | — | — | — | — | — |
| `settings.manage` | ✓ | ✓ | — | — | — | — | — | — |
| `audit.view` | ✓ | ✓ | — | — | — | — | — | — |

\* "política" = configurável por tenant (ex: gerente pode cancelar até X horas após a venda).
\** CASHIER vê apenas o fluxo de caixa da própria sessão aberta, não o consolidado da empresa.

## 5.5 Regra fixa

**A verificação de permissão acontece sempre no backend**, independentemente do que o frontend exibe ou esconde. Exemplo de contrato:

```
CanPerform(user, permission, context?) → boolean

Ex:
CanPerform(user, "finance.view_profit") → false para CASHIER
CanPerform(user, "sales.cancel", { sale }) → avalia política de tempo para MANAGER
```

Toda rota de API valida a permissão correspondente antes de executar a ação. Uma tentativa de acesso sem permissão retorna `403`, e é registrada em `audit_log` como tentativa negada (útil para detectar uso indevido).

## 5.6 Impacto na interface

- **OWNER**: painel executivo como tela inicial (faturamento, lucro, margem, top produtos, estoque crítico).
- **MANAGER**: dashboard operacional + acesso a relatórios gerenciais.
- **CASHIER/SELLER**: tela inicial é o PDV — sem acesso visível a menus financeiros/executivos.
- **STOCK**: tela inicial é o módulo de estoque.

## 5.7 Impacto no offline (sincronização seletiva por permissão)

O dispositivo de um usuário só deve receber (sincronizar) os dados que aquele usuário tem permissão de ver. Um `CASHIER` não deve ter DRE, custos ou lucros armazenados localmente em IndexedDB, mesmo que o dispositivo fique offline por dias — isso é tanto uma questão de segurança quanto de tamanho de payload sincronizado. Ver `06-offline-first.md`, seção "dado mínimo necessário".

## 5.8 Auditoria de mudanças de permissão

Qualquer alteração de `role` ou `permission` de um usuário é registrada em `audit_log`, incluindo quem alterou, quando, e o antes/depois.
