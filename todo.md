# Agro CRM BA03 - TODO

## Backend - Schema & Database
- [x] Tabela invoices (faturamento CSV)
- [x] Tabela rep_aliases (aliases de RCs)
- [x] Tabela client_actions (ações manuais de status)
- [x] Tabela sales_goals (metas mensais)
- [x] Tabela rc_invites (convites de onboarding)
- [x] Coluna repCode na tabela users

## Backend - API Routes
- [x] Upload CSV de faturamento com parsing e deduplicação por mês
- [x] Dashboard: métricas agregadas (Total Faturado, Clientes Ativos, Volume KG, Evolução mensal)
- [x] Clientes: listagem com ciclo de compra calculado e status automático
- [x] Clientes: ações manuais (em_acao, pedido_na_tela, excluido, reset)
- [x] Histórico: evolução 12 meses, ranking clientes e produtos
- [x] Aceleração: clientes em risco e oportunidades de reativação
- [x] Produtos: volume por produto e evolução temporal
- [x] Rep aliases: CRUD para gerenciar aliases
- [x] Sales goals: CRUD para metas mensais
- [x] Convites: gerar, consultar e aceitar convites
- [x] Filtro por RC em todas as queries (admin vê tudo, RC vê só seus dados)

## Frontend - Layout & Design
- [x] Design system com tema profissional para análise de dados
- [x] DashboardLayout com sidebar navigation
- [x] Navegação: Dashboard, Upload, Clientes, Histórico, Aceleração, Produtos, Configurações

## Frontend - Páginas
- [x] Dashboard com cards de métricas e gráficos
- [x] Upload CSV com preview e confirmação
- [x] Clientes com cards de status, benchmarking de saúde, filtro por RC
- [x] Histórico com gráficos de evolução 12 meses e rankings
- [x] Aceleração com identificação de clientes em risco
- [x] Produtos com análise de volume e evolução
- [x] Configurações: aliases de RCs e metas
- [x] Página de convite para onboarding de RCs

## Controle de Acesso
- [x] Sistema de convites com token e vinculação ao repCode
- [x] OAuth returnPath para redirect correto após login
- [x] Filtro rigoroso por repCode em todas as queries
- [x] Admin selector de RC no dashboard

## Testes
- [x] Testes de controle de acesso (admin, RC, unauthenticated)
- [x] Testes de lógica de ciclo de compra
- [x] Testes de parsing de datas e números brasileiros
- [x] Testes de validação de upload CSV
