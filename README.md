# Maria Lima | Gestão de Vendas

Dashboard de vendas e portal administrativo para gestão comercial, com visualização de KPIs, ranking de vendedores, acompanhamento de metas e área administrativa com controle de acesso por papel (RBAC).

---

## O que o projeto faz

### Dashboard de Vendas (`/`)
- **KPIs**: Total de vendas, quantidade de vendas, ticket médio e total de comissões
- **Ranking de vendedores**: gráfico de barras com os top vendedores
- **Gráfico por departamento**: divisão de vendas por setor
- **Timeline de vendas**: evolução das vendas ao longo do tempo
- **Tabela de comissões**: detalhe por vendedor
- **Acompanhamento de metas**: visão semanal de progresso com níveis Min, Top 1, Top 2 e Master
- **Filtros**: por vendedor, departamento e intervalo de datas
- **Multi-loja**: Sobral e Itapipoca, com acesso controlado por usuário

### Portal Administrativo (`/admin`)
Acessível apenas para usuários com role `admin`:
- **Gestão de metas mensais** (`/admin/metas`): criação e edição de metas por loja
- **Gestão de usuários** (`/admin/usuarios`): cadastro de usuários e atribuição de papéis
- **Permissões** (`/admin/permissoes`): atribuição de acessos a lojas por usuário

### Autenticação (`/login`)
- Login com e-mail e senha via Supabase Auth
- Sessão persistente com redirecionamento automático
- Proteção de rotas administrativas por role

---

## Stack de tecnologias

| Camada | Tecnologia |
|--------|------------|
| Framework | React 18 + Vite + TypeScript |
| Estilização | Tailwind CSS + shadcn/ui (Radix UI) |
| Roteamento | React Router DOM v6 |
| Estado/dados | TanStack React Query v5 |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + RLS) |
| Gráficos | Recharts |
| Notificações | Sonner |

---

## Fluxo de dados

```
Frontend (useSalesData hook)
  → Supabase PostgreSQL (gigatech_vendas + gigatech_vendedores)
    → Filtrado automaticamente por RLS (marialima_has_store_access)
  → React Query (cache 5 minutos)
```

As metas mensais são lidas e gravadas via RPC (`marialima_upsert_monthly_goal`) na tabela `marialima_monthly_goals`.

---

## Estrutura de diretórios

```
src/
├── App.tsx                          # Rotas e provedores globais
├── main.tsx                         # Ponto de entrada React
├── pages/
│   ├── Index.tsx                    # Dashboard principal
│   ├── Welcome.tsx                  # Tela de seleção de loja
│   ├── Login.tsx                    # Tela de login
│   ├── NotFound.tsx                 # Página 404
│   └── admin/
│       ├── AdminLayout.tsx          # Layout e guarda de rota admin
│       ├── AdminDashboard.tsx       # Hub administrativo
│       ├── GoalsManagement.tsx      # CRUD de metas mensais
│       ├── UsersManagement.tsx      # Cadastro e listagem de usuários
│       └── PermissionsManagement.tsx # Gestão de permissões por loja
├── components/
│   ├── dashboard/                   # Componentes do dashboard
│   └── ui/                          # Componentes shadcn/ui
├── hooks/
│   ├── useSalesData.ts              # Consulta dados de vendas via Supabase
│   ├── useMonthlyGoals.ts           # Leitura e persistência de metas
│   ├── useUserAccess.ts             # Controle de acesso por loja
│   └── useAuth.ts                   # Estado de autenticação
├── integrations/
│   └── supabase/
│       ├── client.ts                # Instância do cliente Supabase
│       └── types.ts                 # Tipos gerados automaticamente
└── lib/
    └── utils.ts                     # Utilitários (cn, formatação)

supabase/
├── functions/
│   └── admin-create-user/index.ts   # Edge Function para criação de usuários
└── migrations/                      # Histórico de migrations SQL
```

---

## Banco de dados

Tabelas principais (projeto unificado `lunsyufvxkiivnrhpxpj`):

| Tabela | Descrição |
|--------|-----------|
| `gigatech_vendas` | Dados detalhados de vendas (produto, EAN, valor, margem) |
| `gigatech_vendedores` | Vendas por vendedor (comissões, tipo de venda) |
| `gigatech_clientes_config` | Configuração das lojas (mapeamento cliente_id ↔ loja) |
| `marialima_profiles` | Perfis de usuário vinculados ao Supabase Auth |
| `marialima_user_roles` | Papéis dos usuários (admin, manager, seller) |
| `marialima_user_stores` | Acesso de cada usuário às lojas |
| `marialima_monthly_goals` | Metas mensais por loja |

### Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) habilitado:
- `gigatech_vendas` e `gigatech_vendedores`: protegidas pela função `marialima_has_store_access()` que verifica se o usuário tem acesso à loja correspondente
- Tabelas `marialima_*`: protegidas por políticas baseadas em `marialima_has_role()`
- A aplicação usa exclusivamente a chave `anon` (pública) — nenhum service_role é exposto ao cliente

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

> ⚠️ O arquivo `.env` está no `.gitignore` e **não deve ser commitado**.

---

## Como rodar localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (porta 8080)
npm run dev

# Build de produção
npm run build

# Pré-visualizar build
npm run preview
```

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento na porta 8080 |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build localmente |
| `npm run lint` | Rodar ESLint |

---

## Rotas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/welcome` | Autenticado | Seleção de loja |
| `/` | Autenticado + acesso à loja | Dashboard Sobral |
| `/itapipoca` | Autenticado + acesso à loja | Dashboard Itapipoca |
| `/login` | Público | Tela de login |
| `/admin` | Role `admin` | Hub administrativo |
| `/admin/metas` | Role `admin` | Gestão de metas mensais |
| `/admin/usuarios` | Role `admin` | Gestão de usuários |
| `/admin/permissoes` | Role `admin` | Gestão de permissões |
