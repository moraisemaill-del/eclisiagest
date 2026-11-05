import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Send,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  FileText,
  Trash2,
  Eye,
  Paperclip,
} from 'lucide-react';
import {
  AccountabilityReport,
  AccountabilityStatus,
  Congregation,
  FinancialTransaction,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  submitAccountabilityReport,
  reviewAccountabilityReport,
  deleteAccountabilityReport,
} from '../services/firestoreService.ts';
import {
  exportAccountabilitySpreadsheet,
  exportAccountabilityPDF,
  exportReportToExcel,
} from '../services/exportService.ts';
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  MONTH_NAMES_PT,
} from '../lib/formatters.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface AccountabilityViewProps {
  accountability: AccountabilityReport[];
  congregations: Congregation[];
  transactions: FinancialTransaction[];
}

export const AccountabilityView: React.FC<AccountabilityViewProps> = ({
  accountability,
  congregations,
  transactions,
}) => {
  const { firebaseUser, userProfile, institution, isSedeAdmin, hasPermission } =
    useAuth();

  const now = new Date();
  const [selectedCongId, setSelectedCongId] = useState<string>(
    userProfile?.congregationId || congregations[0]?.id || ''
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Table filters
  const [filterCong, setFilterCong] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [reviewModal, setReviewModal] = useState<{
    report: AccountabilityReport;
    targetStatus: AccountabilityStatus;
  } | null>(null);
  const [justification, setJustification] = useState('');
  const [historyModal, setHistoryModal] =
    useState<AccountabilityReport | null>(null);
  const [inspectReport, setInspectReport] =
    useState<AccountabilityReport | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AccountabilityReport | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canCreateFinance = isSedeAdmin || hasPermission('createFinance');
  const canApprove =
    isSedeAdmin ||
    userProfile?.role === 'supervisor' ||
    hasPermission('approveAccountability');

  // Transactions for selected congregation + month + year
  const periodTransactions = useMemo(() => {
    if (!selectedCongId) return [];
    return transactions.filter(
      (t) =>
        !t.reversed &&
        t.congregationId === selectedCongId &&
        t.month === selectedMonth &&
        t.year === selectedYear
    );
  }, [transactions, selectedCongId, selectedMonth, selectedYear]);

  const missingReceipts = useMemo(
    () =>
      periodTransactions.filter((t) => t.type === 'despesa' && !t.receiptUrl),
    [periodTransactions]
  );

  const periodIncome = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'entrada')
        .reduce((s, t) => s + t.amount, 0),
    [periodTransactions]
  );

  const periodExpense = useMemo(
    () =>
      periodTransactions
        .filter((t) => t.type === 'despesa')
        .reduce((s, t) => s + t.amount, 0),
    [periodTransactions]
  );

  const periodBalance = periodIncome - periodExpense;

  const currentReport = useMemo(() => {
    return accountability.find(
      (a) =>
        a.congregationId === selectedCongId &&
        a.month === selectedMonth &&
        a.year === selectedYear
    );
  }, [accountability, selectedCongId, selectedMonth, selectedYear]);

  const filteredReports = useMemo(() => {
    return accountability.filter((rep) => {
      if (filterCong !== 'all' && rep.congregationId !== filterCong) return false;
      if (filterStatus !== 'all' && rep.status !== filterStatus) return false;
      return true;
    });
  }, [accountability, filterCong, filterStatus]);

  const inspectTransactions = useMemo(() => {
    if (!inspectReport) return [];
    return transactions
      .filter(
        (t) =>
          !t.reversed &&
          t.congregationId === inspectReport.congregationId &&
          t.month === inspectReport.month &&
          t.year === inspectReport.year
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [inspectReport, transactions]);

  const getCongName = (id: string) =>
    congregations.find((c) => c.id === id)?.name || id;

  const handleSubmitPeriod = async () => {
    if (!firebaseUser || !userProfile || !selectedCongId) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await submitAccountabilityReport(
        selectedCongId,
        selectedMonth,
        selectedYear,
        periodTransactions,
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        },
        currentReport
      );
      setSuccessMsg(
        'Prestação de contas fechada e enviada para análise do supervisor.'
      );
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar prestação de contas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile || !reviewModal) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await reviewAccountabilityReport(
        reviewModal.report,
        reviewModal.targetStatus,
        justification,
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        }
      );
      setReviewModal(null);
      setJustification('');
      setSuccessMsg(
        `Prestação de contas atualizada para "${reviewModal.targetStatus}".`
      );
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar prestação de contas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!firebaseUser || !userProfile || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const label = `${getCongName(deleteTarget.congregationId)} (${
        MONTH_NAMES_PT[deleteTarget.month - 1]
      }/${deleteTarget.year})`;
      await deleteAccountabilityReport(deleteTarget.id, label, {
        uid: firebaseUser.uid,
        name: userProfile.name,
        email: userProfile.email,
      });
      setDeleteTarget(null);
      setSuccessMsg(`Prestação de contas "${label}" excluída com sucesso.`);
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir prestação de contas.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCurrentPeriod = (format: 'xlsx' | 'pdf') => {
    if (!selectedCongId) return;
    const cong = congregations.find((c) => c.id === selectedCongId);
    const opts = {
      institution,
      congregation: cong,
      congregationName: cong?.name || selectedCongId,
      month: selectedMonth,
      year: selectedYear,
      report: currentReport,
      transactions: periodTransactions,
    };
    if (format === 'xlsx') {
      exportAccountabilitySpreadsheet(opts);
    } else {
      exportAccountabilityPDF(opts);
    }
  };

  const handleExportReportRow = (rep: AccountabilityReport) => {
    const cong = congregations.find((c) => c.id === rep.congregationId);
    const repTx = transactions.filter(
      (t) =>
        !t.reversed &&
        t.congregationId === rep.congregationId &&
        t.month === rep.month &&
        t.year === rep.year
    );
    exportAccountabilitySpreadsheet({
      institution,
      congregation: cong,
      congregationName: cong?.name || rep.congregationId,
      month: rep.month,
      year: rep.year,
      report: rep,
      transactions: repTx,
    });
  };

  const handleExportAllList = () => {
    exportReportToExcel({
      title: 'Relatório Geral de Prestações de Contas',
      institutionName: institution?.name || 'Instituição Eclesiástica',
      columns: [
        'Competência',
        'Congregação',
        'Entradas (R$)',
        'Despesas (R$)',
        'Saldo (R$)',
        'Situação',
        'Enviado por',
        'Data de Envio',
        'Analisado por',
      ],
      rows: filteredReports.map((r) => [
        `${MONTH_NAMES_PT[r.month - 1]}/${r.year}`,
        getCongName(r.congregationId),
        Number(r.totalIncome.toFixed(2)),
        Number(r.totalExpense.toFixed(2)),
        Number(r.balance.toFixed(2)),
        r.status,
        r.submittedByName || '—',
        r.submittedAt ? formatDateTimeBR(r.submittedAt) : '—',
        r.reviewedByName || '—',
      ]),
      filenameBase: 'lista_prestacoes_de_contas',
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Enviadas / Em Análise
          </span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {
              accountability.filter(
                (a) => a.status === 'Enviada' || a.status === 'Em análise'
              ).length
            }
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Aprovadas / Recebidas
          </span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {
              accountability.filter(
                (a) =>
                  a.status === 'Aprovada pelo supervisor' ||
                  a.status === 'Recebida pela sede'
              ).length
            }
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Devolvidas</span>
          <p className="text-xl font-bold text-red-600 tabular-nums mt-1">
            {accountability.filter((a) => a.status === 'Devolvida').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Total de Prestações</span>
          <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
            {accountability.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Monthly Closure & Submission Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#0D2B4F]">
              Fechamento Mensal e Envio de Prestação de Contas
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Selecione a congregação e a competência mensal para conferir os
              comprovantes, extrair a planilha ou enviar para aprovação
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedCongId}
              onChange={(e) => setSelectedCongId(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="">Selecione a congregação...</option>
              {congregations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              {MONTH_NAMES_PT.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              {[
                now.getFullYear() - 1,
                now.getFullYear(),
                now.getFullYear() + 1,
              ].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedCongId ? (
          <div className="p-6 text-center text-xs text-[#64748B]">
            Selecione uma congregação para visualizar o resumo mensal.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B]">Entradas</span>
                <p className="text-lg font-bold text-[#0D2B4F] tabular-nums mt-1">
                  {formatCurrency(periodIncome)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B]">Despesas</span>
                <p className="text-lg font-bold text-[#0D2B4F] tabular-nums mt-1">
                  {formatCurrency(periodExpense)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <span className="text-xs text-[#64748B]">Saldo do Mês</span>
                <p
                  className={`text-lg font-bold tabular-nums mt-1 ${
                    periodBalance < 0 ? 'text-red-600' : 'text-[#0D2B4F]'
                  }`}
                >
                  {formatCurrency(periodBalance)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#EAF3FF] border border-[#1565C0]/20">
                <span className="text-xs text-[#0D2B4F]">Situação Atual</span>
                <p className="text-sm font-bold text-[#1565C0] mt-1.5">
                  {currentReport?.status || 'Em preenchimento'}
                </p>
              </div>
            </div>

            {missingReceipts.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Bloqueio de Envio: {missingReceipts.length} despesa(s) sem
                  comprovante anexado
                </p>
                <p className="text-amber-800">
                  Despesas pendentes:{' '}
                  {missingReceipts.map((d) => d.description).join(', ')}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportCurrentPeriod('xlsx')}
                  className="px-4 py-2 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Extrair Planilha (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCurrentPeriod('pdf')}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F5F8FC] text-[#172B4D] text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#1565C0]" />
                  Extrair PDF
                </button>
              </div>

              {canCreateFinance &&
                (!currentReport ||
                  currentReport.status === 'Em preenchimento' ||
                  currentReport.status === 'Devolvida') && (
                  <button
                    type="button"
                    disabled={submitting || missingReceipts.length > 0}
                    onClick={handleSubmitPeriod}
                    className="px-5 py-2.5 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {submitting
                      ? 'Enviando...'
                      : 'Fechar Mês e Enviar Prestação'}
                  </button>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Accountability List & Approval Workflow */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Histórico e Análise de Prestações de Contas
            </h3>
            <p className="text-xs text-[#64748B]">
              Aprovação exclusiva por supervisor autorizado ou Sede Geral
              (proibida a auto-aprovação)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCong}
              onChange={(e) => setFilterCong(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="all">Todas as congregações</option>
              {congregations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="all">Todas as situações</option>
              <option value="Enviada">Enviada</option>
              <option value="Em análise">Em análise</option>
              <option value="Aprovada pelo supervisor">
                Aprovada pelo supervisor
              </option>
              <option value="Devolvida">Devolvida</option>
              <option value="Recebida pela sede">Recebida pela sede</option>
            </select>

            {filteredReports.length > 0 && (
              <button
                type="button"
                onClick={handleExportAllList}
                className="px-3 py-1.5 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Lista (.xlsx)
              </button>
            )}
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck2 className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Nenhuma prestação de contas encontrada
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              Após registrar as movimentações do mês e anexar os comprovantes,
              feche o mês acima para enviar a prestação.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Congregação</th>
                  <th className="py-3 px-4 text-right">Entradas</th>
                  <th className="py-3 px-4 text-right">Despesas</th>
                  <th className="py-3 px-4 text-right">Saldo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Enviado por</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filteredReports.map((rep) => {
                  const isSelf =
                    rep.submittedByUid &&
                    firebaseUser?.uid === rep.submittedByUid;
                  return (
                    <tr
                      key={rep.id}
                      className="hover:bg-[#F5F8FC] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#0D2B4F] tabular-nums">
                        {MONTH_NAMES_PT[rep.month - 1]} / {rep.year}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#172B4D]">
                        {getCongName(rep.congregationId)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {formatCurrency(rep.totalIncome)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#64748B]">
                        {formatCurrency(rep.totalExpense)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-[#0D2B4F]">
                        {formatCurrency(rep.balance)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            rep.status === 'Aprovada pelo supervisor' ||
                            rep.status === 'Recebida pela sede'
                              ? 'text-emerald-700'
                              : rep.status === 'Devolvida'
                              ? 'text-red-600'
                              : 'text-[#1565C0]'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        <div>{rep.submittedByName || '—'}</div>
                        <div className="text-[11px]">
                          {formatDateTimeBR(rep.submittedAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleExportReportRow(rep)}
                            className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF] cursor-pointer"
                            title="Extrair planilha (.xlsx) desta prestação"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectReport(rep)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0D2B4F] hover:bg-[#EAF3FF] cursor-pointer"
                            title="Visualizar lançamentos do período"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setHistoryModal(rep)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0D2B4F] hover:bg-[#EAF3FF] cursor-pointer"
                            title="Histórico de aprovações"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {canApprove &&
                            !isSelf &&
                            (rep.status === 'Enviada' ||
                              rep.status === 'Em análise') && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      report: rep,
                                      targetStatus: 'Aprovada pelo supervisor',
                                    });
                                    setJustification('');
                                    setError(null);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium cursor-pointer"
                                >
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      report: rep,
                                      targetStatus: 'Devolvida',
                                    });
                                    setJustification('');
                                    setError(null);
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium cursor-pointer"
                                >
                                  Devolver
                                </button>
                              </>
                            )}

                          {isSedeAdmin &&
                            rep.status === 'Aprovada pelo supervisor' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewModal({
                                    report: rep,
                                    targetStatus: 'Recebida pela sede',
                                  });
                                  setJustification('');
                                  setError(null);
                                }}
                                className="px-2.5 py-1 rounded-md bg-[#1565C0] hover:bg-[#1976D2] text-white text-[11px] font-medium cursor-pointer"
                              >
                                Receber na Sede
                              </button>
                            )}

                          {isSedeAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(rep)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Excluir prestação de contas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={Boolean(reviewModal)}
        onClose={() => setReviewModal(null)}
        title={`Prestação de Contas — ${reviewModal?.targetStatus || ''}`}
        subtitle={
          reviewModal
            ? `${getCongName(reviewModal.report.congregationId)} · ${
                MONTH_NAMES_PT[reviewModal.report.month - 1]
              }/${reviewModal.report.year}`
            : ''
        }
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleConfirmReview} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              {reviewModal?.targetStatus === 'Devolvida'
                ? 'Justificativa da Devolução (Obrigatória) *'
                : 'Observação / Parecer'}
            </label>
            <textarea
              required={reviewModal?.targetStatus === 'Devolvida'}
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                reviewModal?.targetStatus === 'Devolvida'
                  ? 'Informe o que precisa ser corrigido...'
                  : 'Observações opcionais sobre a conferência...'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>
          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReviewModal(null)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#1565C0] text-white text-xs font-medium cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inspect Period Transactions Modal */}
      <Modal
        isOpen={Boolean(inspectReport)}
        onClose={() => setInspectReport(null)}
        title="Lançamentos da Prestação de Contas"
        subtitle={
          inspectReport
            ? `${getCongName(inspectReport.congregationId)} · ${
                MONTH_NAMES_PT[inspectReport.month - 1]
              }/${inspectReport.year}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        <div className="space-y-4">
          {inspectReport && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] text-xs">
              <div className="flex flex-wrap gap-4">
                <span>
                  Entradas:{' '}
                  <strong className="text-[#0D2B4F]">
                    {formatCurrency(inspectReport.totalIncome)}
                  </strong>
                </span>
                <span>
                  Despesas:{' '}
                  <strong className="text-[#0D2B4F]">
                    {formatCurrency(inspectReport.totalExpense)}
                  </strong>
                </span>
                <span>
                  Saldo:{' '}
                  <strong className="text-[#1565C0]">
                    {formatCurrency(inspectReport.balance)}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleExportReportRow(inspectReport)}
                className="px-3 py-1.5 rounded-lg bg-[#1565C0] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Extrair Planilha (.xlsx)
              </button>
            </div>
          )}

          {inspectTransactions.length === 0 ? (
            <p className="text-xs text-[#64748B] py-6 text-center">
              Nenhum lançamento ativo encontrado para esta competência.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#EAF3FF] text-[#0D2B4F] font-semibold">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Categoria / Descrição</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-center">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {inspectTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 tabular-nums text-[#64748B]">
                        {formatDateBR(t.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-medium ${
                            t.type === 'entrada'
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {t.type === 'entrada' ? 'Entrada' : 'Despesa'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#172B4D]">
                          {t.category}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {t.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {t.receiptUrl ? (
                          <a
                            href={t.receiptUrl}
                            download={t.receiptName || 'comprovante'}
                            className="inline-flex items-center gap-1 text-[#1565C0] hover:underline font-medium"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            Baixar
                          </a>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={Boolean(historyModal)}
        onClose={() => setHistoryModal(null)}
        title="Histórico da Prestação de Contas"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-3 text-xs">
          {(historyModal?.history || []).map((h, i) => (
            <div
              key={i}
              className="p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] space-y-1"
            >
              <div className="flex items-center justify-between font-semibold text-[#0D2B4F]">
                <span>{h.status}</span>
                <span className="tabular-nums text-[#64748B]">
                  {formatDateTimeBR(h.timestamp)}
                </span>
              </div>
              <p className="text-[#172B4D]">Responsável: {h.userName}</p>
              {h.note && <p className="text-[#64748B]">{h.note}</p>}
            </div>
          ))}
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteReport}
        title="Excluir Prestação de Contas"
        itemName={
          deleteTarget
            ? `${getCongName(deleteTarget.congregationId)} — ${
                MONTH_NAMES_PT[deleteTarget.month - 1]
              }/${deleteTarget.year}`
            : ''
        }
        description="Os lançamentos financeiros do mês permanecerão preservados no módulo Financeiro, mas o registro de fechamento desta prestação será removido."
        loading={deleting}
      />
    </div>
  );
};
