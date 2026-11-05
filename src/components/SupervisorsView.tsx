import React, { useState, useMemo } from 'react';
import { UserCheck, Plus, Search, Edit2, Building2, Trash2 } from 'lucide-react';
import {
  Supervisor,
  Congregation,
  AccountabilityReport,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  saveSupervisor,
  deleteSupervisor,
} from '../services/firestoreService.ts';
import { formatDateBR } from '../lib/formatters.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface SupervisorsViewProps {
  supervisors: Supervisor[];
  congregations: Congregation[];
  accountability: AccountabilityReport[];
}

export const SupervisorsView: React.FC<SupervisorsViewProps> = ({
  supervisors,
  congregations,
  accountability,
}) => {
  const { firebaseUser, userProfile, isSedeAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supervisor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supervisor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [congregationIds, setCongregationIds] = useState<string[]>([]);
  const [appointedAt, setAppointedAt] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return supervisors.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    });
  }, [supervisors, search]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setEmail('');
    setBirthDate('');
    setCongregationIds([]);
    setAppointedAt('');
    setStatus('ativo');
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (s: Supervisor) => {
    setEditing(s);
    setName(s.name);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setBirthDate(s.birthDate || '');
    setCongregationIds(s.congregationIds || []);
    setAppointedAt(s.appointedAt || '');
    setStatus(s.status);
    setNotes(s.notes || '');
    setError(null);
    setModalOpen(true);
  };

  const toggleCongregation = (congId: string) => {
    setCongregationIds((prev) =>
      prev.includes(congId)
        ? prev.filter((id) => id !== congId)
        : [...prev, congId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!name.trim()) {
      setError('O nome completo do supervisor é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveSupervisor(
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          birthDate: birthDate || '',
          congregationIds,
          appointedAt: appointedAt || '',
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
      setError(err?.message || 'Erro ao salvar supervisor.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firebaseUser || !userProfile || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupervisor(deleteTarget.id, deleteTarget.name, {
        uid: firebaseUser.uid,
        name: userProfile.name,
        email: userProfile.email,
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const getCongregationNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Nenhuma vinculada';
    return ids
      .map((id) => congregations.find((c) => c.id === id)?.name || id)
      .join(', ');
  };

  const getPendingCount = (ids: string[]) => {
    return accountability.filter(
      (a) =>
        ids.includes(a.congregationId) &&
        (a.status === 'Enviada' || a.status === 'Em análise')
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Supervisores Ativos</span>
          <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
            {supervisors.filter((s) => s.status === 'ativo').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Congregações Supervisionadas
          </span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {
              new Set(
                supervisors.flatMap((s) => s.congregationIds || [])
              ).size
            }
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Prestações Aguardando Análise
          </span>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {
              accountability.filter(
                (a) => a.status === 'Enviada' || a.status === 'Em análise'
              ).length
            }
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar supervisor por nome ou e-mail..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
          />
        </div>

        {isSedeAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Supervisor
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Nenhum supervisor cadastrado
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              Cadastre supervisores e vincule-os às congregações sob sua
              responsabilidade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4">Congregações Supervisionadas</th>
                  <th className="py-3 px-4">Nomeação</th>
                  <th className="py-3 px-4 text-right">Pendências</th>
                  <th className="py-3 px-4">Situação</th>
                  {isSedeAdmin && (
                    <th className="py-3 px-4 text-right">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[#F5F8FC] transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      <div>{s.phone || '—'}</div>
                      <div className="text-[11px]">{s.email || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-[#172B4D] max-w-xs">
                      {getCongregationNames(s.congregationIds)}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] tabular-nums">
                      {formatDateBR(s.appointedAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#1565C0]">
                      {getPendingCount(s.congregationIds)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          s.status === 'ativo'
                            ? 'text-emerald-700'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {s.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {isSedeAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                            title="Editar supervisor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Excluir supervisor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Supervisor' : 'Novo Supervisor'}
        subtitle="Vincule o supervisor às congregações sob sua responsabilidade"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Data de Nomeação
              </label>
              <input
                type="date"
                value={appointedAt}
                onChange={(e) => setAppointedAt(e.target.value)}
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
                  setStatus(e.target.value as 'ativo' | 'inativo')
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Congregações Supervisionadas
            </label>
            {congregations.length === 0 ? (
              <p className="text-xs text-[#64748B] p-3 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0]">
                Nenhuma congregação cadastrada ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 rounded-lg border border-[#E2E8F0] bg-[#F5F8FC]">
                {congregations.map((c) => {
                  const checked = congregationIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer p-1.5 rounded hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCongregation(c.id)}
                        className="rounded border-[#CBD5E1] text-[#1565C0]"
                      />
                      <Building2 className="w-3.5 h-3.5 text-[#1565C0] shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Observações Administrativas
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
              {saving ? 'Salvando...' : 'Salvar Supervisor'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Supervisor"
        itemName={deleteTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
};
