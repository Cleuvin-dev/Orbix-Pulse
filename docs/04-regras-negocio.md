# 04 — Regras de Negócio

## 4.1 Princípio: eventos, não updates diretos

Nenhuma operação de negócio relevante é um simples `UPDATE`. Toda operação relevante é modelada como um **evento de domínio** que desencadeia efeitos em cascata, de forma transacional.

## 4.2 Fluxo: Venda (evento `SALE_CREATED`)

```
Venda criada
   │
   ├── Validação: caixa está aberto? usuário tem permissão sale.create?
   ├── Estoque: -N por item (stock_movements tipo VENDA)
   ├── Financeiro: + valor no fluxo de caixa da sessão atual
   ├── Pagamento: registro de payments (pode ser múltiplo — dinheiro + cartão)
   ├── Fiscal: se configurado, dispara emissão via serviço terceirizado (assíncrono)
   └── Auditoria: log da operação
```

Regras específicas:
- Uma venda só pode ser criada com `cash_register` na situação `OPEN`.
- Estoque pode ficar negativo apenas se a configuração do tenant permitir explicitamente (`allow_negative_stock`); por padrão, é bloqueado.
- Cancelamento de venda é uma operação separada (`SALE_CANCELLED`), nunca um DELETE — reverte estoque e financeiro via novos registros de movimentação, preservando o histórico original.

## 4.3 Fluxo: Cancelamento de venda (evento `SALE_CANCELLED`)

```
Solicitação de cancelamento
   │
   ├── Verificação de permissão: CanCancelSale(user, sale) — regra no backend, nunca só no frontend
   │     OWNER → sempre pode
   │     MANAGER → pode, conforme política do tenant (ex: até X horas após a venda)
   │     CASHIER → não pode (padrão) — requer permissão explícita
   │
   ├── Se a venda já tem documento fiscal AUTHORIZED → requer emissão de NF de cancelamento/devolução
   │     (não é um simples cancelamento local — ver 08-fiscal.md)
   │
   ├── Estoque: estorno via stock_movements tipo DEVOLUCAO (não editar o movimento original)
   ├── Financeiro: lançamento de estorno
   └── Auditoria: log com motivo obrigatório
```

## 4.4 Fluxo: Estoque

### Entrada (`STOCK_IN`)
Compra recebida, devolução de cliente, ajuste positivo. Sempre associada a `reason` e, quando aplicável, a `supplier_id`/`purchase_order_id`.

### Saída (`STOCK_OUT`)
Venda, perda, ajuste negativo, transferência entre filiais.

### Estoque mínimo e alertas
```
SE current_stock <= minimum_stock
ENTÃO gerar alerta (dashboard + notificação)
```
Nível MVP: alerta simples baseado em limiar fixo.
Nível pós-MVP (fora do escopo inicial, mas desenhado para caber depois): cálculo de risco de ruptura com base em média de vendas e prazo de fornecedor, gerando sugestão de quantidade de compra.

### Reconciliação de estoque (inventário físico)
Operação especial que compara `current_stock` calculado com contagem física informada pelo usuário, gerando um `AJUSTE` com a diferença e motivo obrigatório.

## 4.5 Fluxo: Caixa

```
Abertura de caixa (CASH_REGISTER_OPENED)
   ├── Requer valor de abertura informado
   └── Um único caixa OPEN por device/usuário simultaneamente (regra de negócio, não só de UI)

Durante o dia
   └── Toda venda/pagamento em dinheiro se associa à sessão de caixa ativa

Fechamento de caixa (CASH_REGISTER_CLOSED)
   ├── Sistema calcula valor esperado (abertura + vendas em dinheiro - sangrias)
   ├── Usuário informa valor contado fisicamente
   ├── Sistema registra diferença (se houver)
   └── Sessão marcada como CLOSED — imutável a partir daqui
```

## 4.6 Fluxo: Financeiro

- Contas a pagar/receber são lançamentos independentes de venda (podem vir de compras, despesas fixas, etc.).
- Todo lançamento tem categoria (`finance_categories`) para permitir DRE.
- Fluxo de caixa é uma **visão agregada e filtrável** (por dia/semana/mês/período customizado) sobre `finance_entries` + `sales` + `payments` — não uma tabela própria.
- DRE (Demonstrativo de Resultado): calculado a partir de categorias marcadas como receita/custo/despesa operacional. Estrutura mínima:

```
Receita Bruta
  (-) Impostos (quando aplicável, via dados fiscais)
Receita Líquida
  (-) Custo das Mercadorias Vendidas (CMV, via cost_price dos itens vendidos)
Lucro Bruto
  (-) Despesas Operacionais (finance_entries categorizadas)
Lucro Operacional
```

## 4.7 Regra transversal: nada crítico só no frontend

Toda regra de autorização de ação sensível (cancelar venda, alterar preço, excluir produto, ver lucro) é validada no backend antes de qualquer efeito. O frontend pode esconder botões por UX, mas isso nunca substitui a validação — ver `05-permissoes-rbac.md`.

## 4.8 Regra transversal: idempotência

Toda operação de negócio relevante carrega um `operation_id` único gerado no dispositivo de origem. O backend rejeita reprocessamento do mesmo `operation_id` — ver `07-sync-engine.md`.
