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
- **Decisão revista em 2026-09-04**: o banco de negócio passou a rodar também no
  Postgres do próprio projeto Supabase em produção (Vercel) — motivo prático:
  ambiente de deploy serverless não tem acesso ao Postgres local via Docker, que
  só existe na máquina de dev. Dev local continua usando o Postgres via Docker
  (`infrastructure/docker/docker-compose.yml`); produção usa
  `DATABASE_URL`/`DIRECT_URL` apontando para o pooler do Supabase (`schema.prisma`
  ganhou `directUrl` — migrations exigem conexão em modo sessão, não a de
  transação usada em runtime). Migrations e seed de dev já aplicados no Supabase
  em 2026-09-04.
- RLS básico no Supabase como segunda camada de defesa — **ainda não aplicável**,
  mesmo com o banco agora rodando lá: a aplicação continua sendo a única fonte de
  isolamento por `tenant_id` (regra 4 do `CLAUDE.md`). RLS ficaria como camada
  extra de defesa, não implementado ainda — reavaliar como item futuro.
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
    A tela de Usuários e Permissões (`apps/web/app/usuarios/page.tsx`)
    **religada em 2026-09-07** — ver nota abaixo, "trabalho futuro" concluído.
  - **Verificado de ponta a ponta em navegador real (2026-09-02)**: usando o
    Playwright já presente em `tests/e2e` (spec temporário, rodado e descartado,
    nunca commitado) — redirect pra `/login` quando deslogado, mensagem de erro
    em credenciais erradas, login certo leva ao dashboard com dado real (tenant,
    nome, e-mail, role), dropdown do usuário com logout, sessão sobrevive a F5.
    Login de teste: `owner@orbixpulse.dev` / `OrbixDev123!` (ou qualquer um dos
    8 e-mails de `apps/api/prisma/seed.ts`, mesma senha).
  - **Listagem/gestão de usuários religada em 2026-09-07**: `GET /v1/users`
    (`apps/api/src/application/users/users.service.ts`) lista os usuários
    reais do tenant a partir de `user_roles`, e `PATCH /v1/users/:id/role`
    troca o papel de um usuário — ambos atrás de `users.manage`
    (OWNER/ADMIN, igual `apps/web/lib/nav-modules.ts` já restringia o menu).
    `docs/05-permissoes-rbac.md` (5.2: "OWNER — acesso total, não
    removível/limitável") é respeitado literalmente: o backend rejeita trocar
    o role de quem hoje é OWNER (`409`), e a UI nem mostra o seletor pra essa
    linha. Mudança de role é auditada em `audit_log`
    (`action: "USER_ROLE_CHANGED"`, antes/depois), conforme 5.8. Convite de
    novo usuário (criar conta no Supabase Auth) fica de fora — feature maior,
    não estava sinalizada como pendente, só a listagem estava.
    `apps/web/lib/demo-users.ts` removido. `packages/types` ganhou
    `UserStatus`/`USER_STATUSES` (não existia ainda). Testado ponta a ponta
    com Playwright real: lista os 8 usuários seedados, troca o role de SELLER
    pra STOCK, confirma persistência sobrevivendo a reload, e que a linha do
    OWNER não tem seletor. Fase 2 sem pendências.

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
- **Frontend religado em 2026-09-02** (`apps/web/app/produtos/page.tsx`):
  CRUD completo (listar com busca, criar, editar, excluir) contra
  `/v1/products` e `/v1/product-categories` de verdade — não mostra mais
  dado mock. Primeira tela do shell visual (Fase 0) a virar real. Criada a
  infraestrutura reutilizável pras próximas telas: `apps/web/lib/api/client.ts`
  (fetch autenticado com o token do Supabase) + React Query ligado
  (`@tanstack/react-query` já era dependência desde o início, nunca tinha
  sido usado — `apps/web/components/query-provider.tsx`). Estoque e Vendas
  religaram na sequência, no mesmo dia (ver Fase 5/6 abaixo) — nenhuma tela
  do shell visual usa dado mock de produto hoje; `apps/web/lib/demo-products.ts`
  foi removido. Sem UI de código de barras ainda (lookup por barcode do
  parágrafo acima segue só backend). **Bug real encontrado e corrigido**: o `DELETE` do Nest devolve
  `200` com corpo vazio (não `204`) quando o controller não retorna nada — o
  client fazia `.json()` nesse corpo vazio, estourava exceção, e a mutation
  do React Query nunca chamava `onSuccess` — a linha excluída ficava visível
  na tela mesmo com o delete tendo funcionado no banco. Corrigido lendo o
  corpo como texto antes de decidir se faz `JSON.parse`. Testado de ponta a
  ponta com Playwright: criar → aparece na lista → editar → nome atualiza →
  excluir → some da lista.

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
- **Frontend religado em 2026-09-02** (`apps/web/app/estoque/page.tsx`):
  alertas de mínimo (`GET /v1/stock/alerts`) e livro-razão de movimentações
  (`GET /v1/stock/movements`) contra a API real, mais um formulário que cobre
  os dois endpoints de escrita — movimentação manual
  (`POST /v1/stock/movements`, tipos ENTRADA/SAIDA/DEVOLUCAO/TRANSFERENCIA) e
  reconciliação por contagem física (`POST /v1/stock/reconciliation`).
  `operationId` gerado no cliente com `crypto.randomUUID()` no momento do
  submit (CLAUDE.md regra 2). `apps/web/app/estoque/mock-movements.ts` foi
  removido. **Lacuna de blueprint encontrada e resolvida sem inventar
  entidade nova**: `createStockMovementSchema`/`reconcileStockSchema` exigem
  `branchId`, mas não existia nenhuma rota que listasse as filiais do tenant
  (`docs/09-api.md` nunca documentou uma) — o frontend não tinha como
  descobrir esse id. Resolvido expondo `GET /v1/branches` (só leitura,
  reaproveita `products.view`, mesmo padrão de `product-categories`/alertas de
  estoque — não é uma entidade nova, `Branch` já existe desde a Fase 1, só
  faltava um jeito de listá-la). Ver `docs/09-api.md` (9.4) e
  `apps/api/src/controllers/branches/`. Frontend usa a primeira filial ativa
  automaticamente (tenant de desenvolvimento só tem uma, seedada) — sem
  seletor de filial na UI ainda, porque a matriz de permissões/RBAC não define
  nada sobre "usuário atrelado a uma filial específica" (fica para quando
  multi-filial por usuário for modelado). Ver `docs/09-api.md` (9.4). Testado
  de ponta a ponta com Playwright: login → alertas/movimentações reais
  carregam → registrar movimentação ENTRADA → aparece no topo da lista com o
  motivo informado.

## Fase 6 — PDV e vendas (ainda online-only nesta fase)

**Referências:** `04-regras-negocio.md` (seções 4.2, 4.3, 4.5)

- Fluxo completo de venda → estoque → financeiro, síncrono, online — feito em
  2026-09-02. `apps/api/src/application/sales/sales.service.ts`:
  `POST /v1/sales` recebe a venda já completa (itens + pagamentos) numa
  chamada só — sem fluxo de carrinho em rascunho. Tudo atômico numa única
  transação: `sales` + `sale_items` + `payments` + um `stock_movements` tipo
  `VENDA` por item (via `StockMovementsService.applySystemMovement`, reusando
  a mesma checagem de estoque negativo da Fase 5). `Sale.operation_id` é
  obrigatório desde a Fase 1 — idempotência real, testada de ponta a ponta
  (reenviar a mesma venda não duplica nem re-debita o estoque). Soma dos
  `payments` precisa bater exatamente com o total da venda, senão `400`.
  "Financeiro: + valor no fluxo de caixa da sessão" (4.2) não gerou nenhuma
  tabela nova — é só o `payments` da venda associado ao `cash_register_id`,
  usado depois no fechamento do caixa (não precisa de `finance_entries`,
  que é outra coisa: contas a pagar/receber, Fase 7).
- Abertura/fechamento de caixa — feito:
  `apps/api/src/application/sales/cash-registers.service.ts`.
  `POST /v1/cash-registers/open` bloqueia um segundo caixa `OPEN` do mesmo
  usuário (regra de negócio, não só UI — docs/04-regras-negocio.md, 4.5).
  `POST /v1/cash-registers/:id/close` calcula `expected_amount` (abertura +
  pagamentos `CASH` de vendas não-canceladas dessa sessão) e `difference`;
  fechar um caixa já `CLOSED` é idempotente por estado (o schema só tem um
  `operation_id`, da abertura — fechar não tem um novo, então idempotência
  aqui é "se já fechado, devolve como está" em vez de checar operation_id).
  Testado ponta a ponta: abrir → vender → cancelar → fechar, e o valor
  esperado excluiu corretamente a venda cancelada (diferença = 0).
  **Lacuna sinalizada**: a doc menciona "sangrias" na fórmula do valor
  esperado, mas não existe entidade de saque de caixa no schema — não
  inventei uma tabela nova sozinho; o cálculo atual não subtrai sangria
  nenhuma (não existe o que subtrair ainda).
- Cancelamento de venda com validação de permissão — feito:
  nunca é um `DELETE` — `Sale.status` vira `CANCELLED`, estoque estorna via
  `stock_movements` tipo `DEVOLUCAO` por item (não edita o movimento `VENDA`
  original). Bloqueia se já existe `fiscal_document` `AUTHORIZED` pra essa
  venda (nunca dispara hoje — Fase 10 não existe — mas fica correto pra
  quando existir). **Implementei a política de tempo do MANAGER que ficou
  sinalizada como pendente desde a Fase 3** (`CanPerform(user, "sales.cancel",
  { sale })`, docs/05-permissoes-rbac.md, 5.5): OWNER/ADMIN cancelam sem
  restrição (RBAC já garante isso); MANAGER só dentro de
  `tenant.settings.saleCancelWindowHours` — **sem configuração, fica
  bloqueado por padrão** (não inventei um número de horas default). Essa
  checagem de janela vive em `SalesService.cancel()`, não em
  `CanPerformService`/`PermissionGuard` — decisão pragmática pra não reabrir o
  guard genérico pra aceitar contexto de domínio (o `PermissionGuard` só
  conhece a string de permissão estática do decorator, não o registro da
  venda). Motivo do cancelamento é obrigatório e vai pro `audit_log`
  (`action: "SALE_CANCELLED"`) — isso é parte do próprio fluxo de
  cancelamento (docs/04-regras-negocio.md, 4.3), não só da Fase 12.
  Testado ponta a ponta: cancelar reverte o estoque, cancelar de novo é
  idempotente (não duplica o estorno), CASHIER sem `sales.cancel` recebe 403.
- **Lacuna sinalizada**: `sales`/`GET /sales` reaproveita a permissão
  `sales.create` pra leitura (sem `sales.view` dedicado na matriz, mesmo
  padrão de Produtos/Estoque).
- **Escopo intencionalmente fora desta fase**: emissão fiscal (Fase 10, `sale`
  não gera `fiscal_document`), `finance_entries` (Fase 7), e qualquer coisa de
  sync/offline (`device_id`/`operation_id` são só campos preenchidos, sem fila
  de sincronização real — Fase 9). Sem testes de integração HTTP dedicados
  pra Vendas/Caixa desta vez (os 3 já feitos em fases anteriores já provam o
  pipeline de guards funciona; a cobertura aqui ficou nos serviços — 225
  testes no total em `apps/api`).
- **Frontend religado em 2026-09-02** (`apps/web/app/vendas/page.tsx`):
  PDV real — se o usuário não tem caixa `OPEN` (`GET /v1/cash-registers/current`),
  mostra só o formulário de abertura; com caixa aberto, mostra o grid de
  produtos (`GET /v1/products`) + carrinho + `POST /v1/sales` de verdade, e
  um botão "Fechar caixa" (`POST /v1/cash-registers/:id/close`). Catálogo
  mock (`DEMO_PRODUCTS`) removido. **Mesma lacuna de filial da Fase 5**
  (`GET /v1/branches`, primeira filial ativa usada automaticamente) — e uma
  nova, do mesmo tipo: `createSaleSchema` também exige `deviceId`, e
  `docs/06-offline-first.md`/`docs/07-sync-engine.md` nunca definiram um fluxo
  de pareamento de device (só existe o device seedado manualmente por tenant,
  Fase 1). Resolvido do mesmo jeito — `GET /v1/devices` (só leitura,
  `products.view` reaproveitada, `apps/api/src/controllers/branches/devices.controller.ts`)
  listando devices `ACTIVE` do tenant, e o frontend usa o primeiro
  automaticamente. Fluxo real de pareamento/registro de device (o usuário
  escolher/nomear o device deste navegador) fica para quando o offline-first
  de verdade precisar disso — não inventei esse fluxo agora. Testado de ponta
  a ponta com Playwright: login → abrir caixa com valor real → adicionar
  produto ao carrinho → finalizar venda → `POST /v1/sales` retorna sucesso e o
  carrinho zera (a venda gerada aparece no livro-razão de estoque como `VENDA`,
  visível na tela de Estoque religada acima).

## Fase 7 — Financeiro

**Referências:** `04-regras-negocio.md` (seção 4.6)

- Contas a pagar/receber — feito em 2026-09-02.
  `apps/api/src/application/finance/finance-entries.service.ts` +
  `finance-categories.service.ts`. Lançamento tem status
  `PENDING → PAID | CANCELLED`; marcar como pago e cancelar são idempotentes
  por estado (repetir a ação num lançamento já `PAID`/`CANCELLED` devolve
  como está, não reprocessa). Editar um lançamento `PAID`/`CANCELLED` é
  bloqueado. `operation_id` é opcional no schema (Fase 1) — igual Produtos
  (Fase 4), esta fase é online-only, sem fila de sync ainda (Fase 9).
  **Decisão de RBAC que fugiu do padrão das fases anteriores**: a matriz
  (`05-permissoes-rbac.md`, 5.4) só tem permissões de LEITURA de financeiro
  (`finance.view`/`view_profit`/`export`) — nenhuma de escrita. Reaproveitar
  `finance.view` pros endpoints de criar/editar/pagar/cancelar lançamento
  daria a ACCOUNTANT (papel só-leitura, geralmente externo — 05, 5.2) acesso
  de escrita a dados financeiros, o que é diferente das lacunas de
  Produtos/Estoque (lá o conjunto de roles já batia). Por isso, diferente das
  fases anteriores, **adicionei uma permissão nova** (`finance.manage`,
  mesmos roles que `finance.view_profit`: OWNER/ADMIN/MANAGER/FINANCE) em vez
  de só reaproveitar uma existente — documentado em
  `default-role-permissions.ts` e re-seedado (62 → 66 `role_permissions`).
  Testado contra Postgres real: ACCOUNTANT tentando criar lançamento recebe
  403 exatamente como esperado.
- Fluxo de caixa filtrável por período — feito:
  `GET /v1/finance/cash-flow?from=&to=`. Não é uma tabela própria
  (docs/04-regras-negocio.md, 4.6) — agrega `payments` de vendas não
  canceladas + `finance_entries` `RECEIVABLE`/`PAYABLE` pagos no período.
  Permissão `finance.view` (CASHIER "limitado" da Fase 3 mantém acesso aqui —
  ver lacuna sinalizada abaixo).
- DRE básico — feito: `GET /v1/finance/dre?from=&to=` calcula a cascata do
  doc (Receita Bruta → Impostos → Receita Líquida → CMV → Lucro Bruto →
  Despesas Operacionais → Lucro Operacional). **Resolvi uma contradição real
  entre dois documentos do próprio blueprint** ao decidir a permissão desta
  rota: `docs/10-testes.md` (10.3) diz literalmente "Given: usuário com role
  CASHIER, When: GET /finance/dre, Then: 403", mas `05-permissoes-rbac.md`
  (5.4) concede `finance.view` (ainda que "limitado") pro CASHIER. Usei
  `finance.view_profit` (que CASHIER não tem) em vez de `finance.view` pra
  essa rota especificamente — DRE mostra lucro, então é a permissão
  semanticamente certa, e resolve a contradição exatamente como o próprio
  doc de testes exige. Testado contra Postgres real: CASHIER recebe 403 em
  `/finance/dre` mas 200 em `/finance/cash-flow`; venda cancelada
  (Fase 6) corretamente não aparece na receita; venda válida aparece com
  CMV calculado certo a partir do `cost_price` do produto.
  **Duas simplificações sinalizadas** (comentário em `finance-reports.service.ts`):
  - "Impostos" sempre 0 — a doc só fala em deduzir "quando aplicável, via
    dados fiscais" (Fase 10, não existe).
  - CMV usa o `cost_price` **atual** do produto, não o valor no momento da
    venda — `sale_items` não guarda um snapshot de custo (só `unit_price`,
    que é preço de venda). Se o custo mudar depois, o DRE de períodos
    passados muda junto — é uma aproximação, não o valor histórico exato.
    Corrigir isso direito exigiria um campo novo em `sale_items`
    (`cost_price_at_sale` ou similar), decisão estrutural que não tomei
    sozinho.
- **Lacuna sinalizada, não resolvida**: o CASHIER "limitado" de
  `finance.view` (Fase 3: "só a sessão de caixa aberta própria") continua
  sem filtro de dado real em `/finance/cash-flow` — CASHIER vê o fluxo de
  caixa agregado do tenant inteiro no período, não só a própria sessão.
  Implementar esse filtro de verdade exigiria decidir o que "sessão própria"
  significa pra um endpoint agregado por período (não por `cash_register_id`
  específico), o que não estava claro o suficiente pra decidir sozinho.
- **Fora de escopo de propósito**: exportação (`finance.export` existe na
  matriz, mas nenhuma feature desta fase pediu um endpoint de export/CSV —
  igual `audit.view`, existe a permissão sem uma feature ainda amarrada).

## Fase 8 — Offline-first (infraestrutura local)

**Referências:** `06-offline-first.md`

Primeira fase majoritariamente **frontend** (`apps/web`) desde a Fase 2 — as
Fases 3-7 foram todas backend, com as telas ainda em mock.

- Service Worker + PWA instalável — feito em 2026-09-02.
  `app/manifest.ts` (convenção nativa do Next.js, serve
  `/manifest.webmanifest`), `app/icon.svg` (ícone da marca — mesmo gradiente
  de `bg-brand-gradient` já usado no sidebar/login), Service Worker via
  Serwist (`serwist`/`@serwist/next`) configurado em `app/sw.ts` +
  `next.config.mjs`, registrado no client via
  `components/service-worker-register.tsx`. **Desligado em dev de propósito**
  (`disable: NODE_ENV === "development"` — recarregar o SW a cada mudança de
  código atrapalharia o hot reload); só existe de verdade em build de
  produção. Testado com `pnpm build && pnpm start` + Playwright real:
  `navigator.serviceWorker.ready` resolve com `active: true`.
  **Bug real de tooling, achado e contornado**: a abordagem inicial (ícone
  gerado via `next/og`/`ImageResponse`, com `generateImageMetadata` pra
  192px/512px) quebrava em runtime nesta máquina (Windows + pnpm) — bug
  interno do Next.js 14.2.x (`next/dist/server/og/image-response.js`) que
  tenta carregar a fonte padrão do pacote (mesmo sem texto no ícone, mesmo
  passando `fonts: []`) e monta uma `file://` URL inválida a partir do
  caminho aninhado do pnpm (`node_modules/.pnpm/...`). Não é um bug do meu
  código — é do bundle interno do Next. Contornado trocando pra um
  `icon.svg` estático (convenção nativa do Next, não passa pelo código do
  `next/og`). Efeito colateral: sem `apple-icon` (Safari não aceita SVG
  nessa tag) — iOS cai no comportamento padrão (screenshot) ao instalar, uma
  limitação real, não escondida.
- Dexie/IndexedDB com o subconjunto de entidades necessário — feito:
  `apps/web/lib/db/schema.ts`, exatamente as 10 tabelas de
  `docs/06-offline-first.md` (6.5): products, customers, suppliers, sales,
  sale_items, stock_movements, payments, cash_registers, sync_queue,
  app_metadata. `sync_queue` fica sempre vazia até o Sync Engine real
  (Fase 9) escrever operações nela a partir de ações offline — não
  implementado ainda, e o indicador de status reflete isso honestamente (não
  finge uma fila que não existe).
- Sincronização seletiva por permissão — feito:
  `apps/web/lib/sync/hydrate.ts`. **Decisão importante**: o frontend não
  duplica a lógica de "quem pode ver o quê" — só chama os endpoints normais
  (os mesmos das Fases 4-7) com o token do usuário, e deixa o `PermissionGuard`
  do backend decidir. Um 403 numa entidade só significa que ela não entra no
  banco local, silenciosamente — é assim que "seletividade por permissão"
  funciona sem violar CLAUDE.md regra 1 (nada de regra de negócio crítica no
  frontend). Disparada uma vez por login (`SyncProvider`, hook em
  `useSession().status === "authenticated"`), e o banco local é **limpo por
  completo no logout** (`clearLocalDatabase()`) — decisão de segurança: um
  dispositivo compartilhado (PC do caixa) não pode manter dado de negócio do
  usuário anterior visível depois da troca de conta, isso não está escrito
  literalmente no doc mas segue o princípio de 6.4 ("reduz superfície de
  exposição de dados sensíveis").
  - Testado ponta a ponta com login real: hidratação populou 2 produtos, 2
    vendas, 6 movimentos de estoque, 1 caixa — dados reais das Fases 4-6.
    Logout confirmado limpando tudo (produtos: 0 depois).
  - **Só as entidades que já têm endpoint de leitura** (produtos, vendas,
    movimentos de estoque, caixa atual) são hidratadas. `customers`/`suppliers`
    ficam com tabela vazia — `suppliers` ganhou CRUD em 2026-09-07 (ver nota
    abaixo), mas a hidratação seletiva desta fase não foi re-executada pra
    incluir o endpoint novo (fora de escopo desta atualização pontual).
    `customers` continua sem controller nenhum, sinalizado, não esquecido.

**Nota (2026-09-07) — Fornecedores religado (Compras), pedidos de compra
continua bloqueado.** `Supplier` existe no schema desde a Fase 1, mas sem
CRUD implementado em fase nenhuma — mesmo tipo de pendência sinalizada que
"listar usuários" era pra Fase 2, não uma fase nova. `GET/POST/PATCH/DELETE
/v1/suppliers` (`apps/api/src/application/suppliers/`), sem permissão
dedicada em `docs/05-permissoes-rbac.md` (5.4) — reaproveita
`products.view`/`update`/`delete`, mesmo padrão de `product-categories`
(Fase 4): fornecedor é sub-recurso do catálogo (`products.supplier_id`).
`apps/web/app/compras/page.tsx`: CRUD completo (criar, editar, excluir com
soft delete) contra `/v1/suppliers` real, mesmo padrão de formulário da
tela de Produtos. **"Pedidos de compra" continua exatamente como estava**
— não existe entidade de pedido de compra no schema, lacuna estrutural que
não foi resolvida aqui (só o bloco de Fornecedores saiu do mock). Testado
ponta a ponta com Playwright real: criar fornecedor → editar (inativar) →
persiste após reload → excluir → some da lista → aviso de "pedidos de
compra" continua visível, honesto, não virou dado fake. 276 testes de
`apps/api` agora (+4 de `SuppliersService`).
- Indicador de status (`docs/06-offline-first.md`, 6.6) — o
  `SyncStatusIndicator` que já existia como mock (Fase 0) foi religado pro
  estado real (`SyncProvider`): 🟢/🟠/🔴 refletem `navigator.onLine` de
  verdade + a contagem real (hoje sempre 0) da fila local.
- **Fora de escopo de propósito, fica pra Fase 9 (Sync Engine)**: nenhuma
  tela foi religada pra LER do Dexie em vez do mock — Produtos/Estoque/
  Vendas/Financeiro continuam mostrando dado mock na UI (a hidratação
  funciona e prova o mecanismo, mas nenhuma tela consome o banco local
  ainda). Escrita offline (criar venda sem internet, fila de operações
  pendentes, retry) também não existe — isso é literalmente o que a Fase 9
  constrói (`POST /sync/batch`, idempotência do lado do sync, resolução de
  conflito).

## Fase 9 — Sync Engine

**Referências:** `07-sync-engine.md`, `09-api.md` (seção 9.5)

- Endpoint `POST /sync/batch` — feito em 2026-09-02.
  `apps/api/src/application/sync/sync.service.ts`. Desenho deliberado: o
  dispatcher **reaproveita** `SalesService`, `StockMovementsService` e
  `CashRegistersService` (Fases 5 e 6) em vez de duplicar a lógica de
  negócio — cada operação do lote vira uma chamada pro serviço de domínio
  correto (`SALE_CREATED` → `SalesService.create`,
  `STOCK_MOVEMENT_CREATED` → `StockMovementsService.createMovement`, etc.).
  Processadas **sequencialmente** dentro do lote (docs/07-sync-engine.md,
  7.4: "respeitando dependências, ex: SALE_CREATED antes de PAYMENT_CREATED
  daquela venda"), nunca em paralelo. Permissão é checada **por operação**
  (`CanPerformService`, não `@RequirePermission` estático na rota) — uma
  operação sem permissão vira `REJECTED` sem derrubar as outras do lote
  (docs/09-api.md, 9.5), testado contra Postgres real (SELLER sem
  `stock.movement.create` recebeu `REJECTED` numa operação, o resto do lote
  seguiria normal).
- Idempotência via `operation_id` — feito: `sync_operations` é o ledger de
  idempotência do lote em si (docs/07-sync-engine.md, 7.2/7.6 — "operation_id
  já existe em sync_operations? SIM → retorna resultado anterior"), **além**
  da idempotência que cada entidade já tinha na própria tabela desde as
  Fases 5/6 (`sales.operation_id`, `stock_movements.operation_id`,
  `cash_registers.operation_id`). Reenviar o mesmo `operation_id` retorna
  `ALREADY_PROCESSED` sem reprocessar — testado contra Postgres real
  (reenviar o mesmo lote não duplicou o efeito no estoque).
- Estratégia de conflito por entidade (tabela 7.7) — **feito só para as
  entidades "aditiva"/"bloqueio de negócio"**: `stock_movements`, `sales`,
  `sales.status` (cancelamento), `cash_registers`. Essas são exatamente as
  que já tinham idempotência real desde as Fases 5/6 e são a "parte
  operacional" que docs/06-offline-first.md (6.7) exige tolerar horas/dias
  offline. **LWW de `products.price`/`products.name`/`customers` (7.7) fica
  de fora desta fase, sinalizado, não escondido**: implementar de verdade
  exigiria rastrear o `operation_id`/timestamp do último edit por campo — o
  schema atual não guarda isso em lugar nenhum consultável (nem em
  `Product`, nem em `sync_operations`, que não tem uma coluna `entity_id`
  pra localizar "qual foi a última operação que tocou este produto"). Isso é
  uma decisão estrutural (schema novo ou campo novo) que não tomei sozinho.
- Indicador de status de sincronização na UI — já religado na Fase 8
  (`SyncStatusIndicator` + `SyncProvider`, `apps/web/lib/sync`) pro estado
  real de `navigator.onLine` + fila local do Dexie. `GET /v1/sync/status`
  (backend, feito nesta fase) expõe as contagens por status
  (`pending`/`applied`/`rejected`/`conflict`) — a UI ainda não consome esse
  endpoint especificamente (só reflete o estado local do dispositivo), fica
  como trabalho futuro se o painel técnico de 7.8 for construído.
- **Bug real de tooling, achado e corrigido**: `describeError()` usava
  `error instanceof ZodError` pra formatar a mensagem de payload inválido —
  funcionava nos testes unitários, mas em runtime contra o Postgres real
  sempre caía em "erro_inesperado". Causa: risco de dual-instância entre o
  `zod` de `apps/api` e o de `packages/validation` dependendo de como o pnpm
  resolve os ranges de versão (mesmo problema em espírito do que já
  aconteceu na Fase 4, mas dessa vez com `instanceof` cross-package, não
  resolução de módulo). Corrigido checando `error.name === "ZodError"` e a
  forma do objeto (`issues` array) como fallback, em vez de confiar só em
  `instanceof` — mais robusto a esse tipo de problema de identidade de
  classe entre pacotes.
- **Fora de escopo desta fase, sinalizado**: nenhuma tela do frontend foi
  religada para de fato ENVIAR um lote pra `/sync/batch` a partir da fila
  local (`sync_queue`) do Dexie — a fila continua vazia porque nenhuma ação
  de UI grava nela ainda (todas as telas de negócio continuam mostrando
  mock, não escrevendo no Dexie). O endpoint existe, é testado e correto,
  mas o "Sync Client" do dispositivo (docs/06-offline-first.md, 6.2) que
  consome essa fila e chama este endpoint não foi construído — isso exigiria
  religar cada tela de negócio pra escrever no Dexie primeiro, escopo bem
  maior que esta fase sozinha.

**Esta é a fase mais crítica tecnicamente — não deve ser paralelizada com outras fases de negócio.**

## Fase 10 — Fiscal

**Referências:** `08-fiscal.md`

**Status em 2026-09-07: bloqueada, aguardando decisão do usuário.** Não é
falta de trabalho — é a primeira linha desta fase (escolha do provedor), que
o próprio `docs/08-fiscal.md` diz explicitamente ser "decisão a ser tomada
na Fase correspondente do roadmap", e o `CLAUDE.md` proíbe decidir sozinho
por envolver conta/credenciais reais de serviço terceiro. Uma comparação de
custo-benefício entre Focus NFe, eNotas e Tecnospeed/PlugNotas foi feita
nesta data (cobertura, preço, reputação/SLA) e a recomendação foi Focus NFe
(plano de varejo dedicado, preço público, melhor encaixe pro MVP de PDV) —
usuário respondeu "não decidi ainda" duas vezes. **Não implementar nada
desta fase até o usuário confirmar o provedor.** Enquanto isso, o usuário
optou por religar as telas mock restantes que não dependiam dessa decisão
(ver notas de Fase 11 abaixo, e Compras/Financeiro/Relatórios/Usuários/
Configurações também religados fora desta fase).

- Escolha final do provedor (Focus NFe / eNotas / Tecnospeed / NFe.io) após avaliação de cobertura/preço/SLA
- Integração de emissão (NFC-e como prioridade para MVP de varejo)
- Fluxo de status (`PENDING_ISSUANCE → PROCESSING → AUTHORIZED/REJECTED`)
- Cancelamento fiscal

## Fase 11 — Relatórios e Dashboard Executivo

**Referências:** `01-visao-produto.md` (seção 1.3), `05-permissoes-rbac.md`

Implementada em 2026-09-07, **fora de ordem** — Fase 10 (Fiscal) segue pendente da
escolha de provedor pelo usuário (decisão estrutural, não posso tomar sozinho); o
usuário optou explicitamente por avançar pra Fase 11 nesse meio tempo. Nada aqui
depende de dado fiscal, então não há lacuna técnica real por pular a ordem — só a
sinalização exigida pelo `CLAUDE.md` (regra 6).

- Painel executivo (dono): faturamento, lucro, margem, top produtos, estoque
  crítico — feito. Endpoint único `GET /v1/reports/dashboard?from=&to=`
  (`apps/api/src/application/reports/reports.service.ts`), protegido por
  `reports.executive.view` (já seedada desde a Fase 3, nunca consumida até
  agora). Reaproveita `FinanceReportsService.dre` (Fase 7) pra
  faturamento/lucro/margem e `StockMovementsService.alerts` (Fase 5) pra
  estoque crítico, em vez de duplicar essa lógica — só agrega o que ainda não
  existia em lugar nenhum: contagem de vendas, ticket médio, ranking dos 5
  produtos mais vendidos por quantidade (soma de `sale_items.total`, que já é
  o valor líquido da linha) e contagem de caixas `OPEN` no tenant agora.
  `apps/web/components/home/executive-dashboard.tsx` (home do OWNER/ADMIN) e
  `apps/web/app/relatorios/page.tsx` (com seletor de período, tabela de top
  produtos, tabela de estoque crítico reaproveitando `GET /v1/stock/alerts`,
  e detalhamento do DRE reaproveitando `GET /v1/finance/dre`) consomem esse
  endpoint. Cada seção degrada independentemente em caso de `403` (mensagem
  "Sem permissão: X" em vez de crashar a página) — necessário porque o menu de
  navegação (`apps/web/lib/nav-modules.ts`, decidido na Fase 0/shell visual)
  libera `/relatorios` pra FINANCE/ACCOUNTANT, mas a matriz de permissões
  (5.4) só concede `reports.executive.view` a OWNER/ADMIN/MANAGER — mismatch
  pré-existente do shell visual, não corrigido aqui (mudar o menu ou a matriz
  seria uma decisão de escopo à parte). Testado ponta a ponta com Playwright
  real: venda registrada agora aparece com valor real no faturamento (não
  mock), MANAGER vê o mesmo endpoint filtrado em "hoje", ACCOUNTANT vê os
  avisos de permissão em cada seção sem crash.
- Painel operacional (funcionário): atalhos de PDV/estoque — feito, parcial.
  `apps/web/components/home/operational-dashboard.tsx` (home do MANAGER)
  virou real: "Vendas hoje" e "Produtos com estoque crítico" reaproveitam o
  mesmo endpoint acima (filtrado no dia); "Caixas abertos" usa a contagem
  nova (`openCashRegistersCount`, ponto-no-tempo, não filtrado por período).
  O card mock "Pedidos de compra pendentes" foi **removido**, não substituído
  por dado real — não existe entidade de pedido de compra no schema (mesma
  lacuna já sinalizada na Fase 0/tela de Compras).
- **Fora de escopo, sinalizado**: "Giro de estoque" (risco de ruptura,
  sugestão de compra) do card da tela de Relatórios do shell visual (Fase 0)
  não foi implementado — é `Pós-MVP` explícito
  ("Inteligência de estoque: previsão de ruptura, sugestão de compra") no
  fim deste roadmap, não faz parte da Fase 11. "Vendas por período" com
  comparação entre períodos (também um card do shell visual) também não foi
  construído — não está no texto da Fase 11 (só "faturamento, lucro, margem,
  top produtos, estoque crítico"), ficaria pra uma iteração futura se o
  usuário pedir. Relatório de compras (fornecedores, pedidos) segue fora,
  mesma lacuna estrutural de sempre.

**Nota (2026-09-07) — Configurações religada, não é uma fase nova.** A tela
`apps/web/app/configuracoes/page.tsx` (mock desde a Fase 0) tinha três blocos:
"Dados da empresa", "Integração fiscal" e "Dispositivos registrados", com o
próprio botão dizendo "Configuração real chega nas Fases 2 e 10".
- **Dados da empresa** (Fase 2/multi-tenant): `GET /v1/tenants/me` — feito,
  exibição só-leitura de nome/CNPJ/plano/status reais.
- **Configurações operacionais** (nova, mas não é fase nova — expõe as duas
  únicas chaves de `tenant.settings` já lidas em produção desde as Fases 5/6
  e nunca configuráveis por tela nenhuma): `allowNegativeStock`
  (`docs/04-regras-negocio.md`, 4.2) e `saleCancelWindowHours`
  (`docs/05-permissoes-rbac.md`, 5.5) — `PATCH /v1/tenants/me/settings`,
  merge parcial preservando outras chaves futuras do JSON. Ambas atrás de
  `settings.manage` (OWNER/ADMIN, bate com `nav-modules.ts`).
- **Integração fiscal**: continua bloqueada, mensagem explícita apontando pra
  Fase 10 (escolha de provedor pendente) em vez de inputs `disabled` com
  dado fake.
- **Dispositivos registrados**: `GET /v1/devices` (existia desde a Fase 6, só
  devices `ACTIVE`) ganhou `?includeInactive=true` opcional — o uso original
  (Vendas/Estoque escolherem device automaticamente) continua vendo só
  `ACTIVE` por padrão, sem mudança de comportamento.
- **Bug real encontrado e corrigido durante a implementação**: a primeira
  versão sincronizava o formulário via `useEffect` depois que
  `GET /v1/tenants/me` resolvia — se o usuário interagisse com o checkbox
  bem no meio do carregamento inicial, o efeito rodava logo em seguida e
  sobrescrevia a interação com o valor antigo do servidor (Playwright pegou
  isso: salvar `saleCancelWindowHours=48` funcionou, mas o toggle de
  `allowNegativeStock` voltava pro valor antigo após reload). Corrigido
  extraindo `OperationalSettingsForm` como componente próprio que inicializa
  `useState` direto dos props (só monta depois que `tenant` existe) — sem
  `useEffect` nenhum, elimina a janela de corrida por construção.
  `apps/web/app/configuracoes/mock-devices.ts` removido.

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
