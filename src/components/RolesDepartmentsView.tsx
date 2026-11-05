import React, { useState } from 'react';
import {
  Briefcase,
  Layers,
  Plus,
  Edit2,
  Users,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Role,
  Department,
  Congregation,
  Member,
  SUGGESTED_ROLES,
  SUGGESTED_DEPARTMENTS,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  saveRole,
  saveDepartment,
  deleteRole,
  deleteDepartment,
} from '../services/firestoreService.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface RolesDepartmentsViewProps {
  roles: Role[];
  departments: Department[];
  congregations: Congregation[];
  members: Member[];
}

export const RolesDepartmentsView: React.FC<RolesDepartmentsViewProps> = ({
  roles,
  departments,
  congregations,
  members,
}) => {
  const { firebaseUser, userProfile, isSedeAdmin, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'roles' | 'departments'>('roles');

  const canManageRoles = isSedeAdmin || hasPermission('manageRoles');
  const canManageDepts = isSedeAdmin || hasPermission('manageDepartments');

  // Role modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleResp, setRoleResp] = useState('');
  const [roleDeptName, setRoleDeptName] = useState('');
  const [roleLevel, setRoleLevel] = useState<number>(5);
  const [roleSuperior, setRoleSuperior] = useState('');
  const [roleCongId, setRoleCongId] = useState('');
  const [roleStatus, setRoleStatus] = useState<'ativo' | 'inativo'>('ativo');

  // Department modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptCongId, setDeptCongId] = useState('');
  const [deptLeader, setDeptLeader] = useState('');
  const [deptViceLeader, setDeptViceLeader] = useState('');
  const [deptMemberIds, setDeptMemberIds] = useState<string[]>([]);
  const [deptStatus, setDeptStatus] = useState<'ativo' | 'inativo'>('ativo');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'role' | 'dept';
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setRoleResp('');
    setRoleDeptName('');
    setRoleLevel(5);
    setRoleSuperior('');
    setRoleCongId('');
    setRoleStatus('ativo');
    setError(null);
    setRoleModalOpen(true);
  };

  const openEditRole = (r: Role) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDesc(r.description || '');
    setRoleResp(r.responsibilities || '');
    setRoleDeptName(r.departmentName || '');
    setRoleLevel(r.hierarchyLevel);
    setRoleSuperior(r.superiorRole || '');
    setRoleCongId(r.congregationId || '');
    setRoleStatus(r.status);
    setError(null);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!roleName.trim()) {
      setError('Informe o nome do cargo.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveRole(
        {
          name: roleName.trim(),
          description: roleDesc.trim(),
          responsibilities: roleResp.trim(),
          departmentName: roleDeptName.trim(),
          hierarchyLevel: Number(roleLevel) || 1,
          superiorRole: roleSuperior.trim(),
          congregationId: roleCongId || '',
          status: roleStatus,
        },
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        },
        editingRole?.id
      );
      setRoleModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar cargo.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportSuggestedRoles = async () => {
    if (!firebaseUser || !userProfile || !canManageRoles) return;
    setSaving(true);
    try {
      const existingNames = new Set(
        roles.map((r) => r.name.toLowerCase().trim())
      );
      for (const s of SUGGESTED_ROLES) {
        if (!existingNames.has(s.name.toLowerCase())) {
          await saveRole(
            {
              name: s.name,
              description: '',
              responsibilities: '',
              departmentName: '',
              hierarchyLevel: s.hierarchyLevel,
              superiorRole: '',
              congregationId: '',
              status: 'ativo',
            },
            {
              uid: firebaseUser.uid,
              name: userProfile.name,
              email: userProfile.email,
            }
          );
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptDesc('');
    setDeptCongId(userProfile?.congregationId || congregations[0]?.id || '');
    setDeptLeader('');
    setDeptViceLeader('');
    setDeptMemberIds([]);
    setDeptStatus('ativo');
    setError(null);
    setDeptModalOpen(true);
  };

  const openEditDept = (d: Department) => {
    setEditingDept(d);
    setDeptName(d.name);
    setDeptDesc(d.description || '');
    setDeptCongId(d.congregationId);
    setDeptLeader(d.leaderName || '');
    setDeptViceLeader(d.viceLeaderName || '');
    setDeptMemberIds(d.memberIds || []);
    setDeptStatus(d.status);
    setError(null);
    setDeptModalOpen(true);
  };

  const toggleDeptMember = (memberId: string) => {
    setDeptMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!deptName.trim() || !deptCongId) {
      setError('Nome do departamento e congregação são obrigatórios.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveDepartment(
        {
          name: deptName.trim(),
          description: deptDesc.trim(),
          congregationId: deptCongId,
          leaderName: deptLeader.trim(),
          viceLeaderName: deptViceLeader.trim(),
          memberIds: deptMemberIds,
          createdDate:
            editingDept?.createdDate || new Date().toISOString().split('T')[0],
          status: deptStatus,
        },
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        },
        editingDept?.id
      );
      setDeptModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar departamento.');
    } finally {
      setSaving(false);
    }
  };

  const getCongName = (id?: string) => {
    if (!id) return 'Geral (Sede)';
    return congregations.find((c) => c.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Cargos Cadastrados</span>
          <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
            {roles.length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Níveis Hierárquicos</span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {new Set(roles.map((r) => r.hierarchyLevel)).size}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Departamentos Ativos</span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {departments.filter((d) => d.status === 'ativo').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">
            Integrantes em Departamentos
          </span>
          <p className="text-xl font-bold text-[#0D2B4F] tabular-nums mt-1">
            {departments.reduce(
              (sum, d) => sum + (d.memberIds?.length || 0),
              0
            )}
          </p>
        </div>
      </div>

      {/* Segmented Tabs & Actions */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-[#F5F8FC] border border-[#E2E8F0] rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-[#1565C0] text-white'
                : 'text-[#64748B] hover:text-[#0D2B4F]'
            }`}
          >
            Cargos e Hierarquia ({roles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'departments'
                ? 'bg-[#1565C0] text-white'
                : 'text-[#64748B] hover:text-[#0D2B4F]'
            }`}
          >
            Departamentos ({departments.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'roles' && canManageRoles && (
            <>
              {roles.length === 0 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleImportSuggestedRoles}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Importar Sugestões de Cargos
                </button>
              )}
              <button
                type="button"
                onClick={openCreateRole}
                className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Novo Cargo
              </button>
            </>
          )}

          {activeTab === 'departments' && canManageDepts && (
            <button
              type="button"
              disabled={congregations.length === 0}
              onClick={openCreateDept}
              className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Departamento
            </button>
          )}
        </div>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          {roles.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
              <h3 className="text-sm font-bold text-[#0D2B4F]">
                Nenhum cargo cadastrado
              </h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                Cadastre cargos personalizados ou importe as sugestões padrão da
                estrutura eclesiástica (sem pessoas vinculadas).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                    <th className="py-3 px-4">Nível</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4">Superior Responsável</th>
                    <th className="py-3 px-4">Abrangência</th>
                    <th className="py-3 px-4">Situação</th>
                    {canManageRoles && (
                      <th className="py-3 px-4 text-right">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {roles.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-[#F5F8FC] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-[#1565C0] font-semibold tabular-nums">
                        Nível {r.hierarchyLevel}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">
                        {r.name}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {r.superiorRole || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {getCongName(r.congregationId)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            r.status === 'ativo'
                              ? 'text-emerald-700'
                              : 'text-[#64748B]'
                          }`}
                        >
                          {r.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {canManageRoles && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditRole(r)}
                              className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                              title="Editar cargo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {isSedeAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'role',
                                    id: r.id,
                                    name: r.name,
                                  })
                                }
                                className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Excluir cargo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
          {departments.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
              <h3 className="text-sm font-bold text-[#0D2B4F]">
                Nenhum departamento cadastrado
              </h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                Crie departamentos por congregação (Jovens, Crianças, Louvor,
                Evangelismo, Ensino, etc.) e vincule seus integrantes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4">Congregação</th>
                    <th className="py-3 px-4">Responsável / Vice</th>
                    <th className="py-3 px-4 text-right">Integrantes</th>
                    <th className="py-3 px-4">Situação</th>
                    {canManageDepts && (
                      <th className="py-3 px-4 text-right">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {departments.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-[#F5F8FC] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">
                        {d.name}
                      </td>
                      <td className="py-3 px-4 text-[#172B4D]">
                        {getCongName(d.congregationId)}
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {[d.leaderName, d.viceLeaderName]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#1565C0]">
                        {d.memberIds?.length || 0}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            d.status === 'ativo'
                              ? 'text-emerald-700'
                              : 'text-[#64748B]'
                          }`}
                        >
                          {d.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {canManageDepts && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditDept(d)}
                              className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                              title="Editar departamento e integrantes"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {isSedeAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'dept',
                                    id: d.id,
                                    name: d.name,
                                  })
                                }
                                className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Excluir departamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
      )}

      {/* Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? 'Editar Cargo' : 'Novo Cargo'}
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Nome do Cargo *
              </label>
              <input
                type="text"
                required
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Nível Hierárquico *
              </label>
              <input
                type="number"
                min={1}
                max={99}
                required
                value={roleLevel}
                onChange={(e) =>
                  setRoleLevel(parseInt(e.target.value, 10) || 1)
                }
                className="w-full px-3 py-2 text-sm tabular-nums bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Superior Responsável
              </label>
              <input
                type="text"
                value={roleSuperior}
                onChange={(e) => setRoleSuperior(e.target.value)}
                placeholder="Ex.: Pastor dirigente"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Congregação (opcional)
              </label>
              <select
                value={roleCongId}
                onChange={(e) => setRoleCongId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                <option value="">Geral (Todas as congregações)</option>
                {congregations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Descrição e Responsabilidades
            </label>
            <textarea
              rows={3}
              value={roleResp}
              onChange={(e) => setRoleResp(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Situação
            </label>
            <select
              value={roleStatus}
              onChange={(e) =>
                setRoleStatus(e.target.value as 'ativo' | 'inativo')
              }
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1565C0] text-white text-xs font-medium cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar Cargo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title={editingDept ? 'Editar Departamento' : 'Novo Departamento'}
      >
        <form onSubmit={handleSaveDept} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Nome do Departamento *
              </label>
              <input
                type="text"
                list="dept-suggestions"
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Ex.: Jovens, Louvor..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
              <datalist id="dept-suggestions">
                {SUGGESTED_DEPARTMENTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Congregação *
              </label>
              <select
                required
                value={deptCongId}
                onChange={(e) => setDeptCongId(e.target.value)}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Responsável (Líder)
              </label>
              <input
                type="text"
                value={deptLeader}
                onChange={(e) => setDeptLeader(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Vice-responsável
              </label>
              <input
                type="text"
                value={deptViceLeader}
                onChange={(e) => setDeptViceLeader(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Descrição
            </label>
            <textarea
              rows={2}
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Integrantes do Departamento ({deptMemberIds.length} selecionado(s))
            </label>
            <div className="max-h-40 overflow-y-auto p-3 rounded-lg border border-[#E2E8F0] bg-[#F5F8FC] space-y-1.5">
              {members.filter((m) => m.congregationId === deptCongId).length ===
              0 ? (
                <p className="text-xs text-[#64748B]">
                  Nenhum membro cadastrado nesta congregação.
                </p>
              ) : (
                members
                  .filter((m) => m.congregationId === deptCongId)
                  .map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer p-1 rounded hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={deptMemberIds.includes(m.id)}
                        onChange={() => toggleDeptMember(m.id)}
                        className="rounded border-[#CBD5E1] text-[#1565C0]"
                      />
                      <Users className="w-3.5 h-3.5 text-[#1565C0]" />
                      <span>{m.name}</span>
                    </label>
                  ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Situação
            </label>
            <select
              value={deptStatus}
              onChange={(e) =>
                setDeptStatus(e.target.value as 'ativo' | 'inativo')
              }
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1565C0] text-white text-xs font-medium cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar Departamento'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!firebaseUser || !userProfile || !deleteTarget) return;
          setDeleting(true);
          try {
            const actor = {
              uid: firebaseUser.uid,
              name: userProfile.name,
              email: userProfile.email,
            };
            if (deleteTarget.type === 'role') {
              await deleteRole(deleteTarget.id, deleteTarget.name, actor);
            } else {
              await deleteDepartment(deleteTarget.id, deleteTarget.name, actor);
            }
            setDeleteTarget(null);
          } finally {
            setDeleting(false);
          }
        }}
        title={
          deleteTarget?.type === 'role'
            ? 'Excluir Cargo'
            : 'Excluir Departamento'
        }
        itemName={deleteTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
};
