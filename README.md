# EcclesiaGest — Sistema de Gestão Eclesiástica Multicongregacional

Plataforma web completa para administração centralizada de instituições eclesiásticas (**Sede Geral**) e gestão organizada de **Congregações**, **Supervisores**, **Membros**, **Cargos e Departamentos**, **Financeiro**, **Prestação de Contas Mensal**, **Eventos**, **Relatórios Gerenciais (PDF e Excel)**, **Controle de Acesso (RBAC)** e **Log de Auditoria Imutável**.

---

## Visão Geral da Arquitetura

O **EcclesiaGest** foi projetado para operar em modelo **multicongregacional**, garantindo que a **Sede Geral** tenha visão consolidada de toda a instituição enquanto **Supervisores** e **Lideranças Locais** acessam exclusivamente as unidades sob sua responsabilidade.

- **Painel Geral (Dashboard Executivo)**: Indicadores financeiros consolidados, saldo por congregação, distribuição de membros por faixa etária, alertas de congregações pendentes, filtros analíticos e atalhos rápidos.
- **Estrutura e Pessoas**:
  - **Congregações**: Cadastro completo de unidades, código interno, pastor dirigente, supervisor, status (`Ativa` / `Inativa`), visão detalhada, exportação em Excel e exclusão auditável.
  - **Supervisores**: Vinculação de supervisores a uma ou mais congregações com isolamento automático de dados e contagem de pendências.
  - **Membros**: Cadastro com foto, cálculo automático de idade e classificação por faixa etária configurável, status (`Ativo`, `Afastado`, `Transferido`, `Inativo`) e transferência entre congregações com histórico preservado.
  - **Cargos e Departamentos**: Níveis hierárquicos personalizáveis, importação opcional de sugestões de cargos (sem pessoas vinculadas) e gestão de integrantes por departamento.
  - **Eventos e Agenda**: Programação de cultos, congressos, conferências e reuniões por congregação.
- **Financeiro e Governança**:
  - **Financeiro**: Lançamento de entradas e despesas por categoria, anexo obrigatório de comprovantes para despesas, **Estorno Auditável** com justificativa, **Exclusão Auditável** e exportação de extrato em Excel (`.xlsx`).
  - **Prestação de Contas Mensal**:
    - Fluxo completo: `Em preenchimento` → `Enviada` → `Em análise` → `Aprovada pelo supervisor` / `Devolvida` → `Recebida pela sede`.
    - Bloqueio automático de envio se houver despesas sem comprovante anexado e bloqueio de autoaprovação pelo mesmo usuário que enviou.
    - **Extração de Planilha Excel (`.xlsx`) Multi-Abas** (*Resumo da Prestação*, *Lançamentos Detalhados* e *Histórico de Tramitação*) e **PDF**.
  - **Central de Relatórios**: 10 relatórios gerenciais prontos para exportação em **PDF** e **Excel (`.xlsx`)**.
  - **Usuários e Permissões (RBAC)**: 7 perfis institucionais (*Presidente Geral*, *Administrador Geral*, *Supervisor*, *Pastor Dirigente*, *Tesoureiro*, *Secretário*, *Líder de Departamento*) com permissões granulares por módulo.
  - **Auditoria Imutável**: Registro automático de todas as operações críticas (logins, cadastros, edições, estornos, aprovações e exclusões), sem possibilidade de alteração ou exclusão de logs.
  - **Configurações da Sede**: Personalização de nome institucional, CNPJ, endereço, logotipo, cores e faixas etárias.

---

## Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Ícones e Gráficos**: Lucide React, Recharts
- **Backend e Banco de Dados**: Firebase Authentication (Google + E-mail/Senha) e Cloud Firestore
- **Exportação de Documentos**: SheetJS (`xlsx`) para planilhas Excel e `jspdf` + `jspdf-autotable` para relatórios PDF
- **Hospedagem**: Vercel (SPA com `vercel.json`)

---

## Estrutura do Projeto

```text
├── firebase-applet-config.json   # Configuração do projeto Firebase
├── firestore.rules               # Regras de segurança e isolamento RBAC no Firestore
├── vercel.json                   # Configuração de rotas SPA para o Vercel
├── index.html                    # Ponto de entrada HTML
├── package.json                  # Dependências e scripts de build
└── src/
    ├── components/               # Módulos visuais (Dashboard, Financeiro, Prestação de Contas, etc.)
    │   └── ui/                   # Modais reutilizáveis (Modal, ConfirmDeleteModal)
    ├── contexts/                 # Contexto de autenticação e permissões (AuthContext)
    ├── lib/                      # Inicialização do Firebase e formatadores (moeda, datas, idades)
    ├── services/                 # Serviços de banco de dados (firestoreService) e exportação (exportService)
    └── types/                    # Tipagens TypeScript e constantes do domínio
```

---

## Como Rodar Localmente

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/SEU-USUARIO/ecclesiagest.git
   cd ecclesiagest
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure o Firebase**:
   - Verifique se o arquivo `firebase-applet-config.json` contém as credenciais do seu projeto Firebase.
   - No **Console do Firebase**, habilite os provedores **Google** e **E-mail/senha** em *Authentication > Sign-in method*.
   - Publique as regras de segurança contidas em `firestore.rules`.

4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:3000`.

---

## Deploy no GitHub e Vercel

1. **Suba o código para o GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Versão inicial - EcclesiaGest"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/ecclesiagest.git
   git push -u origin main
   ```

2. **Publique no Vercel**:
   - Acesse [vercel.com](https://vercel.com) e entre com sua conta do **GitHub**.
   - Clique em **Add New... > Project** e importe o repositório `ecclesiagest`.
   - O Vercel reconhecerá automaticamente o **Vite** (`Build Command: npm run build`, `Output Directory: dist`).
   - Clique em **Deploy**.

3. **Autorize o domínio no Firebase Authentication**:
   - Copie o domínio gerado pelo Vercel (ex.: `ecclesiagest.vercel.app`).
   - No **Console do Firebase**, acesse **Authentication > Settings > Authorized domains**, clique em **Add domain** e adicione o domínio do Vercel para habilitar o Login com Google em produção.
