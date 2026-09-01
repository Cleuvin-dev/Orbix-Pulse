# 06 — Offline-First

## 6.1 Princípio

O aplicativo (PWA) deve funcionar como unidade autônoma. A internet é um recurso para sincronizar, não um requisito para operar.

## 6.2 Camadas técnicas

```
Next.js (UI)
   ↓
Service Worker (Workbox/Serwist) — cache de assets, disponibilidade offline do app em si
   ↓
Dexie / IndexedDB — banco de dados local, fonte de verdade imediata do dispositivo
   ↓
Sync Client — fila de operações pendentes + comunicação com a API quando online
```

## 6.3 PWA: instalado vs. aba de navegador

Existem três níveis de experiência, com robustez offline diferente:

1. **Aba de navegador comum, sem instalar**: funciona, mas depende do navegador ter cacheado o app numa visita online anterior. Menos confiável para uso prolongado offline.
2. **PWA instalado** ("Adicionar à tela inicial" / instalar no desktop): comportamento próximo de app nativo — ícone próprio, janela separada, Service Worker mais estável. **Recomendado como padrão para dispositivos fixos de operação** (PC do caixa, tablet de estoque).
3. **Nunca aberto online antes**: não funciona — o Service Worker precisa ser registrado com internet ao menos uma vez, na configuração inicial do dispositivo.

### Recomendação por caso de uso

| Cenário | Recomendação |
|---|---|
| PC do caixa / loja fixa | PWA instalado — offline robusto, sem ressalvas |
| Celular do dono, para consulta de dashboard | PWA comum, uso majoritariamente online, sem exigência offline pesada |
| Celular como PDV móvel offline (feira, evento, vendedor externo) | Funciona bem no Android; no iOS/Safari, tratar como "melhor esforço" — Apple historicamente restringe Background Sync e pode limpar dados de apps não instalados após inatividade. Instalado, o comportamento melhora, mas deve ser validado em teste real antes de prometer garantia total na v1. |

## 6.4 Dado mínimo necessário (sincronização seletiva)

O dispositivo não baixa o banco inteiro do tenant — baixa apenas o que o usuário logado naquele dispositivo tem permissão de ver (ver `05-permissoes-rbac.md`). Isso reduz:
- Tamanho do IndexedDB local.
- Superfície de exposição de dados sensíveis em caso de dispositivo comprometido/roubado.

## 6.5 Estrutura do banco local (Dexie)

```
IndexedDB
│
├── products           (catálogo permitido ao usuário)
├── customers
├── suppliers
├── sales               (vendas locais, incluindo pendentes de sync)
├── sale_items
├── stock_movements     (apenas os relevantes ao dispositivo/filial)
├── payments
├── cash_registers
├── sync_queue          (fila de operações pendentes de envio)
└── app_metadata         (última sincronização, versão do app, tenant/branch/device atual)
```

## 6.6 Indicador de status — elemento de UI obrigatório

O usuário sempre vê o estado de conexão/sincronização, de forma clara e não technical:

```
🟢 Sincronizado
🟠 Sincronizando... (X operações restantes, barra de progresso)
🔴 Offline — N operações aguardando conexão
```

Esse indicador é permanente na UI (ex: cabeçalho), não um alerta que aparece e some.

## 6.7 Duração esperada offline

O sistema deve ser projetado para tolerar **horas ou dias** offline na parte operacional (vendas, estoque, caixa), não apenas quedas rápidas de minutos. A parte fiscal tem regras próprias de contingência — ver `08-fiscal.md`.

## 6.8 Limites conhecidos (documentar como expectativa, não esconder)

- Em iOS/Safari, PWAs não instalados podem ter dados locais limpos pelo sistema operacional após período de inatividade — mitigado por instalação e por não depender de retenção de dados por tempo indefinido sem sincronizar.
- IndexedDB tem limite de armazenamento por origem, variável por navegador/SO — mitigado por sincronizar e limpar dados já confirmados como `SYNCED` periodicamente, mantendo apenas uma janela recente localmente.
- Múltiplas abas do mesmo PWA abertas simultaneamente podem gerar concorrência de escrita no IndexedDB — mitigado com locks/coordenação via `BroadcastChannel` ou restringindo a uma aba ativa por vez.
