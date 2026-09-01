# Supabase

Pendente (decisão adiada na Fase 0, ver conversa de kickoff): nenhum projeto Supabase foi criado ainda — nem local (requer Docker + Supabase CLI, indisponíveis nesta máquina no momento da Fase 0) nem na nuvem.

Quando for retomado:
1. `supabase init` nesta pasta.
2. `supabase link --project-ref <ref>` para um projeto de dev, ou `supabase start` para rodar local (exige Docker).
3. `migrations/` recebe as migrations versionadas a partir da Fase 1 (`docs/03-modelo-dados.md`).
4. `policies/` recebe as políticas de RLS a partir da Fase 2 (`docs/02-arquitetura.md`, seção 2.6).
