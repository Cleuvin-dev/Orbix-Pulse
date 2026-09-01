# 10 — Estratégia de Testes

## 10.1 Princípio

Nenhuma funcionalidade crítica é considerada "pronta" sem teste automatizado correspondente. O fluxo esperado para cada requisito é:

```
Requisito → Implementação → Teste → Validação → Documentação
```

## 10.2 Camadas de teste

| Camada | Ferramenta | Cobre |
|---|---|---|
| Unitário (backend) | xUnit/Vitest (conforme stack final) | Regras de negócio isoladas (ex: cálculo de estoque, permissões) |
| Unitário (frontend) | Vitest | Componentes, hooks, lógica de UI |
| Integração de API | Vitest/Supertest | Endpoints completos, incluindo autorização |
| Integração de Sync | Testes dedicados | Cenários de idempotência e conflito (ver 10.4) |
| E2E | Playwright | Fluxos completos de usuário, incluindo simulação offline |

## 10.3 Exemplos de casos de teste obrigatórios (derivados diretamente das regras de negócio)

### Permissões
```
Given: usuário com role CASHIER
When: GET /finance/dre
Then: 403
```

### Idempotência de sincronização
```
Given: uma venda criada offline com operation_id X
When: X é enviado duas vezes ao servidor (simulando falha de rede no meio do processo)
Then: apenas uma venda existe no banco; segunda resposta retorna ALREADY_PROCESSED
```

### Conflito de estoque comutativo
```
Given: produto com estoque 10
When: dois dispositivos, offline, cada um vende 3 e 2 unidades respectivamente
And: ambos sincronizam em ordem arbitrária
Then: estoque final = 5, sem duplicação nem perda de movimento
```

### Cancelamento de venda com fiscal emitido
```
Given: venda com fiscal_document status AUTHORIZED
When: usuário tenta cancelar a venda
Then: sistema exige fluxo de cancelamento fiscal antes de permitir o cancelamento local
```

### Caixa duplicado
```
Given: dispositivo com cash_register já OPEN
When: usuário tenta abrir um novo caixa no mesmo dispositivo
Then: rejeitado com erro de negócio, não erro técnico genérico
```

## 10.4 Testes específicos de offline-first (o diferencial do produto — não podem ser negligenciados)

- Simular perda de conexão durante uma venda em andamento e verificar que a operação completa localmente sem erro.
- Simular reconexão com múltiplas operações pendentes na fila e verificar ordem de processamento e resultado final.
- Simular dois dispositivos offline simultâneos operando sobre o mesmo produto/estoque e verificar consistência final após ambos sincronizarem.
- Testar em navegador real (não apenas mock) o comportamento de Service Worker + IndexedDB, incluindo o cenário de PWA instalado vs. aba comum (ver `06-offline-first.md`).

## 10.5 Cobertura mínima esperada por fase

Definido junto ao roadmap (`12-roadmap-fases.md`): nenhuma fase é considerada concluída sem os testes de regra de negócio e de sincronização (quando aplicável) daquela fase implementados e passando.

## 10.6 Ambiente de teste

- Banco de testes isolado (schema ou instância separada do Supabase), nunca compartilhado com dados de desenvolvimento/produção.
- Testes de integração de sync devem rodar com simulação real de múltiplos "dispositivos" (contextos separados), não apenas chamadas sequenciais de função.
