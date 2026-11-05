import React, { useState, useMemo } from 'react';
import { History, Search, FileSpreadsheet } from 'lucide-react';
import { AuditLog } from '../types/index.ts';
import { formatDateTimeBR } from '../lib/formatters.ts';
import { exportReportToExcel } from '../services/exportService.ts';

interface AuditViewProps {
  auditLogs: AuditLog[];
}

export const AuditView: React.FC<AuditViewProps> = ({ auditLogs }) => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const modules = useMemo(() => {
    const set = new Set(auditLogs.map((l) => l.module));
    return Array.from(set).sort();
  }, [auditLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogs.filter((l) => {
      if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
      if (!q) return true;
      return (
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, search, moduleFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário, operação ou detalhes..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
            />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="all">Todos os módulos</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[#64748B]">
            Registro imutável · {filtered.length} evento(s)
          </span>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportReportToExcel({
                  title: 'Log de Auditoria Imutável',
                  institutionName: 'Instituição Eclesiástica',
                  columns: [
                    'Data e Horário',
                    'Usuário',
                    'E-mail',
                    'Módulo',
                    'Operação',
                    'Detalhes',
                  ],
                  rows: filtered.map((l) => [
                    formatDateTimeBR(l.createdAt),
                    l.userName,
                    l.userEmail || '—',
                    l.module,
                    l.action,
                    l.details,
                  ]),
                  filenameBase: 'log_auditoria',
                })
              }
              className="px-3.5 py-2 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar (.xlsx)
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <p className="text-sm font-bold text-[#0D2B4F]">
              Nenhum registro de auditoria encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  <th className="py-3 px-4">Data e Horário</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Operação</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filtered.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#F5F8FC] transition-colors"
                  >
                    <td className="py-3 px-4 tabular-nums text-[#64748B] whitespace-nowrap">
                      {formatDateTimeBR(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#172B4D]">
                        {log.userName}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {log.userEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#1565C0]">
                      {log.module}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0D2B4F]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-[#172B4D] max-w-md">
                      {log.details}
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
