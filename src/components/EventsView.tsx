import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  EventItem,
  EventStatus,
  EVENT_TYPES,
  Congregation,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { saveEvent, deleteEvent } from '../services/firestoreService.ts';
import { formatDateBR } from '../lib/formatters.ts';
import { Modal } from './ui/Modal.tsx';
import { ConfirmDeleteModal } from './ui/ConfirmDeleteModal.tsx';

interface EventsViewProps {
  events: EventItem[];
  congregations: Congregation[];
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  congregations,
}) => {
  const { firebaseUser, userProfile, isSedeAdmin, hasPermission } = useAuth();
  const canManage = isSedeAdmin || hasPermission('manageEvents');

  const [filterCong, setFilterCong] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [congregationId, setCongregationId] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [status, setStatus] = useState<EventStatus>('Agendado');

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (filterCong !== 'all' && ev.congregationId !== filterCong)
        return false;
      return true;
    });
  }, [events, filterCong]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setType(EVENT_TYPES[0]);
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('19:30');
    setLocation('');
    setCongregationId(
      userProfile?.congregationId || congregations[0]?.id || ''
    );
    setResponsibleName('');
    setStatus('Agendado');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (ev: EventItem) => {
    setEditing(ev);
    setName(ev.name);
    setType(ev.type || EVENT_TYPES[0]);
    setDescription(ev.description || '');
    setDate(ev.date);
    setTime(ev.time || '');
    setLocation(ev.location || '');
    setCongregationId(ev.congregationId);
    setResponsibleName(ev.responsibleName || '');
    setStatus(ev.status);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!name.trim() || !date || !congregationId) {
      setError('Nome do evento, data e congregação são obrigatórios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveEvent(
        {
          name: name.trim(),
          type,
          description: description.trim(),
          date,
          time: time.trim(),
          location: location.trim(),
          congregationId,
          responsibleName: responsibleName.trim(),
          status,
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
      setError(err?.message || 'Erro ao salvar evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!firebaseUser || !userProfile || !canManage || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEvent(deleteTarget.id, deleteTarget.name, {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Eventos Agendados</span>
          <p className="text-xl font-bold text-[#1565C0] tabular-nums mt-1">
            {events.filter((e) => e.status === 'Agendado').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Em Andamento</span>
          <p className="text-xl font-bold text-amber-700 tabular-nums mt-1">
            {events.filter((e) => e.status === 'Em andamento').length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
          <span className="text-xs text-[#64748B]">Eventos Concluídos</span>
          <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">
            {events.filter((e) => e.status === 'Concluído').length}
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
        </div>

        {canManage && (
          <button
            type="button"
            disabled={congregations.length === 0}
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-50 text-white text-xs font-medium inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        )}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              Nenhum evento agendado
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              Organize cultos, congressos, reuniões administrativas e atividades
              dos departamentos na agenda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Data e Horário</th>
                  <th className="py-3 px-4">Evento</th>
                  <th className="py-3 px-4">Congregação</th>
                  <th className="py-3 px-4">Local / Responsável</th>
                  <th className="py-3 px-4">Situação</th>
                  {canManage && (
                    <th className="py-3 px-4 text-right">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filtered.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-[#F5F8FC] transition-colors"
                  >
                    <td className="py-3 px-4 tabular-nums">
                      <div className="font-semibold text-[#0D2B4F]">
                        {formatDateBR(ev.date)}
                      </div>
                      {ev.time && (
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ev.time}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#172B4D]">
                        {ev.name}
                      </div>
                      <div className="text-[11px] text-[#1565C0]">
                        {ev.type || 'Evento'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#172B4D]">
                      {getCongName(ev.congregationId)}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {ev.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#1565C0]" />
                          {ev.location}
                        </div>
                      )}
                      {ev.responsibleName && (
                        <div className="text-[11px]">
                          Resp.: {ev.responsibleName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          ev.status === 'Agendado'
                            ? 'text-[#1565C0]'
                            : ev.status === 'Concluído'
                            ? 'text-emerald-700'
                            : ev.status === 'Cancelado'
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            className="p-1.5 rounded-lg text-[#1565C0] hover:bg-[#EAF3FF]"
                            title="Editar evento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(ev)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Excluir evento"
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
        title={editing ? 'Editar Evento' : 'Agendar Novo Evento'}
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
                Nome do Evento *
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
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Situação
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              >
                <option value="Agendado">Agendado</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
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
                Responsável
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Local
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {saving ? 'Salvando...' : 'Salvar Evento'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Evento"
        itemName={deleteTarget?.name || ''}
        loading={deleting}
      />
    </div>
  );
};
