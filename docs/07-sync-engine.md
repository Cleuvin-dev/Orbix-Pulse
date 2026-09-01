# 07 — Sync Engine

Este é o componente mais crítico do Orbix Pulse. Toda a promessa de "offline-first sem dor de cabeça" depende dele funcionar corretamente.

## 7.1 Princípio: sincronizar operações, não estado

Nunca sincronizamos `estoque = 15`. Sincronizamos eventos: `SALE_CREATED`, `STOCK_MOVEMENT_CREATED`, `CASH_REGISTER_OPENED`, etc. O servidor aplica os eventos na ordem e recalcula o estado — isso é o que permite múltiplos dispositivos operarem sobre o mesmo dado offline, simultaneamente, sem se sobrescreverem.

Exemplo:
```
PC-01 vende offline: -3 unidades do Produto A
Tablet vende offline: -2 unidades do Produto A
Estoque no servidor antes de qualquer sync: 10

Servidor recebe as duas operações (em qualquer ordem) e aplica ambas:
10 - 3 - 2 = 5

Resultado correto, independentemente de qual dispositivo sincronizou primeiro.
```

## 7.2 Idempotência

Toda operação carrega um `operation_id` (UUID) gerado **no momento da criação, no dispositivo de origem** — não no momento do envio.

```
Fluxo:
1. Usuário registra venda offline → operation_id gerado localmente
2. Operação salva em sync_queue local, status PENDING
3. Quando online, Sync Client envia a operação para a API
4. API verifica: esse operation_id já existe em sync_operations?
   - SIM → retorna o resultado já processado anteriormente (sem reprocessar)
   - NÃO → processa, salva o resultado, marca como APPLIED
5. Dispositivo recebe confirmação e marca a operação local como SYNCED
```

Isso resolve o cenário clássico de: servidor processou, mas a resposta não chegou ao cliente por queda de conexão, e o cliente tenta reenviar.

## 7.3 Máquina de estados de uma operação

```
PENDING → SYNCING → APPLIED
                  → REJECTED (erro de validação de negócio, ex: permissão negada)
                  → CONFLICT (requer resolução — ver 7.5)
```

Do lado do dispositivo:
```
PENDING_SYNC → SYNCING → SYNCED
                       → SYNC_ERROR (retry com backoff)
```

## 7.4 Fila de sincronização (dispositivo)

- Operações são enviadas em ordem de criação (`created_at` local), respeitando dependências (ex: `SALE_CREATED` antes de `PAYMENT_CREATED` referente àquela venda).
- Envio em lote (batch) quando possível, para reduzir round-trips.
- Retry com backoff exponencial em caso de falha de rede ou erro 5xx.
- Erros de validação de negócio (4xx, ex: "caixa já fechado") **não** são reenviados automaticamente — ficam sinalizados para revisão humana (ex: um funcionário registrou uma venda offline associada a um caixa que, no servidor, já havia sido fechado por outro dispositivo).

## 7.5 Resolução de conflitos

Nem toda operação é comutativa como um decremento de estoque. É preciso separar os casos:

### Operações comutativas/aditivas (caso simples)
Vendas, movimentações de estoque, pagamentos — são incrementos/decrementos que podem ser aplicados em qualquer ordem sem conflito real. **Resolução: aplicar todas.**

### Operações não-comutativas sobre o mesmo campo (caso que exige estratégia)
Exemplo: dois dispositivos editam o **preço** do mesmo produto offline, ao mesmo tempo, para valores diferentes.

Estratégia adotada no Orbix Pulse:
1. **Last-Write-Wins (LWW) com timestamp de criação da operação (não do envio)** como padrão para campos de cadastro simples (nome, descrição, preço), por ser previsível e simples de implementar no MVP.
2. Toda sobrescrita por LWW gera um registro em `audit_log` mostrando o valor "perdido", para que nunca seja uma alteração silenciosa e irrecuperável.
3. Para campos identificados como sensíveis o suficiente para exigir mais cuidado (ex: `sale_price` de produtos com alto volume), fica como evolução pós-MVP: bloqueio otimista com número de versão (`version` incremental), rejeitando a escrita conflitante e pedindo confirmação explícita do usuário ao reconectar.
4. Exclusões (soft delete) sempre "vencem" sobre edições concorrentes — se um dispositivo editou um produto que outro excluiu, a exclusão prevalece e a edição fica registrada em auditoria como órfã, para revisão manual.

Este documento define a estratégia; a tabela de decisão por entidade/campo deve ser mantida atualizada conforme novas entidades entrarem no sistema (ver seção 7.7).

## 7.6 Fluxo completo (diagrama)

```
DISPOSITIVO                              SERVIDOR
    │
    │ Usuário realiza ação
    ▼
Grava local (IndexedDB)
Status: PENDING_SYNC
    │
    │ (offline → aguarda)
    │ (online) 
    ▼
Envia operação (operation_id, payload)  ──────►  Recebe
                                                     │
                                                     ▼
                                          operation_id já existe?
                                            SIM → retorna resultado anterior
                                            NÃO → valida permissão/regra
                                                     │
                                                     ▼
                                          Aplica na transação (Postgres)
                                          Salva em sync_operations (APPLIED)
                                                     │
                                          ◄───────────
    ▼
Recebe confirmação
Status: SYNCED
```

## 7.7 Tabela de estratégia de conflito por entidade (viva — atualizar conforme o sistema cresce)

| Entidade | Tipo de operação | Estratégia |
|---|---|---|
| `stock_movements` | Sempre criação (nunca edição) | Aditiva — todas aplicadas |
| `sales` | Criação | Aditiva — cada venda é um novo registro |
| `sales.status` (cancelamento) | Edição de estado | Regra de negócio explícita (não pode cancelar venda já sincronizada e fiscalmente emitida sem fluxo de NF de cancelamento) |
| `products.price` | Edição de campo | LWW por timestamp de criação da operação + log em auditoria |
| `products.name/description` | Edição de campo | LWW |
| `customers` (cadastro) | Edição de campo | LWW |
| `cash_registers` | Abertura/fechamento | Bloqueio de negócio: só um OPEN por device por vez, validado no servidor |

## 7.8 Observabilidade do Sync Engine

- Todo `operation_id` rejeitado ou em conflito gera log estruturado e é visível em um painel técnico (não exposto ao usuário final) para diagnóstico.
- Métrica-chave a monitorar desde o MVP: tempo médio entre criação local da operação e confirmação `SYNCED`, e taxa de operações em `CONFLICT`/`REJECTED`.
