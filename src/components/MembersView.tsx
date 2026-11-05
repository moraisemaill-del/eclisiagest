import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  ArrowRightLeft,
  Upload,
  User as UserIcon,
  History,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Member,
  MemberStatus,
  Congregation,
  Role,
  Department,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  saveMember,
  transferMember,
  deleteMember,
} from '../services/firestoreService.ts';
import { exportReportToExcel } from '../services/exportService.ts';
import {
  calculateAge,
  classifyAgeGroup,
  formatDateBR,
  readFileAsDataUrl,
} from '../lib/formatters.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface MembersViewProps {
  members: Member[];
  congregations: Congregation[];
  roles: Role[];
  departments: Department[];
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  congregations,
  roles,
  departments,
}) => {
  const { firebaseUser, userProfile, institution, isSedeAdmin, hasPermission } =
    useAuth();

  const canEdit = isSedeAdmin || hasPermission('editMembers');

  const [search, setSearch] = useState('');
  const [filterCong, setFilterCong] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | MemberStatus>('all');
  const [filterAgeGroup, setFilterAgeGroup] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [transferTarget, setTransferTarget] = useState<Member | null>(null);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Member form state
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [status, setStatus] = useState<MemberStatus>('Ativo');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [notes, setNotes] = useState('');

  // Transfer modal state
  const [toCongregationId, setToCongregationId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const computedAge = calculateAge(birthDate);
  const computedAgeGroup = classifyAgeGroup(
    computedAge,
    institution?.ageGroups
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (filterCong !== 'all' && m.congregationId !== filterCong) return false;
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      const age = calculateAge(m.birthDate);
      const group = classifyAgeGroup(age, institution?.ageGroups);
      if (filterAgeGroup !== 'all' && group !== filterAgeGroup) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.roleName || '').toLowerCase().includes(q)
      );
    });
  }, [
    members,
    search,
    filterCong,
    filterStatus,
    filterAgeGroup,
    institution?.ageGroups,
  ]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setPhotoUrl('');
    setBirthDate('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCongregationId(
      userProfile?.congregationId || congregations[0]?.id || ''
    );
    setJoinedAt(new Date().toISOString().split('T')[0]);
    setStatus('Ativo');
    setRoleId('');
    setDepartmentId('');
    setNotes('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (m: Member) => {
    setEditing(m);
    setName(m.name);
    setPhotoUrl(m.photoUrl || '');
    setBirthDate(m.birthDate || '');
    setPhone(m.phone || '');
    setEmail(m.email || '');
    setAddress(m.address || '');
    setCongregationId(m.congregationId);
    setJoinedAt(m.joinedAt || '');
    setStatus(m.status);
    setRoleId(m.roleId || '');
    setDepartmentId(m.departmentId || '');
    setNotes(m.notes || '');
    setError(null);
    setModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, 250);
      setPhotoUrl(dataUrl);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!name.trim() || !congregationId) {
      setError('Nome completo e congregação são obrigatórios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const selectedRole = roles.find((r) => r.id === roleId);
      const selectedDept = departments.find((d) => d.id === departmentId);

      await saveMember(
        {
          name: name.trim(),
          photoUrl: photoUrl || '',
          birthDate: birthDate || '',
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          congregationId,
          joinedAt: joinedAt || '',
          status,
          roleId: roleId || '',
          roleName: selectedRole ? selectedRole.name : '',
          departmentId: departmentId || '',
          departmentName: selectedDept ? selectedDept.name : '',
          notes: notes.trim(),
          transferHistory: editing?.transferHistory || [],
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
      setError(err?.message || 'Erro ao salvar membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile || !transferTarget) return;
    if (!toCongregationId || toCongregationId === transferTarget.congregationId) {
      setError('Selecione uma congregação de destino diferente da atual.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fromCongName =
        congregations.find((c) => c.id === transferTarget.congregationId)
          ?.name || transferTarget.congregationId;
      const toCongName =
        congregations.find((c) => c.id === toCongregationId)?.name ||
        toCongregationId;

      await transferMember(
        transferTarget,
        fromCongName,
        toCongregationId,
        toCongName,
        transferReason,
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        }
      );
      setTransferTarget(null);
      setTransferReason('');
    } catch (err: any) {
      setError(err?.message || 'Erro ao transferir membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firebaseUser || !userProfile || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMember(deleteTarget.id, deleteTarget.name, {
        uid: firebaseUser.uid,
        name: userProfile.name,
        email: userProfile.email,
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const getCongName = (id: string) =>
    congregations.find((c) => c.id === id)?.name || '—';

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Total de Membros</span>
          <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
            {members.length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Membros Ativos</span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {members.filter((m) => m.status === 'Ativo').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Afastados / Transferidos
          </span>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {
              members.filter(
                (m) => m.status === 'Afastado' || m.status === 'Transferido'
              ).length
            }
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Exibidos no Filtro</span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {filtered.length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar membro..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <select
            value={filterCong}
            onChange={(e) => setFilterCong(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
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
            onChange={(e) =>
              setFilterStatus(e.target.value as 'all' | MemberStatus)
            }
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
          >
            <option value="all">Todas as situações</option>
            <option value="Ativo">Ativo</option>
            <option value="Afastado">Afastado</option>
            <option value="Transferido">Transferido</option>
            <option value="Inativo">Inativo</option>
          </select>

          <select
            value={filterAgeGroup}
            onChange={(e) => setFilterAgeGroup(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
          >
            <option value="all">Todas as faixas etárias</option>
            {(institution?.ageGroups || []).map((ag) => (
              <option key={ag.id} value={ag.name}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            disabled={congregations.length === 0}
            className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Membro
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Nenhum membro encontrado
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              {congregations.length === 0
                ? 'Cadastre ao menos uma congregação antes de adicionar membros.'
                : 'Os membros cadastrados aparecerão aqui com cálculo automático de idade e faixa etária.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Membro</th>
                  <th className="py-3 px-4">Congregação</th>
                  <th className="py-3 px-4">Idade / Faixa Etária</th>
                  <th className="py-3 px-4">Cargo / Departamento</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filtered.map((m) => {
                  const age = calculateAge(m.birthDate);
                  const ageGroup = classifyAgeGroup(
                    age,
                    institution?.ageGroups
                  );
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#F5F8FC] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt={m.name}
                              className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#EAF3FF] text-[#1565C0] flex items-center justify-center shrink-0">
                              <UserIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#172B4D]">
                              {m.name}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              {m.phone || m.email || 'Sem contato'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#172B4D]">
                        {getCongName(m.congregationId)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#172B4D] tabular-nums">
                          {age !== null ? `${age} anos` : '—'}
                        </span>
                        <span className="text-[#64748B]"> · {ageGroup}</span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {[m.roleName, m.departmentName]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            m.status === 'Ativo'
                              ? 'text-emerald-700'
                              : m.status === 'Afastado'
                              ? 'text-amber-700'
                              : 'text-[#64748B]'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {(m.transferHistory?.length || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setHistoryMember(m)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0D2B4F] hover:bg-[#EAF3FF]"
                              title="Histórico de transferências"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferTarget(m);
                                  setToCongregationId('');
                                  setTransferReason('');
                                  setError(null);
                                }}
                                className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                                title="Transferir congregação"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(m)}
                                className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                                title="Editar membro"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {isSedeAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(m)}
                                  className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Excluir membro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
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

      {/* Create / Edit Member Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Membro' : 'Cadastrar Membro'}
        subtitle="Membros não possuem login individual no sistema"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Foto"
                className="w-16 h-16 rounded-full object-cover border border-[#E2E8F0]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#EAF3FF] text-[#1565C0] flex items-center justify-center">
                <UserIcon className="w-7 h-7" />
              </div>
            )}
            <label className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#1565C0] hover:bg-[#EAF3FF] cursor-pointer inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Enviar fotografia (máx. 250 KB)
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
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
                Idade e Faixa Etária (Automático)
              </label>
              <div className="px-3 py-2 text-sm bg-[#F5F8FC] border border-[#E2E8F0] rounded-lg text-[#0D2B4F] font-medium tabular-nums">
                {computedAge !== null
                  ? `${computedAge} anos · ${computedAgeGroup}`
                  : 'Informe a data de nascimento'}
              </div>
            </div>
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
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
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
                Situação Cadastral *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              >
                <option value="Ativo">Ativo</option>
                <option value="Afastado">Afastado</option>
                <option value="Transferido">Transferido</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Data de Ingresso
              </label>
              <input
                type="date"
                value={joinedAt}
                onChange={(e) => setJoinedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Cargo
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              >
                <option value="">Sem cargo</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Departamento
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
              >
                <option value="">Sem departamento</option>
                {departments
                  .filter(
                    (d) => !congregationId || d.congregationId === congregationId
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
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

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Observações Autorizadas
            </label>
            <textarea
              rows={2}
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
              {saving ? 'Salvando...' : 'Salvar Membro'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Member Modal */}
      <Modal
        isOpen={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        title="Transferir Membro entre Congregações"
        subtitle={
          transferTarget
            ? `Membro: ${transferTarget.name} · Origem: ${getCongName(
                transferTarget.congregationId
              )}`
            : ''
        }
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleConfirmTransfer} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Congregação de Destino *
            </label>
            <select
              required
              value={toCongregationId}
              onChange={(e) => setToCongregationId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            >
              <option value="">Selecione o destino...</option>
              {congregations
                .filter((c) => c.id !== transferTarget?.congregationId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Motivo / Observação da Transferência
            </label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Ex.: Mudança de residência..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferTarget(null)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#172B4D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium cursor-pointer"
            >
              {saving ? 'Transferindo...' : 'Confirmar Transferência'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer History Modal */}
      <Modal
        isOpen={Boolean(historyMember)}
        onClose={() => setHistoryMember(null)}
        title={`Histórico de Vínculos — ${historyMember?.name || ''}`}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-3 text-xs">
          {(historyMember?.transferHistory || []).map((t, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] space-y-1"
            >
              <div className="flex items-center justify-between font-semibold text-[#0D2B4F]">
                <span>
                  {t.fromCongregationName} → {t.toCongregationName}
                </span>
                <span className="tabular-nums text-[#64748B]">
                  {formatDateBR(t.date)}
                </span>
              </div>
              {t.reason && (
                <p className="text-[#64748B]">Motivo: {t.reason}</p>
              )}
              <p className="text-[11px] text-[#64748B]">
                Registrado por: {t.recordedByName}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Membro"
        itemName={deleteTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
};
