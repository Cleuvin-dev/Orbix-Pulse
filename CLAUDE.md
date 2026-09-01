# CLAUDE.md — Regras para o Claude Code neste repositório

Este arquivo é lido automaticamente pelo Claude Code. Ele define regras que **nunca devem ser violadas** durante o desenvolvimento do Orbix Pulse, independentemente do prompt específico de cada tarefa.

## Contexto do projeto

Orbix Pulse é um ERP/PDV Web, offline-first, multi-tenant. O blueprint completo está em `/docs`. Leia o documento relevante em `/docs` **antes** de implementar qualquer funcionalidade relacionada a ele.

## Regras inegociáveis

1. **Nenhuma regra de negócio crítica no frontend.** Validação de permissão, cálculo financeiro, regra de cancelamento — tudo isso vive no backend (`apps/api`). O frontend pode replicar validação por UX, mas o backend é sempre a fonte de verdade.

2. **Toda operação sincronizável carrega `operation_id` único, gerado na criação, não no envio.** Nunca implemente uma rota de escrita relacionada a venda, estoque, caixa ou financeiro sem seguir o padrão de idempotência descrito em `docs/07-sync-engine.md`.

3. **Nunca sincronize estado, sincronize eventos.** Se você perceber que está prestes a implementar um `UPDATE estoque = X` vindo diretamente de um dispositivo, pare — a forma correta é um `stock_movements` (evento), conforme `docs/03-modelo-dados.md` e `docs/04-regras-negocio.md`.

4. **Toda tabela de negócio tem `tenant_id` obrigatório, e toda query filtra por ele.** Nunca escreva uma query que dependa apenas de RLS para isolamento — a aplicação também filtra explicitamente.

5. **Fiscal é integração externa, não implementação própria.** Não implemente comunicação com SEFAZ. Toda emissão fiscal passa pelo provedor terceirizado definido em `docs/08-fiscal.md`.

6. **Não implemente uma fase fora de ordem.** Siga `docs/12-roadmap-fases.md`. Se uma tarefa pedida depende de uma fase anterior não implementada, avise antes de prosseguir.

7. **Toda funcionalidade de negócio vem com teste.** Não considere uma implementação completa sem o teste correspondente, conforme `docs/10-testes.md`.

8. **Exclusão é sempre lógica (`deleted_at`), nunca física**, em qualquer entidade de negócio.

9. **Valores monetários são inteiros em centavos**, nunca float.

10. **Se uma decisão deste blueprint precisar mudar durante a implementação**, atualize o `.md` correspondente em `/docs` **antes ou junto** da mudança de código — o blueprint não pode ficar desatualizado em relação ao sistema real.

## Ordem de leitura recomendada ao iniciar qualquer tarefa

1. `docs/02-arquitetura.md` — se a tarefa envolve estrutura/stack
2. `docs/03-modelo-dados.md` — se envolve entidades/banco
3. `docs/04-regras-negocio.md` — se envolve fluxo de venda/estoque/financeiro
4. `docs/05-permissoes-rbac.md` — se envolve autorização
5. `docs/06-offline-first.md` e `docs/07-sync-engine.md` — se envolve qualquer coisa client-side/sincronização
6. `docs/08-fiscal.md` — se envolve emissão de documento fiscal

## O que fazer se algo não estiver definido no blueprint

Não improvise uma decisão arquitetural relevante silenciosamente. Sinalize a lacuna explicitamente na resposta, proponha uma opção alinhada aos princípios do documento `docs/00-nome-e-conceito.md` (seção "pilares do produto"), e aguarde confirmação antes de seguir, quando a decisão for estrutural (ex: nova entidade de banco, novo padrão de sincronização). Para decisões de implementação de baixo nível (nome de variável, organização de pasta interna), pode prosseguir com bom senso.
