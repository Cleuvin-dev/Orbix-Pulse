# 12 — Roadmap de Execução (Fases)

## Como usar este roadmap

Cada fase deve ser entregue ao Claude Code **isoladamente**, referenciando os documentos relevantes deste blueprint. Nunca peça o sistema inteiro de uma vez. Uma fase só é considerada concluída quando: código implementado + testes da fase passando + documentação de eventuais decisões atualizadas.

---

## Fase 0 — Arquitetura e fundação do repositório

**Objetivo:** montar o esqueleto do monorepo, sem funcionalidade de negócio ainda.
**Referências:** `02-arquitetura.md`

- Estrutura de monorepo (`apps/web`, `apps/api`, `packages/*`)
- Configuração de lint, TypeScript, Prettier compartilhados
- Docker Compose para ambiente local
- Projeto Supabase criado (dev)
- `CLAUDE.md` na raiz

## Fase 1 — Modelo de dados e migrations

**Referências:** `03-modelo-dados.md`

- Schema completo via Prisma (ou equivalente) refletindo as entidades do documento 03
- Migrations versionadas
- Seed de dados de desenvolvimento (tenant de teste, usuários de cada role)

## Fase 2 — Autenticação e multi-tenant

**Referências:** `02-arquitetura.md` (seção 2.6), `05-permissoes-rbac.md`

- Integração com Supabase Auth
- Middleware de resolução de `tenant_id` a partir do usuário autenticado
- RLS básico no Supabase como segunda camada de defesa

## Fase 3 — RBAC e permissões

**Referências:** `05-permissoes-rbac.md`

- Tabelas `role_permissions` / overrides por usuário
- Middleware `CanPerform` no backend
- Testes: matriz completa de permissões por role (ver `10-testes.md`)

## Fase 4 — Produtos e catálogo

**Referências:** `03-modelo-dados.md`, `04-regras-negocio.md`

- CRUD de produtos, categorias, códigos de barras
- Leitura via código de barras (USB no PC, câmera no mobile)

## Fase 5 — Estoque

**Referências:** `04-regras-negocio.md` (seção 4.4)

- `stock_movements` como livro-razão
- Entrada, saída, ajuste, transferência
- Estoque mínimo e alertas simples (sem inteligência preditiva ainda)

## Fase 6 — PDV e vendas (ainda online-only nesta fase)

**Referências:** `04-regras-negocio.md` (seções 4.2, 4.3, 4.5)

- Fluxo completo de venda → estoque → financeiro, síncrono, online
- Abertura/fechamento de caixa
- Cancelamento de venda com validação de permissão

## Fase 7 — Financeiro

**Referências:** `04-regras-negocio.md` (seção 4.6)

- Contas a pagar/receber
- Fluxo de caixa filtrável por período
- DRE básico

## Fase 8 — Offline-first (infraestrutura local)

**Referências:** `06-offline-first.md`

- Service Worker + PWA instalável
- Dexie/IndexedDB com o subconjunto de entidades necessário
- Sincronização seletiva por permissão (dispositivo baixa só o que o usuário pode ver)

## Fase 9 — Sync Engine

**Referências:** `07-sync-engine.md`, `09-api.md` (seção 9.5)

- Endpoint `POST /sync/batch`
- Idempotência via `operation_id`
- Estratégia de conflito por entidade (tabela da seção 7.7)
- Indicador de status de sincronização na UI

**Esta é a fase mais crítica tecnicamente — não deve ser paralelizada com outras fases de negócio.**

## Fase 10 — Fiscal

**Referências:** `08-fiscal.md`

- Escolha final do provedor (Focus NFe / eNotas / Tecnospeed / NFe.io) após avaliação de cobertura/preço/SLA
- Integração de emissão (NFC-e como prioridade para MVP de varejo)
- Fluxo de status (`PENDING_ISSUANCE → PROCESSING → AUTHORIZED/REJECTED`)
- Cancelamento fiscal

## Fase 11 — Relatórios e Dashboard Executivo

**Referências:** `01-visao-produto.md` (seção 1.3), `05-permissoes-rbac.md`

- Painel executivo (dono): faturamento, lucro, margem, top produtos, estoque crítico
- Painel operacional (funcionário): atalhos de PDV/estoque

## Fase 12 — Auditoria

**Referências:** `04-regras-negocio.md`, `05-permissoes-rbac.md` (seção 5.8)

- `audit_log` cobrindo: alteração de produto/preço, cancelamento de venda, ajuste de estoque, mudança de permissão, tentativa de acesso negada
- Tela de consulta de auditoria (OWNER/ADMIN)

## Fase 13 — Testes end-to-end e cenários offline

**Referências:** `10-testes.md`

- Cobertura E2E dos fluxos críticos (venda offline → sync → estoque correto)
- Testes de conflito multi-dispositivo simulado

## Fase 14 — Deploy e observabilidade

**Referências:** `11-deploy-infra.md`

- CI/CD completo
- Ambientes staging/produção
- Logs estruturados e alertas configurados

## Fase 15 — Piloto com cliente real

- Deploy controlado com 1-2 estabelecimentos reais
- Validação das métricas de sucesso definidas em `01-visao-produto.md` (seção 1.8)
- Coleta de atrito real de uso (principalmente no PDV, onde velocidade é crítica)

---

## Pós-MVP (explicitamente fora do escopo das fases acima)

- Inteligência de estoque (previsão de ruptura, sugestão de compra)
- Multiempresa avançado (múltiplas empresas sob o mesmo login/dono)
- Cálculo tributário avançado por regime
- Contingência fiscal offline formal (se o provedor não já oferecer)
- Conciliação bancária
- App mobile "PDV offline pesado" otimizado para iOS além do PWA padrão, caso a limitação de Safari se mostre um problema real em uso de campo

## Regra geral do roadmap

Nenhuma fase avança sem a anterior ter testes passando. Fases 8 e 9 (offline-first e sync engine) são o núcleo técnico diferenciador do produto — não devem ser aceleradas ou simplificadas sob pressão de prazo, sob risco de comprometer a proposta de valor central do Orbix Pulse.
