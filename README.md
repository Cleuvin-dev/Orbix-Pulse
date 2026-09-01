# Orbix Pulse — Blueprint 1.0

> O coração do seu negócio continua batendo, mesmo offline.

Este é o blueprint completo do **Orbix Pulse**, um ERP/PDV Web offline-first, multi-tenant, desenvolvido sob o ecossistema **Orbix**.

Este documento é o ponto de partida. Leia nesta ordem — cada arquivo depende de decisões tomadas no anterior.

## Índice de documentos

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 00 | `00-nome-e-conceito.md` | Nome, identidade e proposta de valor |
| 01 | `01-visao-produto.md` | Visão, personas, módulos, modelo comercial |
| 02 | `02-arquitetura.md` | Arquitetura técnica geral, stack, monorepo |
| 03 | `03-modelo-dados.md` | Entidades, ERD, schema PostgreSQL |
| 04 | `04-regras-negocio.md` | Fluxos de venda, estoque, financeiro |
| 05 | `05-permissoes-rbac.md` | Papéis, permissões granulares, matriz de acesso |
| 06 | `06-offline-first.md` | PWA, IndexedDB/Dexie, Service Worker, limites por plataforma |
| 07 | `07-sync-engine.md` | Motor de sincronização, idempotência, resolução de conflitos |
| 08 | `08-fiscal.md` | Estratégia fiscal via serviço terceirizado |
| 09 | `09-api.md` | Contratos de API, autenticação, autorização |
| 10 | `10-testes.md` | Estratégia de testes por camada |
| 11 | `11-deploy-infra.md` | Deploy, CI/CD, ambientes, observabilidade |
| 12 | `12-roadmap-fases.md` | Roadmap de execução, fase a fase, MVP → produto |
| — | `CLAUDE.md` | Regras operacionais para o Claude Code seguir durante o desenvolvimento |

## Como usar este Blueprint com o Claude Code

1. Coloque todos estes arquivos dentro da pasta `/docs` do repositório do projeto.
2. Coloque o `CLAUDE.md` na raiz do repositório (ele é lido automaticamente pelo Claude Code).
3. Siga o roadmap em `12-roadmap-fases.md` fase por fase — não peça o sistema inteiro de uma vez.
4. Cada fase deve referenciar explicitamente os documentos relevantes no prompt (ex: "Implemente a Fase 3 seguindo `04-regras-negocio.md` e `05-permissoes-rbac.md`").
5. Nenhum código deve contradizer o que está definido aqui. Se uma decisão precisar mudar, atualize o `.md` correspondente primeiro, depois o código.

## Decisões-chave já fechadas

- **Nome do sistema:** Orbix Pulse
- **Frontend:** Next.js + React + TypeScript + PWA
- **Banco local:** IndexedDB via Dexie
- **Banco central:** PostgreSQL via Supabase
- **Backend próprio:** existe (fino), por trás do Supabase — hospeda o Sync Engine, regras de negócio críticas e orquestração fiscal
- **Fiscal:** via serviço terceirizado (ex: Focus NFe, eNotas, Tecnospeed) — não implementamos protocolo SEFAZ na mão
- **Multi-tenant:** desde o dia 1
- **Sincronização:** baseada em operações (eventos), não em estado, com idempotência via `operation_id`
