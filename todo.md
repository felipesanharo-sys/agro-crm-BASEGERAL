# Agro CRM BA03 - TODO

## Backend - Schema & Database
- [x] Tabela invoices (faturamento CSV) com todas as colunas do original
- [x] Tabela rep_aliases (aliases de RCs com parentRepCode e isGestor)
- [x] Tabela client_actions (ações manuais de status)
- [x] Tabela sales_goals (metas mensais)
- [x] Tabela rc_invites (convites de onboarding)
- [x] Tabela notifications (notificações do sistema)
- [x] Tabela upload_logs (log de uploads)
- [x] Tabela page_views (tracking de atividade)
- [x] Coluna repCode na tabela users

## Backend - API Routes (réplica fiel do original)
- [x] Upload CSV/XLSX com parsing xlsx, deduplicação por mês, backup S3
- [x] Dashboard: métricas agregadas, evolução mensal, RC ranking
- [x] Clientes: listagem com ciclo de compra, status automático, benchmarking
- [x] Clientes: ações manuais (em_acao, pedido_na_tela, excluido, reset)
- [x] Clientes: detalhes (últimos pedidos, breakdown produtos, histórico ações)
- [x] Histórico: evolução 12 meses, ranking clientes, ranking produtos, RC ranking
- [x] Aceleração: programa aceleração com categorias (Master, Esp. Plus, Especial, Essencial)
- [x] Produtos: volume por produto, evolução temporal, clientes por produto
- [x] Rep aliases: CRUD com parentRepCode e isGestor
- [x] Sales goals: CRUD para metas mensais
- [x] Convites: gerar, consultar e aceitar convites com vinculação automática
- [x] Notificações: listagem, contagem não lidas, marcar como lidas
- [x] Atividade: tracking de page views, resumo de atividade por usuário
- [x] Export: exportação de invoices e anotações
- [x] Manager: relatório de conversão, resumo por RC, anotações
- [x] Filtro por RC em todas as queries (admin vê tudo, RC vê só seus dados)

## Frontend - Layout & Design (réplica fiel do original)
- [x] Tema verde profissional com status badge colors
- [x] DashboardLayout com sidebar (desktop) e bottom nav (mobile)
- [x] Sidebar resizável com drag handle
- [x] Navegação: Clientes, Histórico, Aceleração, Produtos, Upload, Usuários, Notificações

## Frontend - Páginas (copiadas do original)
- [x] ClientsPage: Ranking Saúde + Lista de Clientes com detalhes expandíveis
- [x] HistoryPage: evolução mensal, ranking clientes/produtos, RC ranking
- [x] AceleracaoTab: programa aceleração com categorias e breakdown mensal
- [x] ProductsPage: análise de volume, evolução, clientes por produto
- [x] UploadPage: upload CSV/XLSX com preview e logs
- [x] SettingsPage: aliases de RCs e metas
- [x] UsersPage: gestão de usuários e atividade
- [x] NotificationsPage: listagem de notificações com filtros
- [x] InvitePage: aceite de convite com vinculação ao repCode

## Controle de Acesso
- [x] Sistema de convites com token e vinculação ao repCode
- [x] OAuth returnPath para redirect correto após login
- [x] Filtro rigoroso por repCode em todas as queries
- [x] adminProcedure para rotas exclusivas de gestores
- [x] parentRepCode para consolidação de dados

## Removido (não aplicável ao BA03)
- [x] Aba Previsão de Vendas (sem Google Sheets)
- [x] Funnel/Funil de vendas (sem Google Sheets)
- [x] Integração Google Sheets (sem planilha de acompanhamento)

## Testes
- [x] Testes de controle de acesso (admin, RC, unauthenticated)
- [x] Testes de lógica de ciclo de compra
- [x] Testes de parsing de datas e números brasileiros
- [x] Testes de formatação yearMonth
- [x] 14 testes passando

## Melhoria: Reconhecimento automático de RCs
- [x] Criar rota que extrai lista de RCs distintos dos dados de faturamento (invoices)
- [x] Na tela de convites, popular dropdown com RCs do faturamento automaticamente
- [x] Admin escolhe RC da lista e gera link de convite sem cadastro manual prévio

## Bug: Página de convite abre em branco
- [x] Investigar e corrigir InvitePage que abre em branco quando RC acessa o link
- [x] Corrigido: OAuth callback agora respeita returnPath do state para redirecionar de volta à página de convite após login

## Melhoria: Fallback aliases → invoices para dropdown de convites
- [x] Se rep_aliases tem dados → usa aliases (original)
- [x] Se rep_aliases está vazia → busca RCs de invoices (fallback)

## Melhoria: Histórico consolidado agrupar por Micro ao invés de RC
- [x] Alterar query backend do ranking consolidado para agrupar por microRegion
- [x] Alterar frontend HistoryPage para exibir "Micro" ao invés de "RC" na visão consolidada
- [x] Tratar pedidos sem micro com fallback "Sem Micro"

## Bug: Discrepância de volume em fevereiro (484.655 vs 503.580 KG)
- [x] Investigar causa da diferença de ~18.925 KG no volume total de fevereiro
  - Conclusão: Arquivo original não contém dados de fevereiro de 2026 (vai até janeiro)
  - Sistema está funcionando corretamente com 484.655 KG importados
  - Valor esperado (503.580) não existe no arquivo original

## Integração RC Padrão para Pedidos Órfãos
- [x] Reprocessar registros existentes: atribuir VBRP901022 a pedidos sem repCode (parser CSV atualizado)
- [x] Criar alias para VBRP901022 = "João Fernando Ferreira S Carvalho"
- [x] Atualizar queries backend para usar VBRP901022 como fallback quando repCode vazio
- [x] Atualizar dropdown de convites para incluir VBRP901022 (já aparece com 6 clientes e 75.475 kg)
- [x] Testar que pedidos órfãos aparecem corretamente em todas as visualizações (14 testes passando)

## Melhoria: Aumentar últimos pedidos no card do cliente
- [x] Aumentar de 6 para 12 últimos pedidos exibidos no card do cliente
- [x] Atualizar skeletons de carregamento de 6 para 12
- [x] Testar que não há bugs (14 testes passando)

## Análise de Sazonalidade - Gráfico Mensal
- [x] Criar query backend para dados mensais de sazonalidade (últimos 12 meses, volume KG)
- [x] Criar rota tRPC clients.seasonality
- [x] Implementar aba "Sazonalidade" no card do cliente
- [x] Criar gráfico de barras com Recharts mostrando volume mensal
- [x] Testar que gráfico exibe corretamente (14 testes passando)

## Bug Fix: Dropdown de RCs não aparecia ao gerar convite
- [x] Identificar erro SQL na query availableReps (coluna isGestor não existia)
- [x] Remover coluna isGestor da query de aliases
- [x] Testar que dropdown agora mostra VBRP901022 corretamente (14 testes passando)

## Bug: Dropdown de RCs mostra apenas VBRP901022, deveria mostrar todos os RCs dos dados
- [x] Corrigir query availableReps para retornar todos os RCs dos invoices
- [x] Combinar dados de rep_aliases com invoices para lista completa (UNION com COALESCE)
- [x] Testar que dropdown mostra todos os 12 RCs disponíveis (14 testes passando)

## Feature: Botão de Reset Geral na Aba Benchmark
- [x] Criar rota tRPC clients.resetAllEmAcao para limpar status "Em Ação"
- [x] Adicionar botão de reset na aba Benchmark
- [x] Implementar confirmação antes de executar reset
- [x] Testar que todos os clientes "Em Ação" voltam ao status anterior (14 testes passando)

## Feature: Botão "Extrair Funil de Vendas" em Excel
- [x] Criar função backend para buscar clientes em ciclo/alerta/pré-inativacao por RC
- [x] Criar função para gerar Excel com xlsx (RC | Cliente | Canal | | | Volume)
- [x] Adicionar 20 linhas em branco entre cada RC
- [x] Criar botão verde acima da aba "Lista de Clientes"
- [x] Testar download do Excel com dados corretos (14 testes passando)

## Feature: Transformação de Dados no Upload
- [x] Se coluna E = "Legado Prodap" → Coluna J (RC) = "Precision Farm"
- [x] Gerar Pedido Código aleatório: 10 dígitos começando com "32" (ex: 3212345678)
- [x] Pedido Item = sempre "10"
- [x] Testar que dados Legado Prodap são importados corretamente (14 testes passando)

## Melhoria: Aba Aceleração - Agrupar por Cliente
- [x] Criar query backend para agrupar por nome do cliente com soma de volume KG
- [x] Filtrar apenas clientes com AMBOS: revenda E indústria
- [x] Manter filtro por período e regras de aceleração
- [x] Atualizar frontend para mostrar cliente com códigos expandíveis (toggle Agrupado por Cliente)
- [x] Testar que somatório classifica cliente corretamente no programa (14 testes passando)

## Bug Fix: Remover toggle e aplicar soma revenda+indústria no Programa Aceleração principal
- [x] Remover toggle "Agrupado por Cliente" do frontend
- [x] Remover query summaryGrouped
- [x] Atualizar query principal getAceleracaoData para somar revenda+indústria automaticamente
- [x] Testar que Programa Aceleração mostra volumes somados para clientes com ambos canais (14 testes passando)
