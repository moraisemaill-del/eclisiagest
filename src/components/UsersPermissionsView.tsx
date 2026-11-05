import React, { useState } from 'react';
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import {
  UserProfile,
  UserRole,
  UserPermissions,
  ROLE_LABELS,
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS_BY_ROLE,
  Congregation,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  createOrInviteUser,
  createUserWithPasswordAdmin,
  updateUserProfile,
  deleteUserOrInvite,
} from '../services/firestoreService.ts';
import firebaseConfig from '../../firebase-applet-config.json';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface UsersPermissionsViewProps {
  users: UserProfile[];
  invites: UserProfile[];
  congregations: Congregation[];
}

export const UsersPermissionsView: React.FC<UsersPermissionsViewProps> = ({
  users,
  invites,
  congregations,
}) => {
  const { firebaseUser, userProfile } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{
    profile: UserProfile;
    isInvite: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('tesoureiro');
  const [congregationId, setCongregationId] = useState('');
  const [supervisedCongIds, setSupervisedCongIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<UserPermissions>(
    DEFAULT_PERMISSIONS_BY_ROLE.tesoureiro
  );
  const [active, setActive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{
    profile: UserProfile;
    isInvite: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allEntries = [
    ...users.map((u) => ({ profile: u, isInvite: false })),
    ...invites.map((inv) => ({ profile: inv, isInvite: true })),
  ];

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setInitialPassword('');
    setPhone('');
    setRole('tesoureiro');
    setCongregationId(congregations[0]?.id || '');
    setSupervisedCongIds([]);
    setPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE.tesoureiro });
    setActive(true);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (entry: {
    profile: UserProfile;
    isInvite: boolean;
  }) => {
    setEditing(entry);
    setName(entry.profile.name);
    setEmail(entry.profile.email);
    setPhone(entry.profile.phone || '');
    setRole(entry.profile.role);
    setCongregationId(entry.profile.congregationId || '');
    setSupervisedCongIds(entry.profile.supervisedCongregationIds || []);
    setPermissions({ ...entry.profile.permissions });
    setActive(entry.profile.active);
    setError(null);
    setModalOpen(true);
  };

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE[nextRole] });
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSupervisedCong = (congId: string) => {
    setSupervisedCongIds((prev) =>
      prev.includes(congId)
        ? prev.filter((id) => id !== congId)
        : [...prev, congId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail Google são obrigatórios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        congregationId:
          role === 'administrador_geral' ||
          role === 'presidente_geral' ||
          role === 'supervisor'
            ? ''
            : congregationId,
        supervisedCongregationIds:
          role === 'supervisor' ? supervisedCongIds : [],
        permissions,
        active,
      };

      if (editing) {
        await updateUserProfile(
          editing.profile.id || editing.profile.email,
          payload,
          {
            uid: firebaseUser.uid,
            name: userProfile.name,
            email: userProfile.email,
          },
          editing.isInvite
        );
      } else if (initialPassword.trim().length > 0) {
        if (initialPassword.trim().length < 6) {
          setError('A senha inicial deve ter pelo menos 6 caracteres.');
          setSaving(false);
          return;
        }
        await createUserWithPasswordAdmin(
          payload,
          initialPassword.trim(),
          firebaseConfig.apiKey,
          {
            uid: firebaseUser.uid,
            name: userProfile.name,
            email: userProfile.email,
          }
        );
      } else {
        await createOrInviteUser(payload, {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firebaseUser || !userProfile || !deleteTarget) return;
    if (deleteTarget.profile.uid === firebaseUser.uid) return;
    setDeleting(true);
    try {
      await deleteUserOrInvite(
        deleteTarget.profile.id || deleteTarget.profile.email,
        deleteTarget.profile.name,
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        },
        deleteTarget.isInvite
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Usuários Ativos</span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {users.filter((u) => u.active).length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Aguardando 1º Acesso</span>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {invites.length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Administradores e Supervisores
          </span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {
              allEntries.filter(
                (e) =>
                  e.profile.role === 'administrador_geral' ||
                  e.profile.role === 'presidente_geral' ||
                  e.profile.role === 'supervisor'
              ).length
            }
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0D2B4F]">
            Usuários Administrativos e Controle de Acesso (RBAC)
          </h2>
          <p className="text-xs text-[#64748B]">
            Cadastre lideranças com seu e-mail Google e defina perfis e
            permissões personalizadas
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium inline-flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail Google</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Vinculação</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {allEntries.map((entry) => {
                const u = entry.profile;
                const isSelf = u.uid === firebaseUser?.uid;
                return (
                  <tr
                    key={u.id || u.email}
                    className="hover:bg-[#F5F8FC] transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{u.email}</td>
                    <td className="py-3 px-4 font-medium text-[#1565C0]">
                      {ROLE_LABELS[u.role]}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {u.role === 'administrador_geral' ||
                      u.role === 'presidente_geral'
                        ? 'Sede Geral (Acesso Total)'
                        : u.role === 'supervisor'
                        ? `${u.supervisedCongregationIds?.length || 0} congregação(ões)`
                        : congregations.find((c) => c.id === u.congregationId)
                            ?.name || 'Não vinculada'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          !u.active
                            ? 'text-red-600'
                            : entry.isInvite
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {!u.active
                          ? 'Inativo'
                          : entry.isInvite
                          ? 'Aguardando 1º acesso'
                          : 'Ativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                          title="Editar permissões"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Remover usuário"
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
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Usuário e Permissões' : 'Cadastrar Usuário'}
        subtitle="O usuário deverá entrar utilizando o mesmo e-mail Google informado abaixo"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                E-mail de Acesso *
              </label>
              <input
                type="email"
                required
                disabled={Boolean(editing)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
              />
            </div>
          </div>

          {!editing && (
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Senha Inicial (Opcional — mínimo 6 caracteres)
              </label>
              <input
                type="password"
                minLength={6}
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="Se preenchida, cria o login imediato; se vazia, libera via Google ou Criar Conta"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Perfil Institucional *
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                {Object.entries(ROLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Situação do Acesso
              </label>
              <select
                value={active ? 'true' : 'false'}
                onChange={(e) => setActive(e.target.value === 'true')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                <option value="true">Ativo</option>
                <option value="false">Bloqueado / Inativo</option>
              </select>
            </div>
          </div>

          {role !== 'administrador_geral' &&
            role !== 'presidente_geral' &&
            role !== 'supervisor' && (
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                  Congregação Vinculada *
                </label>
                <select
                  required
                  value={congregationId}
                  onChange={(e) => setCongregationId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
                >
                  <option value="">Selecione a congregação...</option>
                  {congregations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {role === 'supervisor' && (
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Congregações Autorizadas para este Supervisor
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-lg border border-[#E2E8F0] bg-[#F5F8FC]">
                {congregations.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={supervisedCongIds.includes(c.id)}
                      onChange={() => toggleSupervisedCong(c.id)}
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Permissões Personalizadas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg border border-[#E2E8F0] bg-[#F5F8FC]">
              {(
                Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>
              ).map((permKey) => (
                <label
                  key={permKey}
                  className="flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(permissions[permKey])}
                    onChange={() => togglePermission(permKey)}
                  />
                  <span>{PERMISSION_LABELS[permKey]}</span>
                </label>
              ))}
            </div>
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
              {saving ? 'Salvando...' : 'Salvar Usuário'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Usuário"
        itemName={deleteTarget?.profile.name || ''}
        loading={deleting}
      />
    </div>
  );
};
