# 08 — Fiscal (via serviço terceirizado)

## 8.1 Decisão arquitetural

**O Orbix Pulse não implementa o protocolo de comunicação com a SEFAZ diretamente.** Emissão fiscal no Brasil (NF-e, NFC-e, NFS-e) envolve certificado digital, assinatura, comunicação por estado/município, regras de contingência específicas por UF, e manutenção constante por mudanças de layout — é, na prática, um projeto à parte, com risco de compliance alto se malfeito.

Em vez disso, o Orbix Pulse **orquestra** a emissão fiscal através de um serviço terceirizado especializado, consumido via API. Candidatos avaliados: **Focus NFe, eNotas, Tecnospeed, NFe.io** (a escolha final deve considerar cobertura de estados/municípios necessários, SLA, preço por documento emitido, e qualidade de documentação da API — decisão a ser tomada na Fase correspondente do roadmap, não neste documento).

## 8.2 O que o Orbix Pulse é responsável por fazer

- Coletar os dados da venda/documento a ser emitido.
- Chamar a API do provedor fiscal escolhido.
- Armazenar a referência ao documento gerado (`fiscal_documents`, ver `03-modelo-dados.md`).
- Tratar o retorno (autorizado, rejeitado, em processamento) e refletir isso na UI.
- Disponibilizar o PDF/DANFE e XML para impressão ou envio por e-mail.
- Lidar com o cenário offline (ver 8.4).

## 8.3 O que o Orbix Pulse **não** é responsável por fazer

- Comunicação direta com SEFAZ.
- Geração/validação de assinatura digital com certificado A1/A3 (o provedor cuida disso).
- Manutenção de regras fiscais por estado/município (o provedor cuida disso).
- Cálculo de impostos complexo (ICMS, PIS/COFINS por regime tributário) — na v1, delegamos ao provedor ou usamos configuração simplificada por produto/categoria; cálculo tributário avançado é evolução futura.

## 8.4 Fluxo de emissão (venda concluída, sistema online)

```
Venda concluída (SALE_CREATED confirmada no servidor)
   │
   ▼
API Orbix Pulse monta o payload fiscal (itens, valores, cliente, forma de pagamento)
   │
   ▼
Chama o provedor fiscal (ex: Focus NFe) — chamada assíncrona
   │
   ├── Sucesso imediato → status AUTHORIZED, salva XML/PDF
   ├── Processando → status PROCESSING, aguarda webhook/callback do provedor
   └── Rejeitado → status REJECTED, exibe erro para correção (ex: dado de cliente inválido)
   │
   ▼
fiscal_documents atualizado
   │
   ▼
Notifica o dispositivo de origem (se ainda conectado) e disponibiliza PDF/e-mail
```

## 8.5 Fluxo offline e contingência

A emissão fiscal **depende de internet** — não é possível emitir uma NFC-e/NF-e sem comunicação (seja direta com SEFAZ, seja via provedor). Isso é uma limitação real e deve ser tratada de forma explícita, não escondida do usuário:

```
Venda registrada offline
   │
   ▼
Sistema grava a venda normalmente (PDV funciona 100% offline)
   │
   ▼
Documento fiscal fica com status PENDING_ISSUANCE (não gerado ainda)
   │
   ▼
Quando o dispositivo reconecta E a venda sincroniza com o servidor:
   │
   ▼
API dispara a emissão fiscal automaticamente
   │
   ▼
Usuário é notificado quando o documento é autorizado (pode já não estar mais na tela da venda)
```

### Contingência específica de NFC-e

Existe, no ecossistema fiscal brasileiro, um mecanismo oficial de contingência offline para NFC-e (o próprio Portal Nacional da NF-e prevê isso, e Secretarias de Fazenda estaduais — como a de Minas Gerais — confirmam a possibilidade, com transmissão do XML após o restabelecimento da comunicação). **Decisão para o MVP:** não implementar contingência fiscal offline própria na v1 — depender da sincronização da venda + emissão automática ao reconectar é suficiente para o caso de uso inicial (pequeno/médio comércio, quedas de internet não constantes por dias). Avaliar suporte à contingência formal de NFC-e como evolução, verificando se o provedor escolhido já oferece isso nativamente (muitos oferecem).

## 8.6 Cancelamento fiscal

Cancelamento de venda com documento fiscal já `AUTHORIZED` **não é um cancelamento local simples** — requer emissão de evento de cancelamento junto ao provedor, dentro do prazo legal permitido (geralmente até 24h, variável por tipo de documento e estado). Ver regra em `04-regras-negocio.md`, seção 4.3.

## 8.7 Envio por e-mail

O envio do PDF/DANFE por e-mail ao cliente acontece **no backend**, não no dispositivo do usuário — evita depender da conexão/configuração local e centraliza o histórico de envios.

## 8.8 Configuração por tenant

Cada tenant configura, em `settings`:
- CNPJ e dados fiscais da empresa.
- Certificado digital (upload seguro, armazenado conforme exigência do provedor escolhido — nunca em texto puro no banco do Orbix Pulse).
- Regime tributário (Simples Nacional, etc. — usado para orientar o provedor).
- Qual tipo de documento emitir por padrão (NFC-e para venda de balcão, NF-e para outras situações, NFS-e para serviços).

## 8.9 Por que esta abordagem é a correta para o MVP

- Reduz drasticamente o tempo até o primeiro cliente real usando o sistema.
- Transfere o risco de compliance fiscal (mudanças de legislação, layout, homologação) para quem já opera isso em escala.
- Permite trocar de provedor no futuro sem reescrever o ERP — a interface interna (`fiscal_documents` + camada de orquestração) é o contrato estável; o provedor é um detalhe de infraestrutura por trás dela.
