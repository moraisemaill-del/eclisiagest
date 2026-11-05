import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Power,
  Eye,
  MapPin,
  Phone,
  Mail,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Congregation,
  Supervisor,
  Member,
  Department,
  FinancialTransaction,
  CongregationStatus,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  saveCongregation,
  deleteCongregation,
} from '../services/firestoreService.ts';
import { exportReportToExcel } from '../services/exportService.ts';
import { formatDateBR, formatCurrency } from '../lib/formatters.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface CongregationsViewProps {
  congregations: Congregation[];
  supervisors: Supervisor[];
  members: Member[];
  departments: Department[];
  transactions: FinancialTransaction[];
}

export const CongregationsView: React.FC<CongregationsViewProps> = ({
  congregations,
  supervisors,
  members,
  departments,
  transactions,
}) => {
  const { firebaseUser, userProfile, isSedeAdmin, hasPermission } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CongregationStatus>(
    'all'
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [detailCong, setDetailCong] = useState<Congregation | null>(null);
  const [editing, setEditing] = useState<Congregation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Congregation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [status, setStatus] = useState<CongregationStatus>('ativa');
  const [notes, setNotes] = useState('');

  const canManage = isSedeAdmin || hasPermission('manageCongregations');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return congregations.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.pastorName || '').toLowerCase().includes(q)
      );
    });
  }, [congregations, search, statusFilter]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setCode('');
    setAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setPhone('');
    setEmail('');
    setPastorName('');
    setSupervisorId('');
    setOpenedAt('');
    setStatus('ativa');
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (c: Congregation) => {
    setEditing(c);
    setName(c.name);
    setCode(c.code);
    setAddress(c.address || '');
    setCity(c.city || '');
    setState(c.state || '');
    setZipCode(c.zipCode || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setPastorName(c.pastorName || '');
    setSupervisorId(c.supervisorId || '');
    setOpenedAt(c.openedAt || '');
    setStatus(c.status);
    setNotes(c.notes || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!name.trim() || !code.trim()) {
      setError('Nome da congregação e código interno são obrigatórios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const sup = supervisors.find((s) => s.id === supervisorId);
      await saveCongregation(
        {
          name: name.trim(),
          code: code.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          phone: phone.trim(),
          email: email.trim(),
          pastorName: pastorName.trim(),
          supervisorId: supervisorId || '',
          supervisorName: sup ? sup.name : '',
          openedAt: openedAt || '',
          status,
          notes: notes.trim(),
        },
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        },
        editing?.id
      );
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar congregação.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (c: Congregation) => {
    if (!firebaseUser || !userProfile || !canManage) return;
    const nextStatus: CongregationStatus =
      c.status === 'ativa' ? 'inativa' : 'ativa';
    await saveCongregation(
      {
        name: c.name,
        code: c.code,
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        zipCode: c.zipCode || '',
        phone: c.phone || '',
        email: c.email || '',
        pastorName: c.pastorName || '',
        supervisorId: c.supervisorId || '',
        supervisorName: c.supervisorName || '',
        openedAt: c.openedAt || '',
        status: nextStatus,
        notes: c.notes || '',
      },
      {
        uid: firebaseUser.uid,
        name: userProfile.name,
        email: userProfile.email,
      },
      c.id
    );
  };

  const handleConfirmDelete = async () => {
    if (!firebaseUser || !userProfile || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCongregation(deleteTarget.id, deleteTarget.name, {
        uid: firebaseUser.uid,
        name: userProfile.name,
        email: userProfile.email,
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Total de Congregações</span>
          <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
            {congregations.length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Unidades Ativas</span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {congregations.filter((c) => c.status === 'ativa').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Unidades Inativas</span>
          <p className="text-xl font-bold text-[#64748B] tabular-nums mt-1">
            {congregations.filter((c) => c.status === 'inativa').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Membros Vinculados</span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {members.filter((m) => m.status === 'Ativo').length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código, cidade ou pastor..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | CongregationStatus)
            }
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
          >
            <option value="all">Todas</option>
            <option value="ativa">Ativas</option>
            <option value="inativa">Inativas</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportReportToExcel({
                  title: 'Cadastro de Congregações',
                  institutionName: 'Instituição Eclesiástica',
                  columns: [
                    'Código',
                    'Congregação',
                    'Cidade/UF',
                    'Pastor Dirigente',
                    'Supervisor',
                    'Situação',
                  ],
                  rows: filtered.map((c) => [
                    c.code,
                    c.name,
                    [c.city, c.state].filter(Boolean).join('/') || '—',
                    c.pastorName || '—',
                    c.supervisorName || '—',
                    c.status === 'ativa' ? 'Ativa' : 'Inativa',
                  ]),
                  filenameBase: 'congregacoes',
                })
              }
              className="px-3.5 py-2 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar (.xlsx)
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Congregação
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Nenhuma congregação encontrada
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              {congregations.length === 0
                ? 'Cadastre a primeira congregação da instituição para iniciar a gestão de membros, departamentos e financeiro.'
                : 'Nenhuma congregação corresponde aos filtros aplicados.'}
            </p>
            {canManage && congregations.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 rounded-lg bg-[#1565C0] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Congregação
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Congregação</th>
                  <th className="py-3 px-4">Cidade / UF</th>
                  <th className="py-3 px-4">Pastor Dirigente</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#F5F8FC] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[#64748B]">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {c.city
                        ? `${c.city}${c.state ? ` / ${c.state}` : ''}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-[#172B4D]">
                      {c.pastorName || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {c.supervisorName || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          c.status === 'ativa'
                            ? 'text-emerald-700'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {c.status === 'ativa' ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailCong(c)}
                          className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                          title="Visualizar detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(c)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0D2B4F] hover:bg-[#EAF3FF]"
                              title={
                                c.status === 'ativa' ? 'Desativar' : 'Ativar'
                              }
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            {isSedeAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(c)}
                                className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Excluir congregação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Congregação' : 'Nova Congregação'}
        subtitle="Preencha os dados cadastrais e de liderança da congregação"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Nome da Congregação *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Código Interno *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: CONG-01"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Pastor Dirigente
              </label>
              <input
                type="text"
                value={pastorName}
                onChange={(e) => setPastorName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Supervisor Responsável
              </label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              >
                <option value="">Selecione um supervisor</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Endereço
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                CEP
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Data de Abertura
              </label>
              <input
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Situação
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as CongregationStatus)
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Observações
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#172B4D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar Congregação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={Boolean(detailCong)}
        onClose={() => setDetailCong(null)}
        title={detailCong?.name || ''}
        subtitle={`Código: ${detailCong?.code || ''} · Situação: ${
          detailCong?.status === 'ativa' ? 'Ativa' : 'Inativa'
        }`}
      >
        {detailCong && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <span className="text-[#64748B]">Membros Ativos</span>
                <p className="text-lg font-bold text-[#0D2B4F] tabular-nums mt-0.5">
                  {
                    members.filter(
                      (m) =>
                        m.congregationId === detailCong.id &&
                        m.status === 'Ativo'
                    ).length
                  }
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <span className="text-[#64748B]">Departamentos</span>
                <p className="text-lg font-bold text-[#0D2B4F] tabular-nums mt-0.5">
                  {
                    departments.filter(
                      (d) => d.congregationId === detailCong.id
                    ).length
                  }
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                <span className="text-[#64748B]">Saldo Atual</span>
                <p className="text-lg font-bold text-[#0D2B4F] tabular-nums mt-0.5">
                  {formatCurrency(
                    transactions
                      .filter(
                        (t) =>
                          !t.reversed && t.congregationId === detailCong.id
                      )
                      .reduce(
                        (s, t) =>
                          t.type === 'entrada' ? s + t.amount : s - t.amount,
                        0
                      )
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#E2E8F0] pt-4">
              <p>
                <strong className="text-[#0D2B4F]">Pastor Dirigente:</strong>{' '}
                {detailCong.pastorName || 'Não informado'}
              </p>
              <p>
                <strong className="text-[#0D2B4F]">
                  Supervisor Responsável:
                </strong>{' '}
                {detailCong.supervisorName || 'Não vinculado'}
              </p>
              <p>
                <strong className="text-[#0D2B4F]">Data de Abertura:</strong>{' '}
                {formatDateBR(detailCong.openedAt)}
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1565C0]" />
                <span>
                  {[
                    detailCong.address,
                    detailCong.city,
                    detailCong.state,
                    detailCong.zipCode,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Endereço não informado'}
                </span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#1565C0]" />
                <span>{detailCong.phone || 'Telefone não informado'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#1565C0]" />
                <span>{detailCong.email || 'E-mail não informado'}</span>
              </p>
              {detailCong.notes && (
                <div className="pt-2">
                  <strong className="text-[#0D2B4F]">Observações:</strong>
                  <p className="text-[#64748B] mt-1">{detailCong.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Congregação"
        itemName={deleteTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
};
