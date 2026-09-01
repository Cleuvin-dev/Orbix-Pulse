# 01 — Visão de Produto

## 1.1 Problema

Pequenos e médios estabelecimentos comerciais dependem de sistemas de gestão que, em sua maioria, exigem conexão constante com a internet. Quando a conexão cai, a operação para: não é possível vender, consultar estoque, ou fechar caixa. Isso gera perda direta de receita e frustração operacional.

## 1.2 Proposta de valor

O Orbix Pulse é um ERP/PDV que funciona de forma plena mesmo sem internet, sincronizando automaticamente quando a conexão retorna — sem exigir instalação de software tradicional (roda como PWA no navegador).

## 1.3 Personas

### Dono / Proprietário
Quer visão executiva rápida: faturamento, lucro, margem, estoque crítico. Não quer operar o sistema no dia a dia, quer decidir com base nele. Acessa frequentemente pelo celular, de qualquer lugar.

### Gerente
Opera o sistema no dia a dia, mas também precisa de visão gerencial (fluxo de caixa, compras, relatórios). Acesso intermediário — vê mais que o funcionário, menos que o dono.

### Funcionário de caixa (Cashier)
Usa o PDV para vender. Precisa de velocidade e simplicidade acima de tudo. Não deve ver dados financeiros sensíveis.

### Estoquista
Faz entrada/saída de estoque, inventário, recebimento de mercadoria. Não opera vendas necessariamente.

### Contador (externo)
Acesso limitado a relatórios fiscais e financeiros para fins de prestação de contas. Geralmente acesso somente-leitura, remoto, sempre online.

## 1.4 Módulos do sistema

```
Orbix Pulse
│
├── Dashboard (executivo e operacional, por papel)
├── Vendas (PDV, pedidos, orçamentos, clientes)
├── Produtos (cadastro, categorias, código de barras, preços)
├── Estoque (entrada, saída, transferência, ajuste, inventário, estoque mínimo, alertas)
├── Compras (fornecedores, pedidos de compra, entrada de NF)
├── Financeiro (caixa, contas a pagar/receber, fluxo de caixa, DRE, categorias)
├── Fiscal (orquestração via serviço terceirizado — NF-e, NFC-e, NFS-e)
├── Relatórios
├── Usuários e Permissões
└── Configurações (empresa, dispositivos, integrações)
```

## 1.5 O que NÃO entra no MVP (explicitamente fora de escopo na v1)

- Marketplace / e-commerce próprio
- CRM avançado
- Módulo de produção/manufatura
- Logística/roteirização de entrega
- Chatbot / atendimento automatizado
- Conciliação bancária automática
- Inteligência preditiva (previsão de estoque, sugestão de compra automática) — fica para depois do MVP validado

## 1.6 Diferenciais competitivos

1. Offline-first real (não "modo de contingência raro", mas experiência padrão).
2. Indicador de status de sincronização sempre visível e transparente ao usuário.
3. RBAC granular por permissão (não apenas por tela).
4. Auditoria completa desde o dia 1.
5. Fiscal delegado a especialista via API, reduzindo risco de compliance e velocidade de entrega.

## 1.7 Modelo comercial (hipótese inicial — não é definição de preço final)

| Plano | Faixa de preço (hipótese) | Inclui |
|---|---|---|
| Básico | ~R$ 39,90/mês | 1 empresa, 1 usuário, estoque, financeiro, PDV |
| Profissional | ~R$ 79,90/mês | + Fiscal, mais usuários, relatórios, backup |
| Premium | ~R$ 149,90/mês | + Multiusuário, multiestoque, multiempresa, integrações |

Estes valores devem ser validados com pesquisa de mercado antes de qualquer comunicação comercial — são apenas placeholders para orientar o desenho de limites por plano (ex: quantidade de usuários, dispositivos, notas fiscais/mês).

## 1.8 Métricas de sucesso do MVP

- Uma venda completa (PDV → estoque → financeiro) deve funcionar 100% offline e sincronizar sem duplicidade ao reconectar.
- Tempo de resposta do PDV local (busca de produto, registro de item) deve ser < 200ms, independente de estado de conexão.
- Zero divergência de estoque entre dispositivos após sincronização completa, em cenário de múltiplos dispositivos vendendo o mesmo produto offline simultaneamente.
