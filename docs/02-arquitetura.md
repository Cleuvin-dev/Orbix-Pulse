# 02 — Arquitetura Técnica

## 2.1 Princípio arquitetural

Orbix Pulse é **cloud-native, mas offline-first**. O dispositivo do usuário roda uma cópia funcional local do sistema; a nuvem é o ponto de consolidação, verdade final e inteligência.

Uma decisão importante que corrige uma inconsistência de uma versão anterior deste blueprint: **existe uma API própria, fina, por trás do Supabase.** O frontend não fala diretamente com o Supabase para operações críticas de negócio. Isso porque:

- Idempotência, fila de sincronização e resolução de conflitos são lógica de negócio, não infraestrutura de banco — Row Level Security (RLS) do Postgres resolve autorização de linha, não motor de sincronização.
- Orquestração fiscal (chamar o serviço terceirizado, tratar retorno, retry) precisa de um lugar seguro para viver, fora do navegador.
- Cálculos financeiros sensíveis (DRE, fechamento de caixa) não devem depender de lógica no cliente.

O Supabase é usado como: banco PostgreSQL gerenciado, autenticação (Supabase Auth), storage de arquivos (PDFs, XMLs), e RLS como camada adicional de defesa — não como substituto do backend.

## 2.2 Diagrama geral

```
                         ☁️ NUVEM
        ┌───────────────────────────────────────┐
        │                                       │
        │   API Orbix Pulse (backend próprio)   │
        │   - Sync Engine                       │
        │   - Regras de negócio críticas        │
        │   - Orquestração fiscal                │
        │   - Autorização (RBAC)                 │
        │                                       │
        │              ↕                        │
        │   Supabase (PostgreSQL + Auth + RLS   │
        │   + Storage)                          │
        │                                       │
        └───────────────────┬───────────────────┘
                             │ Internet
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────▼─────┐                 ┌─────▼─────┐
        │  PC Loja  │                 │  Tablet/  │
        │            │                 │  Celular  │
        │  Next.js   │                 │  Next.js  │
        │  PWA       │                 │  PWA      │
        │            │                 │            │
        │  Service   │                 │  Service   │
        │  Worker    │                 │  Worker    │
        │            │                 │            │
        │  Dexie /   │                 │  Dexie /   │
        │  IndexedDB │                 │  IndexedDB │
        │            │                 │            │
        │  Sync      │                 │  Sync      │
        │  Client    │                 │  Client    │
        └────────────┘                 └────────────┘
```

## 2.3 Stack tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Ecossistema maduro, excelente suporte a PWA |
| UI | Tailwind CSS + shadcn/ui | Produtividade e consistência visual |
| Estado/cache remoto | TanStack Query | Cache, revalidação, sincronização com API |
| Banco local | Dexie sobre IndexedDB | Simplicidade, maturidade, controle total do Sync Engine |
| PWA | Service Worker (Workbox ou Serwist) | App instalável, cache de assets, background sync |
| Backend | Node.js (NestJS) *ou* API serverless no próprio Supabase (Edge Functions) para funções pontuais | Modularidade, tipagem compartilhada com o frontend (TypeScript full-stack) |
| ORM | Prisma (se NestJS) | Produtividade + PostgreSQL |
| Banco central | PostgreSQL via Supabase | Gerenciado, RLS, realtime, storage, custo inicial baixo |
| Autenticação | Supabase Auth (JWT) | Evita reconstruir auth do zero |
| Autorização | RBAC + permissões granulares, implementado na API | Ver `05-permissoes-rbac.md` |
| Fiscal | Serviço terceirizado via API (Focus NFe / eNotas / Tecnospeed) | Ver `08-fiscal.md` |
| Fila/cache | Redis (a partir da Fase de escala) | Filas de sincronização em volume, cache |
| Validação | Zod (front e back compartilhado) | Única fonte de verdade de schema |
| Testes | Vitest + Playwright + testes de integração de API | Ver `10-testes.md` |
| Infraestrutura | Docker | Padronização de ambiente |
| CI/CD | GitHub Actions | Automação de build/test/deploy |
| Observabilidade | OpenTelemetry + logs estruturados | Rastreabilidade de sincronização e erros fiscais |

**Nota sobre a escolha de backend:** NestJS é recomendado por dar estrutura modular clara (facilita o trabalho do Claude Code em partes isoladas) e por manter TypeScript ponta a ponta, compartilhando tipos/validação (Zod) entre frontend e backend. ASP.NET Core/.NET permanece uma alternativa válida caso haja preferência pessoal ou necessidade futura de performance/robustez adicional, mas não é a recomendação inicial.

## 2.4 Estrutura de monorepo

```
orbix-pulse/
│
├── apps/
│   ├── web/                # Next.js — PWA, offline, UI
│   └── api/                 # Backend — Sync Engine, regras de negócio, fiscal
│
├── packages/
│   ├── ui/                  # Componentes compartilhados
│   ├── types/                # Tipos TypeScript compartilhados (entidades, eventos)
│   ├── validation/           # Schemas Zod compartilhados
│   └── config/                # ESLint, TSConfig, etc. compartilhados
│
├── infrastructure/
│   ├── docker/
│   ├── supabase/             # Migrations, policies RLS
│   └── deployment/
│
├── docs/                     # Este blueprint
│
├── tests/
│   └── e2e/
│
└── CLAUDE.md
```

## 2.5 Camadas dentro da API (backend)

```
apps/api/
│
├── controllers/         # Entrada HTTP
├── application/          # Casos de uso (Sales, Inventory, Finance, Fiscal, Users)
├── domain/                # Entidades, regras, eventos de domínio
└── infrastructure/         # Banco, repositórios, integrações externas (fiscal, e-mail)
```

Regra fixa: **nenhuma regra de negócio crítica vive em `controllers/` ou no frontend.** Controllers apenas traduzem HTTP → caso de uso.

## 2.6 Multi-tenant

Todo registro de negócio carrega `tenant_id`. Isolamento garantido em duas camadas:
1. Aplicação (toda query passa `tenant_id` obrigatoriamente — nunca opcional).
2. RLS no Supabase como camada de defesa adicional (não como única proteção).

Ver detalhamento completo em `03-modelo-dados.md`.
