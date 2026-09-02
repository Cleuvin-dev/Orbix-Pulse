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

- Integração com Supabase Auth — feito em 2026-09-01: `apps/api` valida o JWT via
  `supabase.auth.getUser()` (não verifica assinatura localmente) e expõe `GET /v1/auth/me`.
- Middleware de resolução de `tenant_id` a partir do usuário autenticado — feito:
  `ResolveCurrentUserService` (`apps/api/src/application/auth`) nunca confia em
  `tenant_id` vindo do cliente; resolve via `user_roles` no banco, com suporte a
  usuário multi-tenant via header `X-Tenant-Id` (rejeitado se o vínculo não existir).
- RLS básico no Supabase como segunda camada de defesa — **ainda não aplicável**:
  o banco de dados de negócio continua no Postgres local via Docker
  (`infrastructure/docker/docker-compose.yml`), não no Postgres do Supabase. O
  Supabase desta fase é usado só para Auth. RLS nas tabelas de negócio só faz
  sentido quando/se o banco migrar para o Supabase — reavaliar nessa migração.
- Login real na UI (`apps/web`) — feito em 2026-09-01, além do escopo original
  dos 3 itens acima (mas natural para a fase estar realmente utilizável):
  - `apps/web/lib/supabase/client.ts` — cliente Supabase de browser (só a chave
    pública `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nunca a secret key).
  - `apps/web/lib/session/session-provider.tsx` — substitui a sessão mock
    (`DevSessionProvider`, removida). Login (`signIn`), logout (`signOut`) e
    identidade resolvida sempre via `GET /v1/auth/me` do backend — nunca lê
    role/tenant do JWT decodificado no cliente.
  - `apps/web/app/login/page.tsx` — formulário de e-mail/senha.
  - `apps/web/components/layout/app-shell.tsx` — gate client-side: redireciona
    pra `/login` quando não autenticado, esconde sidebar/topbar na tela de login.
  - `apps/api/src/main.ts` — `app.enableCors()` adicionado (fixo pra
    `http://localhost:3000` em dev, configurável via `WEB_ORIGIN`); sem isso o
    login quebrava silenciosamente no browser (curl não pega esse tipo de erro,
    só apareceria no console do navegador).
  - Tipo `CurrentUser` movido para `packages/types` (compartilhado entre
    `apps/api` e `apps/web`, evita a resposta de `/v1/auth/me` divergir do que o
    front espera).
  - O antigo seletor "Ver como: {role}" no topbar (mock) foi **removido**,
    substituído por um menu de usuário real (nome/e-mail/badge de role + Sair).
    A tela de Usuários e Permissões (`apps/web/app/usuarios/page.tsx`) continua
    com dados de demonstração estáticos (`apps/web/lib/demo-users.ts`) — listar
    os usuários reais do tenant via API é trabalho futuro, fora do escopo aqui.
  - **Verificado de ponta a ponta em navegador real (2026-09-02)**: usando o
    Playwright já presente em `tests/e2e` (spec temporário, rodado e descartado,
    nunca commitado) — redirect pra `/login` quando deslogado, mensagem de erro
    em credenciais erradas, login certo leva ao dashboard com dado real (tenant,
    nome, e-mail, role), dropdown do usuário com logout, sessão sobrevive a F5.
    Login de teste: `owner@orbixpulse.dev` / `OrbixDev123!` (ou qualquer um dos
    8 e-mails de `apps/api/prisma/seed.ts`, mesma senha). Fase 2 sem pendências.

## Fase 3 — RBAC e permissões

**Referências:** `05-permissoes-rbac.md`

- Tabelas `role_permissions` / overrides por usuário — feito em 2026-09-02:
  `RolePermission` (permissão padrão por role dentro de um tenant) e
  `UserPermissionOverride` (grant/revoke pontual por usuário, prioridade sobre
  o role) no `schema.prisma`, migration `20260902092100_add_role_permissions`.
  Seed (`apps/api/prisma/seed.ts`) popula `role_permissions` do tenant de teste
  a partir da matriz de `05-permissoes-rbac.md` (5.4), transcrita em
  `apps/api/src/application/permissions/default-role-permissions.ts` — 62 linhas,
  conferidas uma a uma contra a tabela do blueprint.
- Middleware `CanPerform` no backend — feito:
  `CanPerformService.check(user, permission)` (fail-closed: nega por padrão se
  não houver `role_permission`/override) + `PermissionGuard` +
  `@RequirePermission("recurso.acao")`, sempre depois de `SupabaseAuthGuard`
  (`@UseGuards(SupabaseAuthGuard, PermissionGuard)`). Tentativa negada grava em
  `audit_log` (`action: "PERMISSION_DENIED"`, `entity: "user"` — não há uma
  entidade de negócio específica sendo acessada numa checagem de permissão em
  si, então o próprio usuário é o "entity" auditado) e responde `403`, conforme
  `docs/09-api.md` (9.3).
- Testes: matriz completa de permissões por role — feito: teste data-driven
  cobrindo todo role × toda permissão da matriz (136 casos) + o caso literal do
  blueprint (`10-testes.md`, 10.3: CASHIER não vê `finance.view_profit`) + teste
  de integração HTTP real do pipeline `SupabaseAuthGuard → PermissionGuard`
  (controller de teste descartável, nunca registrado nas rotas reais). 163
  testes no total em `apps/api` (incluindo os da Fase 2).

**Simplificações sinalizadas, não resolvidas pelo blueprint ainda** (ver
comentário em `default-role-permissions.ts`):
- `sales.cancel`/`fiscal.cancel` do MANAGER são "política\*" no blueprint
  (configurável por tenant, ex: até X horas após a venda) — isso é regra de
  negócio contextual, não uma permissão binária. Por ora MANAGER recebe a
  permissão concedida sem a janela de tempo; a política real só faz sentido
  quando o domínio de Vendas existir (Fase 4+).
- `finance.view` do CASHIER é "limitado\*\*" (só a sessão de caixa aberta
  própria) — é filtro de linha, não negação de rota. CASHIER recebe a
  permissão concedida; o filtro fica para quando a consulta financeira existir
  (Fase 5+).
- Nenhuma rota de negócio real usa `@RequirePermission` ainda, porque nenhuma
  existe (Fase 4+ não implementada) — a infraestrutura está pronta e testada,
  falta só aplicar `@UseGuards(SupabaseAuthGuard, PermissionGuard)` +
  `@RequirePermission(...)` em cada rota conforme ela for criada.
- Teste da matriz roda com Prisma mockado (sem banco de testes isolado
  configurado ainda — `10-testes.md`, 10.6). Cobre a lógica de
  `CanPerformService` fielmente ao que roda em produção, mas não é um teste de
  integração contra Postgres de verdade.

## Fase 4 — Produtos e catálogo

**Referências:** `03-modelo-dados.md`, `04-regras-negocio.md`

- CRUD de produtos, categorias, códigos de barras — feito em 2026-09-02, só
  backend. Schema já existia (Fase 1), sem migration nova.
  - `apps/api/src/application/products/products.service.ts` +
    `product-categories.service.ts`: sempre filtram por `tenantId` do usuário
    autenticado; `categoryId`/`supplierId` no payload são validados contra o
    tenant antes de aceitar (nunca confia em UUID vindo do cliente —
    CLAUDE.md regra 4). `current_stock` nunca é aceito no payload de
    criação/edição — é cache derivado de `stock_movements`
    (docs/03-modelo-dados.md, 3.3), fica em 0 até a Fase 5 existir. Exclusão
    de produto/categoria/código de barras é sempre `deletedAt` (soft delete).
  - Categorias: ciclo na hierarquia (`A vira filho de B, que já é filho de A`)
    é detectado e rejeitado subindo a cadeia de pais.
  - Fase explicitamente **online-only**, sem `operation_id`/fila de sync — o
    mesmo tratamento que Fase 6 (PDV) já recebe no roadmap ("ainda
    online-only nesta fase"); sync de produtos fica pra Fase 9.
  - Rotas protegidas por `SupabaseAuthGuard` + `PermissionGuard` — primeira
    rota de negócio real usando a infra da Fase 3 (que ficou pronta sem
    nenhum consumidor até aqui).
- Leitura via código de barras (USB no PC, câmera no mobile) — feito o lado
  backend: `GET /v1/products/barcode/:code` resolve um código escaneado pro
  produto (o leitor USB emula teclado, então a UI só precisa capturar o texto
  digitado e chamar essa rota — não tratado aqui, é frontend). Leitura via
  câmera (mobile) também é 100% frontend (`getUserMedia` + lib de decodificação),
  nenhuma diferença no contrato da API.

**Lacunas sinalizadas** (não resolvidas silenciosamente — `default-role-permissions.ts`
e os controllers têm o mesmo comentário):
- `docs/05-permissoes-rbac.md` (5.4) não tem uma permissão `products.create`
  nem nenhuma permissão de categoria — só `products.view/update/delete`.
  Criar produto e qualquer operação de categoria reaproveitam
  `products.update`/`products.view`/`products.delete` (mesmos roles:
  OWNER/ADMIN/MANAGER podem, os demais não). Se o blueprint quiser distinguir
  "criar" de "editar" no futuro, isso precisa de uma entrada nova na matriz.
- Testes desta fase são unitários (Prisma mockado) + um teste de integração
  HTTP do pipeline completo (auth + RBAC) numa rota real — mesma limitação já
  registrada na Fase 3: sem banco de testes isolado ainda (`10-testes.md`, 10.6).

**Bug de tooling real, encontrado e corrigido**: `packages/types` e
`packages/validation` são pacotes `"type": "module"` com um `index.ts` que
reexporta de arquivos irmãos (`export {...} from "./role"`, sem extensão).
Isso nunca tinha quebrado porque, até esta fase, tudo que o `apps/api`
importava desses pacotes era `import type` (apagado em tempo de compilação,
nunca vira um `require()` de verdade em runtime). Assim que
`apps/api/src/controllers/products` passou a importar um **valor** real
(`createProductSchema` etc.), o `nest start` (Node 24, que faz type-stripping
nativo de `.ts` e detecta sintaxe ESM automaticamente) tentou resolver
`./barcode` pelo resolvedor estrito de ESM do Node, que exige extensão de
arquivo — e quebrou com `ERR_MODULE_NOT_FOUND`. `apps/web`/Vitest nunca
sentem isso porque Next.js/Vite fazem a própria resolução de módulos, não a
do Node. Corrigido consolidando cada pacote num único `src/index.ts` sem
imports relativos internos (não custou nada — os pacotes são pequenos).
**Vale lembrar ao criar um novo pacote compartilhado**: se algo de dentro dele
for importado como valor real (não só tipo) por `apps/api`, evite barrel file
com reexport relativo entre arquivos — ou use extensão explícita `.ts` nos
imports (exige `allowImportingTsExtensions`, incompatível com o `noEmit: false`
que `apps/api` precisa pra buildar — não tentar essa rota).

## Fase 5 — Estoque

**Referências:** `04-regras-negocio.md` (seção 4.4)

- `stock_movements` como livro-razão — feito em 2026-09-02. Diferente da Fase 4
  (produtos), aqui `operation_id` **é obrigatório** no schema (desde a Fase 1) —
  então a idempotência de `docs/07-sync-engine.md` (7.2) já vale desde já, não
  é algo adiado pra Fase 9: `operationId` é gerado pelo cliente e enviado no
  payload (`POST /v1/stock/movements`, `POST /v1/stock/reconciliation`); se já
  existe um movimento com esse `operation_id`, a API retorna o resultado
  anterior em vez de reprocessar — inclusive sob corrida (dois requests com o
  mesmo `operation_id` batendo ao mesmo tempo: o segundo perde no `P2002` da
  constraint única e busca o que o primeiro já criou). Testado de verdade
  contra Postgres: reenviar a mesma operação não duplica o movimento nem
  aplica o efeito no estoque duas vezes.
- Entrada, saída, ajuste, transferência — feito:
  `apps/api/src/application/stock/stock-movements.service.ts`. `current_stock`
  em `products` nunca é um `UPDATE estoque = X` vindo do cliente (CLAUDE.md
  regra 3) — o cliente manda a ação (tipo + quantidade), o servidor calcula o
  sinal (ENTRADA/DEVOLUCAO somam, SAIDA/TRANSFERENCIA subtraem) e aplica via
  `increment` atômico dentro da mesma transação que grava o movimento.
  `AJUSTE` não é criável pelo endpoint genérico — só via
  `POST /v1/stock/reconciliation`, que recebe a contagem física e calcula a
  diferença no servidor (nunca aceita a diferença já pronta do cliente),
  conforme `docs/04-regras-negocio.md` (4.4, "Reconciliação de estoque").
  Saída que deixaria o estoque negativo é bloqueada com `409`, a menos que
  `tenant.settings.allowNegativeStock` esteja `true` (docs/04-regras-negocio.md,
  4.2). `VENDA`/`COMPRA` ficam de fora deste endpoint de propósito — são
  gerados pelos fluxos de Vendas (Fase 6) e Compras (sem entidade de pedido de
  compra ainda — lacuna já sinalizada na Fase 0), nunca criados manualmente.
- Estoque mínimo e alertas simples — feito: `GET /v1/stock/alerts` lista
  produtos com `current_stock <= minimum_stock` (limiar fixo, sem previsão —
  exatamente o "Nível MVP" do doc).
- Rotas protegidas por `stock.movement.create`/`stock.adjust`
  (`docs/05-permissoes-rbac.md`, 5.4) — testado contra Postgres real: SELLER
  (sem a permissão) recebe 403.
- **Lacuna sinalizada**: não existe permissão dedicada de "visualizar estoque"
  na matriz — `GET /stock/movements` e `GET /stock/alerts` reaproveitam
  `products.view`.
- **Lacuna sinalizada**: `TRANSFERENCIA` entre filiais só decrementa a filial
  de origem (tratada como "Saída", literal ao texto de 4.4: "transferência
  entre filiais" está listada em Saída/STOCK_OUT). O schema não tem um campo
  de filial de destino — a "chegada" na outra filial não é modelada ainda;
  registrar isso também exigiria dois movimentos (um SAIDA na origem, um
  ENTRADA no destino) ou um novo campo, decisão que não tomei sozinho porque
  é estrutural.

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
