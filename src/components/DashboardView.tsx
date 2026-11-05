import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Users,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RotateCcw,
  Plus,
  ArrowRight,
  FilterX,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Congregation,
  Supervisor,
  Member,
  FinancialTransaction,
  AccountabilityReport,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../types/index.ts';
import {
  formatCurrency,
  MONTH_NAMES_PT,
  calculateAge,
  classifyAgeGroup,
} from '../lib/formatters.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { NavSection } from './Layout.tsx';

interface DashboardViewProps {
  congregations: Congregation[];
  supervisors: Supervisor[];
  members: Member[];
  transactions: FinancialTransaction[];
  accountability: AccountabilityReport[];
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  congregations,
  supervisors,
  members,
  transactions,
  accountability,
  onNavigate,
}) => {
  const { institution } = useAuth();
  const currentYear = new Date().getFullYear();

  const [filterCongregation, setFilterCongregation] = useState<string>('all');
  const [filterSupervisor, setFilterSupervisor] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(String(currentYear));
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  const hasActiveFilters =
    filterCongregation !== 'all' ||
    filterSupervisor !== 'all' ||
    filterMonth !== 'all' ||
    filterYear !== String(currentYear) ||
    filterCategory !== 'all';

  const resetFilters = () => {
    setFilterCongregation('all');
    setFilterSupervisor('all');
    setFilterMonth('all');
    setFilterYear(String(currentYear));
    setFilterCategory('all');
  };

  // Congregations matching supervisor filter
  const allowedCongIdsBySupervisor = useMemo(() => {
    if (filterSupervisor === 'all') return null;
    const sup = supervisors.find((s) => s.id === filterSupervisor);
    return new Set(sup?.congregationIds || []);
  }, [filterSupervisor, supervisors]);

  const filteredCongregations = useMemo(() => {
    return congregations.filter((c) => {
      if (filterCongregation !== 'all' && c.id !== filterCongregation)
        return false;
      if (allowedCongIdsBySupervisor && !allowedCongIdsBySupervisor.has(c.id))
        return false;
      return true;
    });
  }, [congregations, filterCongregation, allowedCongIdsBySupervisor]);

  const filteredCongIdSet = useMemo(
    () => new Set(filteredCongregations.map((c) => c.id)),
    [filteredCongregations]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.reversed) return false;
      if (!filteredCongIdSet.has(t.congregationId)) return false;
      if (filterYear !== 'all' && t.year !== parseInt(filterYear, 10))
        return false;
      if (filterMonth !== 'all' && t.month !== parseInt(filterMonth, 10))
        return false;
      if (filterCategory !== 'all' && t.category !== filterCategory)
        return false;
      return true;
    });
  }, [
    transactions,
    filteredCongIdSet,
    filterYear,
    filterMonth,
    filterCategory,
  ]);

  const filteredAccountability = useMemo(() => {
    return accountability.filter((a) => {
      if (!filteredCongIdSet.has(a.congregationId)) return false;
      if (filterYear !== 'all' && a.year !== parseInt(filterYear, 10))
        return false;
      if (filterMonth !== 'all' && a.month !== parseInt(filterMonth, 10))
        return false;
      return true;
    });
  }, [accountability, filteredCongIdSet, filterYear, filterMonth]);

  const totalIncome = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'entrada')
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const totalExpense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === 'despesa')
        .reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const consolidatedBalance = totalIncome - totalExpense;

  const pendingReportsCount = filteredAccountability.filter(
    (a) =>
      a.status === 'Em preenchimento' ||
      a.status === 'Enviada' ||
      a.status === 'Em análise'
  ).length;

  const approvedReportsCount = filteredAccountability.filter(
    (a) =>
      a.status === 'Aprovada pelo supervisor' ||
      a.status === 'Recebida pela sede'
  ).length;

  const returnedReportsCount = filteredAccountability.filter(
    (a) => a.status === 'Devolvida'
  ).length;

  // Overdue congregations: active congregations without an approved/submitted report for previous month
  const overdueCongregations = useMemo(() => {
    const now = new Date();
    let prevMonth = now.getMonth(); // 0-11 -> previous month 1-12
    let prevYear = now.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return filteredCongregations.filter((c) => {
      if (c.status !== 'ativa') return false;
      const hasReport = accountability.some(
        (a) =>
          a.congregationId === c.id &&
          a.month === prevMonth &&
          a.year === prevYear &&
          a.status !== 'Em preenchimento' &&
          a.status !== 'Devolvida'
      );
      return !hasReport;
    });
  }, [filteredCongregations, accountability]);

  // Monthly chart data (in blue tones)
  const monthlyChartData = useMemo(() => {
    const yearNum =
      filterYear === 'all' ? currentYear : parseInt(filterYear, 10);
    return MONTH_NAMES_PT.map((name, idx) => {
      const m = idx + 1;
      const monthTx = transactions.filter(
        (t) =>
          !t.reversed &&
          filteredCongIdSet.has(t.congregationId) &&
          t.year === yearNum &&
          t.month === m &&
          (filterCategory === 'all' || t.category === filterCategory)
      );
      const entradas = monthTx
        .filter((t) => t.type === 'entrada')
        .reduce((s, t) => s + t.amount, 0);
      const despesas = monthTx
        .filter((t) => t.type === 'despesa')
        .reduce((s, t) => s + t.amount, 0);
      return {
        mes: name.substring(0, 3),
        Entradas: entradas,
        Despesas: despesas,
      };
    });
  }, [transactions, filteredCongIdSet, filterYear, filterCategory, currentYear]);

  // Balance by congregation
  const balanceByCongregation = useMemo(() => {
    return filteredCongregations.map((c) => {
      const cTx = filteredTransactions.filter((t) => t.congregationId === c.id);
      const inc = cTx
        .filter((t) => t.type === 'entrada')
        .reduce((s, t) => s + t.amount, 0);
      const exp = cTx
        .filter((t) => t.type === 'despesa')
        .reduce((s, t) => s + t.amount, 0);
      const memCount = members.filter(
        (m) => m.congregationId === c.id && m.status === 'Ativo'
      ).length;
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        income: inc,
        expense: exp,
        balance: inc - exp,
        membersCount: memCount,
      };
    });
  }, [filteredCongregations, filteredTransactions, members]);

  // Members by age group
  const ageGroupSummary = useMemo(() => {
    const activeMembers = members.filter(
      (m) => filteredCongIdSet.has(m.congregationId) && m.status === 'Ativo'
    );
    const counts: Record<string, number> = {};
    for (const m of activeMembers) {
      const age = calculateAge(m.birthDate);
      const group = classifyAgeGroup(age, institution?.ageGroups);
      counts[group] = (counts[group] || 0) + 1;
    }
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [members, filteredCongIdSet, institution?.ageGroups]);

  const isCompletelyEmpty =
    congregations.length === 0 &&
    members.length === 0 &&
    transactions.length === 0;

  return (
    <div className="space-y-6">
      {/* Empty System Onboarding Banner */}
      {isCompletelyEmpty && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#0D2B4F]">
                Sistema configurado e pronto para os primeiros cadastros
              </h2>
              <p className="text-xs text-[#64748B]">
                Nenhum dado fictício foi inserido no banco de dados. Siga a
                sequência recomendada abaixo para estruturar sua instituição:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => onNavigate('congregations')}
              className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] hover:bg-[#EAF3FF] hover:border-[#1565C0]/30 text-left transition-colors cursor-pointer space-y-1.5"
            >
              <span className="text-xs font-bold text-[#1565C0]">
                01. Congregações
              </span>
              <p className="text-xs font-semibold text-[#0D2B4F]">
                Cadastrar primeira unidade
              </p>
              <p className="text-[11px] text-[#64748B]">
                Informe código interno, endereço, pastor dirigente e situação.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('supervisors')}
              className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] hover:bg-[#EAF3FF] hover:border-[#1565C0]/30 text-left transition-colors cursor-pointer space-y-1.5"
            >
              <span className="text-xs font-bold text-[#1565C0]">
                02. Supervisores
              </span>
              <p className="text-xs font-semibold text-[#0D2B4F]">
                Vincular supervisores
              </p>
              <p className="text-[11px] text-[#64748B]">
                Associe supervisores às congregações sob sua responsabilidade.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('roles_departments')}
              className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] hover:bg-[#EAF3FF] hover:border-[#1565C0]/30 text-left transition-colors cursor-pointer space-y-1.5"
            >
              <span className="text-xs font-bold text-[#1565C0]">
                03. Cargos e Departamentos
              </span>
              <p className="text-xs font-semibold text-[#0D2B4F]">
                Estruturar lideranças
              </p>
              <p className="text-[11px] text-[#64748B]">
                Defina níveis hierárquicos, cargos e departamentos locais.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F5F8FC] hover:bg-[#EAF3FF] hover:border-[#1565C0]/30 text-left transition-colors cursor-pointer space-y-1.5"
            >
              <span className="text-xs font-bold text-[#1565C0]">
                04. Membros e Financeiro
              </span>
              <p className="text-xs font-semibold text-[#0D2B4F]">
                Iniciar registros
              </p>
              <p className="text-[11px] text-[#64748B]">
                Cadastre membros e movimentações financeiras com comprovantes.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Executive Quick Actions Strip */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0D2B4F]">
            Visão Executiva e Atalhos Rápidos
          </h2>
          <p className="text-xs text-[#64748B]">
            Acompanhe os indicadores consolidados ou acesse diretamente os
            módulos principais
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('finance')}
            className="px-3.5 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Movimentação
          </button>
          <button
            type="button"
            onClick={() => onNavigate('members')}
            className="px-3.5 py-2 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Membro
          </button>
          <button
            type="button"
            onClick={() => onNavigate('accountability')}
            className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#F5F8FC] hover:bg-[#EAF3FF] text-[#0D2B4F] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Prestação de Contas
            <ArrowRight className="w-3.5 h-3.5 text-[#1565C0]" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-[#F5F8FC] hover:bg-[#EAF3FF] text-[#0D2B4F] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Relatórios
            <ArrowRight className="w-3.5 h-3.5 text-[#1565C0]" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#0D2B4F]">
            Filtros Analíticos
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-[#1565C0] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Congregação
            </label>
            <select
              value={filterCongregation}
              onChange={(e) => setFilterCongregation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            >
              <option value="all">Todas as congregações</option>
              {congregations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Supervisor
            </label>
            <select
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            >
              <option value="all">Todos os supervisores</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Mês
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            >
              <option value="all">Todos os meses</option>
              {MONTH_NAMES_PT.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Ano
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            >
              <option value="all">Todos os anos</option>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Categoria Financeira
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            >
              <option value="all">Todas as categorias</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] hover:border-[#1565C0]/30 transition-colors rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Total de Entradas
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] text-[#1565C0] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0D2B4F] tabular-nums mt-2">
            {formatCurrency(totalIncome)}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {filteredTransactions.filter((t) => t.type === 'entrada').length}{' '}
            lançamento(s)
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Total de Despesas
            </span>
            <TrendingDown className="w-4 h-4 text-[#1565C0]" />
          </div>
          <p className="text-2xl font-bold text-[#0D2B4F] tabular-nums mt-2">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {filteredTransactions.filter((t) => t.type === 'despesa').length}{' '}
            lançamento(s)
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Saldo Consolidado
            </span>
            <Wallet className="w-4 h-4 text-[#1565C0]" />
          </div>
          <p
            className={`text-2xl font-bold tabular-nums mt-2 ${
              consolidatedBalance < 0 ? 'text-red-600' : 'text-[#0D2B4F]'
            }`}
          >
            {formatCurrency(consolidatedBalance)}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {filteredCongregations.length} congregação(ões)
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Membros Ativos
            </span>
            <Users className="w-4 h-4 text-[#1565C0]" />
          </div>
          <p className="text-2xl font-bold text-[#0D2B4F] tabular-nums mt-2">
            {
              members.filter(
                (m) =>
                  filteredCongIdSet.has(m.congregationId) &&
                  m.status === 'Ativo'
              ).length
            }
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {
              members.filter((m) => filteredCongIdSet.has(m.congregationId))
                .length
            }{' '}
            cadastrado(s) no total
          </p>
        </div>
      </div>

      {/* Accountability Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-[#64748B]">Prestações Pendentes</p>
            <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
              {pendingReportsCount}
            </p>
          </div>
          <Clock className="w-5 h-5 text-[#1565C0]" />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-[#64748B]">Prestações Aprovadas</p>
            <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
              {approvedReportsCount}
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-[#64748B]">Prestações Devolvidas</p>
            <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
              {returnedReportsCount}
            </p>
          </div>
          <RotateCcw className="w-5 h-5 text-amber-600" />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-[#64748B]">Congregações Atrasadas</p>
            <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
              {overdueCongregations.length}
            </p>
          </div>
          <AlertTriangle
            className={`w-5 h-5 ${
              overdueCongregations.length > 0
                ? 'text-red-600'
                : 'text-[#64748B]'
            }`}
          />
        </div>
      </div>

      {/* Overdue Alert if any */}
      {overdueCongregations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-semibold">
                Atenção: {overdueCongregations.length} congregação(ões) ativa(s)
                sem prestação de contas enviada referente ao mês anterior
              </p>
              <p className="text-amber-800 mt-0.5">
                {overdueCongregations.map((c) => c.name).join(', ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('accountability')}
            className="px-3.5 py-1.5 rounded-lg bg-[#1565C0] text-white text-xs font-medium shrink-0 cursor-pointer"
          >
            Verificar Prestações
          </button>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0D2B4F]">
                Entradas e Despesas Mensais
              </h3>
              <p className="text-xs text-[#64748B]">
                Comparativo financeiro ao longo do ano selecionado
              </p>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[#E2E8F0] rounded-lg bg-[#F5F8FC] p-6">
              <FileCheck2 className="w-8 h-8 text-[#1565C0] mb-2" />
              <p className="text-sm font-semibold text-[#0D2B4F]">
                Nenhuma movimentação financeira registrada
              </p>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm">
                Os gráficos serão exibidos automaticamente assim que entradas ou
                despesas forem lançadas.
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="Entradas"
                    fill="#1565C0"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Despesas"
                    fill="#64B5F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Age Group Distribution */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-bold text-[#0D2B4F]">
            Membros por Faixa Etária
          </h3>
          <p className="text-xs text-[#64748B] mb-4">
            Classificação automática por idade
          </p>

          {ageGroupSummary.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[#E2E8F0] rounded-lg bg-[#F5F8FC] p-6">
              <Users className="w-8 h-8 text-[#1565C0] mb-2" />
              <p className="text-sm font-semibold text-[#0D2B4F]">
                Nenhum membro ativo
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Cadastre membros com data de nascimento para visualizar a
                distribuição etária.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ageGroupSummary.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-b-0"
                >
                  <span className="text-xs font-medium text-[#172B4D]">
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-[#1565C0] tabular-nums">
                    {item.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Balance by Congregation Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Resumo por Congregação
            </h3>
            <p className="text-xs text-[#64748B]">
              Entradas, despesas, saldo e membros ativos por unidade
            </p>
          </div>
        </div>

        {balanceByCongregation.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="w-8 h-8 text-[#1565C0] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#0D2B4F]">
              Nenhuma congregação cadastrada
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Cadastre as congregações da instituição para acompanhar os
              resultados individuais e consolidados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Congregação</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Membros Ativos</th>
                  <th className="py-3 px-4 text-right">Entradas</th>
                  <th className="py-3 px-4 text-right">Despesas</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {balanceByCongregation.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#F5F8FC] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {row.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">
                      {row.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          row.status === 'ativa'
                            ? 'text-emerald-700'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {row.status === 'ativa' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {row.membersCount}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#172B4D]">
                      {formatCurrency(row.income)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#64748B]">
                      {formatCurrency(row.expense)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold tabular-nums ${
                        row.balance < 0 ? 'text-red-600' : 'text-[#0D2B4F]'
                      }`}
                    >
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
