import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  RotateCcw,
  FileText,
  Upload,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  FinancialTransaction,
  TransactionType,
  Congregation,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  createTransaction,
  reverseTransaction,
  deleteTransaction,
} from '../services/firestoreService.ts';
import { exportReportToExcel } from '../services/exportService.ts';
import {
  formatCurrency,
  formatDateBR,
  MONTH_NAMES_PT,
  readFileAsDataUrl,
} from '../lib/formatters.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface FinanceViewProps {
  transactions: FinancialTransaction[];
  congregations: Congregation[];
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  congregations,
}) => {
  const { firebaseUser, userProfile, isSedeAdmin, hasPermission } = useAuth();
  const canCreate = isSedeAdmin || hasPermission('createFinance');

  const now = new Date();
  const [filterCong, setFilterCong] = useState('all');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterMonth, setFilterMonth] = useState<string>(
    String(now.getMonth() + 1)
  );
  const [filterYear, setFilterYear] = useState<string>(
    String(now.getFullYear())
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [reverseTarget, setReverseTarget] =
    useState<FinancialTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [previewReceipt, setPreviewReceipt] =
    useState<FinancialTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<FinancialTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<TransactionType>('entrada');
  const [category, setCategory] = useState<string>(INCOME_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [congregationId, setCongregationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterCong !== 'all' && t.congregationId !== filterCong) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterYear !== 'all' && t.year !== parseInt(filterYear, 10))
        return false;
      if (filterMonth !== 'all' && t.month !== parseInt(filterMonth, 10))
        return false;
      return true;
    });
  }, [transactions, filterCong, filterType, filterMonth, filterYear]);

  const activeFiltered = useMemo(
    () => filtered.filter((t) => !t.reversed),
    [filtered]
  );

  const totalIncome = useMemo(
    () =>
      activeFiltered
        .filter((t) => t.type === 'entrada')
        .reduce((s, t) => s + t.amount, 0),
    [activeFiltered]
  );

  const totalExpense = useMemo(
    () =>
      activeFiltered
        .filter((t) => t.type === 'despesa')
        .reduce((s, t) => s + t.amount, 0),
    [activeFiltered]
  );

  const balance = totalIncome - totalExpense;

  const openCreateModal = () => {
    setType('entrada');
    setCategory(INCOME_CATEGORIES[0]);
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCongregationId(
      userProfile?.congregationId || congregations[0]?.id || ''
    );
    setPaymentMethod(PAYMENT_METHODS[0]);
    setNotes('');
    setReceiptUrl('');
    setReceiptName('');
    setError(null);
    setModalOpen(true);
  };

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(
      nextType === 'entrada' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
    );
  };

  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, 350);
      setReceiptUrl(dataUrl);
      setReceiptName(file.name);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      setError('Informe um valor financeiro válido maior que zero.');
      return;
    }
    if (!congregationId || !date || !description.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const [yStr, mStr] = date.split('-');
    const yearNum = parseInt(yStr, 10);
    const monthNum = parseInt(mStr, 10);

    setSaving(true);
    setError(null);
    try {
      await createTransaction(
        {
          type,
          category,
          description: description.trim(),
          amount: numAmount,
          date,
          month: monthNum,
          year: yearNum,
          createdByUid: firebaseUser.uid,
          createdByName: userProfile.name,
          congregationId,
          paymentMethod,
          notes: notes.trim(),
          receiptUrl: receiptUrl || '',
          receiptName: receiptName || '',
        },
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        }
      );
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar movimentação.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile || !reverseTarget) return;
    setSaving(true);
    setError(null);
    try {
      await reverseTransaction(reverseTarget, reversalReason, {
        uid: firebaseUser.uid,
        name: userProfile.name,
        email: userProfile.email,
      });
      setReverseTarget(null);
      setReversalReason('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao estornar lançamento.');
    } finally {
      setSaving(false);
    }
  };

  const getCongName = (id: string) =>
    congregations.find((c) => c.id === id)?.name || '—';

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Entradas no Período
            </span>
            <TrendingUp className="w-4 h-4 text-[#1565C0]" />
          </div>
          <p className="text-2xl font-bold text-[#0D2B4F] tabular-nums mt-2">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Despesas no Período
            </span>
            <TrendingDown className="w-4 h-4 text-[#1565C0]" />
          </div>
          <p className="text-2xl font-bold text-[#0D2B4F] tabular-nums mt-2">
            {formatCurrency(totalExpense)}
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Saldo Líquido
            </span>
            <Wallet className="w-4 h-4 text-[#1565C0]" />
          </div>
          <p
            className={`text-2xl font-bold tabular-nums mt-2 ${
              balance < 0 ? 'text-red-600' : 'text-[#0D2B4F]'
            }`}
          >
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Filters & Action */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
          <select
            value={filterCong}
            onChange={(e) => setFilterCong(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Todas as congregações</option>
            {congregations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as 'all' | TransactionType)
            }
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Entradas e Despesas</option>
            <option value="entrada">Somente Entradas</option>
            <option value="despesa">Somente Despesas</option>
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Todos os meses</option>
            {MONTH_NAMES_PT.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Todos os anos</option>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportReportToExcel({
                  title: 'Extrato Financeiro',
                  institutionName: 'Instituição Eclesiástica',
                  columns: [
                    'Data',
                    'Congregação',
                    'Tipo',
                    'Categoria',
                    'Descrição',
                    'Pagamento',
                    'Valor (R$)',
                    'Situação',
                  ],
                  rows: filtered.map((t) => [
                    formatDateBR(t.date),
                    getCongName(t.congregationId),
                    t.type === 'entrada' ? 'Entrada' : 'Despesa',
                    t.category,
                    t.description,
                    t.paymentMethod || '—',
                    Number(t.amount.toFixed(2)),
                    t.reversed ? 'Estornado' : 'Ativo',
                  ]),
                  filenameBase: 'extrato_financeiro',
                })
              }
              className="px-3.5 py-2 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Extrato (.xlsx)
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              disabled={congregations.length === 0}
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Movimentação
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Nenhuma movimentação financeira no período
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              Registre dízimos, ofertas, doações ou despesas. Lembre-se de anexar
              o comprovante em todas as despesas para o envio da prestação de
              contas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Congregação</th>
                  <th className="py-3 px-4">Tipo / Categoria</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Comprovante</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-[#F5F8FC] transition-colors ${
                      t.reversed ? 'opacity-55 bg-slate-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 tabular-nums text-[#64748B]">
                      {formatDateBR(t.date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#172B4D]">
                      {getCongName(t.congregationId)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          t.type === 'entrada'
                            ? 'text-[#1565C0]'
                            : 'text-[#0D2B4F]'
                        }`}
                      >
                        {t.type === 'entrada' ? 'Entrada' : 'Despesa'}
                      </span>
                      <span className="text-[#64748B]"> · {t.category}</span>
                    </td>
                    <td className="py-3 px-4 text-[#172B4D]">
                      <div className={t.reversed ? 'line-through' : ''}>
                        {t.description}
                      </div>
                      {t.reversed && (
                        <div className="text-[11px] text-red-600">
                          Estornado por {t.reversedByName}: {t.reversalReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {t.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt(t)}
                          className="text-[#1565C0] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver anexo
                        </button>
                      ) : t.type === 'despesa' ? (
                        <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Pendente
                        </span>
                      ) : (
                        <span className="text-[#64748B]">—</span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold tabular-nums ${
                        t.reversed
                          ? 'text-[#64748B] line-through'
                          : t.type === 'entrada'
                          ? 'text-[#1565C0]'
                          : 'text-[#0D2B4F]'
                      }`}
                    >
                      {t.type === 'despesa' ? '- ' : '+ '}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {!t.reversed && canCreate && (
                          <button
                            type="button"
                            onClick={() => {
                              setReverseTarget(t);
                              setReversalReason('');
                              setError(null);
                            }}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                            title="Estornar lançamento (auditável)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {isSedeAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Transaction Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova Movimentação Financeira"
        subtitle="Toda despesa deverá possuir comprovante anexado para envio na prestação de contas"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('entrada')}
              className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                type === 'entrada'
                  ? 'bg-[#1565C0] text-white border-[#1565C0]'
                  : 'bg-white text-[#172B4D] border-[#E2E8F0]'
              }`}
            >
              Entrada (Receita)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('despesa')}
              className={`py-2.5 px-4 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                type === 'despesa'
                  ? 'bg-[#0D2B4F] text-white border-[#0D2B4F]'
                  : 'bg-white text-[#172B4D] border-[#E2E8F0]'
              }`}
            >
              Despesa (Saída)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Congregação *
              </label>
              <select
                required
                value={congregationId}
                onChange={(e) => setCongregationId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                <option value="">Selecione...</option>
                {congregations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Categoria *
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                {(type === 'entrada'
                  ? INCOME_CATEGORIES
                  : EXPENSE_CATEGORIES
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Descrição *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Dízimos do culto de domingo / Conta de energia elétrica"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 text-sm tabular-nums bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Comprovante {type === 'despesa' ? '(Obrigatório para prestação de contas)' : '(Opcional)'}
            </label>
            <div className="flex items-center gap-3">
              <label className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#EAF3FF] text-xs font-medium text-[#1565C0] cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {receiptName ? 'Alterar comprovante' : 'Anexar comprovante (Imagem/PDF até 350 KB)'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>
              {receiptName && (
                <span className="text-xs text-emerald-700 font-medium truncate max-w-xs">
                  {receiptName}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1565C0] text-white text-xs font-medium cursor-pointer"
            >
              {saving ? 'Registrando...' : 'Registrar Movimentação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Auditable Reversal Modal */}
      <Modal
        isOpen={Boolean(reverseTarget)}
        onClose={() => setReverseTarget(null)}
        title="Estornar Movimentação Financeira"
        subtitle="O lançamento não será apagado; ficará registrado como estornado na auditoria"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleConfirmReverse} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] text-xs">
            <p className="font-semibold text-[#0D2B4F]">
              {reverseTarget?.description}
            </p>
            <p className="text-[#64748B] mt-0.5 tabular-nums">
              Valor: {formatCurrency(reverseTarget?.amount || 0)} · Data:{' '}
              {formatDateBR(reverseTarget?.date)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Motivo do Estorno *
            </label>
            <textarea
              required
              rows={3}
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Descreva o motivo da correção ou estorno..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>
          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReverseTarget(null)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer"
            >
              {saving ? 'Estornando...' : 'Confirmar Estorno'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Preview Modal */}
      <Modal
        isOpen={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title={`Comprovante — ${previewReceipt?.description || ''}`}
        subtitle={previewReceipt?.receiptName || ''}
      >
        {previewReceipt?.receiptUrl && (
          <div className="space-y-4">
            {previewReceipt.receiptUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={previewReceipt.receiptUrl}
                title="Comprovante PDF"
                className="w-full h-96 border border-[#E2E8F0] rounded-lg"
              />
            ) : (
              <img
                src={previewReceipt.receiptUrl}
                alt="Comprovante"
                className="max-h-96 mx-auto rounded-lg border border-[#E2E8F0] object-contain"
              />
            )}
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!firebaseUser || !userProfile || !deleteTarget) return;
          setDeleting(true);
          try {
            await deleteTransaction(deleteTarget, {
              uid: firebaseUser.uid,
              name: userProfile.name,
              email: userProfile.email,
            });
            setDeleteTarget(null);
          } finally {
            setDeleting(false);
          }
        }}
        title="Excluir Lançamento Financeiro"
        itemName={
          deleteTarget
            ? `${deleteTarget.description} (${formatCurrency(
                deleteTarget.amount
              )})`
            : ''
        }
        description="O lançamento será removido permanentemente do financeiro e a exclusão ficará registrada no Log de Auditoria."
        loading={deleting}
      />
    </div>
  );
};
