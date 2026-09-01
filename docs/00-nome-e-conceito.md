# 00 — Nome e Conceito

## Nome

**Orbix Pulse**

- **Orbix**: marca-mãe do ecossistema (órbita, ecossistema de inovações).
- **Pulse**: o pulso, o batimento — remete diretamente ao diferencial central do produto: o sistema continua "vivo" e operando mesmo quando a conexão com a internet é interrompida.

## Tagline

> "O coração do seu negócio continua batendo, mesmo offline."

Variações para uso em diferentes contextos:
- Institucional: "Orbix Pulse — gestão que nunca para."
- Comercial/vendas: "Venda com ou sem internet. O Orbix Pulse continua."
- Técnico (para devs/parceiros): "Offline-first ERP, cloud-synced by design."

## Conceito central do produto

Orbix Pulse não é "mais um sistema de PDV e estoque". É um **ERP operacional offline-first**, ou seja:

- O dispositivo (PC do caixa, tablet, celular) é a unidade de trabalho primária.
- A nuvem (Supabase/PostgreSQL) é a fonte de verdade centralizada e o ponto de sincronização, relatórios consolidados e inteligência.
- O usuário nunca deveria precisar "saber" que está offline — a experiência de uso é contínua.

## Pilares do produto (usar como critério de decisão em qualquer dúvida futura)

1. **Continuidade operacional acima de tudo.** Se uma decisão técnica ameaça a operação continuar funcionando offline, ela é revisada.
2. **Nenhuma regra crítica de negócio no frontend.** Toda decisão sensível (permissão, cálculo fiscal, cancelamento) é validada no backend.
3. **Simplicidade de uso para quem opera o caixa.** Complexidade arquitetural é aceitável; complexidade de uso, não.
4. **Dado é auditável.** Toda alteração relevante (estoque, preço, cancelamento) deixa rastro.
5. **Fiscal é responsabilidade de especialista.** Não reinventamos comunicação com SEFAZ — integramos com quem já resolve isso bem.

## Identidade visual (diretrizes iniciais, não obrigatórias)

- Tom visual: tecnológico, mas acessível — não "corporativo frio".
- Cor sugerida como âncora: tons de azul/roxo profundo (órbita/espaço) combinados com um verde-pulso ou âmbar para indicadores de status (online/sincronizando/offline), já que esses indicadores são um elemento central da UI (ver `06-offline-first.md`).
- Ícone/símbolo: um "pulso" (linha de batimento) dentro de uma órbita — reforça nome e conceito ao mesmo tempo.
