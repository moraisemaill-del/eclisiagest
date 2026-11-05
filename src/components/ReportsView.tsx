import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import {
  Congregation,
  Supervisor,
  Member,
  Department,
  Role,
  FinancialTransaction,
  AccountabilityReport,
} from '../types/index.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  calculateAge,
  classifyAgeGroup,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  MONTH_NAMES_PT,
} from '../lib/formatters.ts';
import {
  exportReportToPDF,
  exportReportToExcel,
} from '../services/exportService.ts';

type ReportType =
  | 'members_by_congregation'
  | 'members_by_age'
  | 'people_by_department'
  | 'people_by_role'
  | 'supervisors_congregations'
  | 'financial_transactions'
  | 'income_and_expenses'
  | 'accountability_reports'
  | 'financial_pending'
  | 'approval_history';

const REPORT_OPTIONS: Array<{ id: ReportType; label: string }> = [
  { id: 'members_by_congregation', label: '1. Membros por congregação' },
  { id: 'members_by_age', label: '2. Membros por faixa etária' },
  { id: 'people_by_department', label: '3. Pessoas por departamento' },
  { id: 'people_by_role', label: '4. Pessoas por cargo' },
  {
    id: 'supervisors_congregations',
    label: '5. Supervisores e congregações vinculadas',
  },
  { id: 'financial_transactions', label: '6. Movimentações financeiras' },
  { id: 'income_and_expenses', label: '7. Entradas e despesas' },
  { id: 'accountability_reports', label: '8. Prestação de contas' },
  { id: 'financial_pending', label: '9. Pendências financeiras' },
  { id: 'approval_history', label: '10. Histórico de aprovações' },
];

interface ReportsViewProps {
  congregations: Congregation[];
  supervisors: Supervisor[];
  members: Member[];
  departments: Department[];
  roles: Role[];
  transactions: FinancialTransaction[];
  accountability: AccountabilityReport[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  congregations,
  supervisors,
  members,
  departments,
  roles,
  transactions,
  accountability,
}) => {
  const { institution } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>(
    'members_by_congregation'
  );
  const [filterCong, setFilterCong] = useState('all');

  const getCongName = (id: string) =>
    congregations.find((c) => c.id === id)?.name || '—';

  const reportData = useMemo((): {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  } => {
    const filteredMembers = members.filter(
      (m) => filterCong === 'all' || m.congregationId === filterCong
    );
    const filteredTx = transactions.filter(
      (t) =>
        !t.reversed &&
        (filterCong === 'all' || t.congregationId === filterCong)
    );
    const filteredAcc = accountability.filter(
      (a) => filterCong === 'all' || a.congregationId === filterCong
    );

    switch (selectedReport) {
      case 'members_by_congregation':
        return {
          title: 'Relatório de Membros por Congregação',
          columns: [
            'Nome',
            'Congregação',
            'Situação',
            'Telefone',
            'Data de Ingresso',
          ],
          rows: filteredMembers.map((m) => [
            m.name,
            getCongName(m.congregationId),
            m.status,
            m.phone || '—',
            formatDateBR(m.joinedAt),
          ]),
        };

      case 'members_by_age':
        return {
          title: 'Relatório de Membros por Faixa Etária',
          columns: [
            'Nome',
            'Congregação',
            'Data de Nascimento',
            'Idade',
            'Faixa Etária',
          ],
          rows: filteredMembers.map((m) => {
            const age = calculateAge(m.birthDate);
            return [
              m.name,
              getCongName(m.congregationId),
              formatDateBR(m.birthDate),
              age !== null ? `${age} anos` : '—',
              classifyAgeGroup(age, institution?.ageGroups),
            ];
          }),
        };

      case 'people_by_department': {
        const depts = departments.filter(
          (d) => filterCong === 'all' || d.congregationId === filterCong
        );
        return {
          title: 'Relatório de Pessoas por Departamento',
          columns: [
            'Departamento',
            'Congregação',
            'Responsável',
            'Qtd. Integrantes',
            'Integrantes',
          ],
          rows: depts.map((d) => {
            const names = (d.memberIds || [])
              .map((id) => members.find((m) => m.id === id)?.name || id)
              .join(', ');
            return [
              d.name,
              getCongName(d.congregationId),
              d.leaderName || '—',
              d.memberIds?.length || 0,
              names || 'Nenhum integrante',
            ];
          }),
        };
      }

      case 'people_by_role':
        return {
          title: 'Relatório de Pessoas por Cargo',
          columns: ['Cargo', 'Nível', 'Membro', 'Congregação', 'Situação'],
          rows: filteredMembers
            .filter((m) => m.roleName)
            .map((m) => {
              const r = roles.find((rl) => rl.id === m.roleId);
              return [
                m.roleName || '—',
                r ? `Nível ${r.hierarchyLevel}` : '—',
                m.name,
                getCongName(m.congregationId),
                m.status,
              ];
            }),
        };

      case 'supervisors_congregations':
        return {
          title: 'Relatório de Supervisores e Congregações Vinculadas',
          columns: [
            'Supervisor',
            'Telefone',
            'E-mail',
            'Situação',
            'Congregações Supervisionadas',
          ],
          rows: supervisors.map((s) => [
            s.name,
            s.phone || '—',
            s.email || '—',
            s.status === 'ativo' ? 'Ativo' : 'Inativo',
            (s.congregationIds || []).map((id) => getCongName(id)).join(', ') ||
              'Nenhuma',
          ]),
        };

      case 'financial_transactions':
        return {
          title: 'Relatório de Movimentações Financeiras',
          columns: [
            'Data',
            'Congregação',
            'Tipo',
            'Categoria',
            'Descrição',
            'Valor (R$)',
          ],
          rows: filteredTx.map((t) => [
            formatDateBR(t.date),
            getCongName(t.congregationId),
            t.type === 'entrada' ? 'Entrada' : 'Despesa',
            t.category,
            t.description,
            formatCurrency(t.amount),
          ]),
        };

      case 'income_and_expenses': {
        const congList = congregations.filter(
          (c) => filterCong === 'all' || c.id === filterCong
        );
        return {
          title: 'Relatório Consolidado de Entradas e Despesas',
          columns: [
            'Congregação',
            'Entradas (R$)',
            'Despesas (R$)',
            'Saldo (R$)',
          ],
          rows: congList.map((c) => {
            const cTx = filteredTx.filter((t) => t.congregationId === c.id);
            const inc = cTx
              .filter((t) => t.type === 'entrada')
              .reduce((s, t) => s + t.amount, 0);
            const exp = cTx
              .filter((t) => t.type === 'despesa')
              .reduce((s, t) => s + t.amount, 0);
            return [
              c.name,
              formatCurrency(inc),
              formatCurrency(exp),
              formatCurrency(inc - exp),
            ];
          }),
        };
      }

      case 'accountability_reports':
        return {
          title: 'Relatório de Prestações de Contas',
          columns: [
            'Competência',
            'Congregação',
            'Entradas',
            'Despesas',
            'Saldo',
            'Status',
          ],
          rows: filteredAcc.map((a) => [
            `${MONTH_NAMES_PT[a.month - 1]}/${a.year}`,
            getCongName(a.congregationId),
            formatCurrency(a.totalIncome),
            formatCurrency(a.totalExpense),
            formatCurrency(a.balance),
            a.status,
          ]),
        };

      case 'financial_pending': {
        const pendingExpenses = filteredTx.filter(
          (t) => t.type === 'despesa' && !t.receiptUrl
        );
        return {
          title: 'Relatório de Pendências Financeiras (Despesas sem Comprovante)',
          columns: [
            'Data',
            'Congregação',
            'Categoria',
            'Descrição',
            'Valor (R$)',
            'Responsável',
          ],
          rows: pendingExpenses.map((t) => [
            formatDateBR(t.date),
            getCongName(t.congregationId),
            t.category,
            t.description,
            formatCurrency(t.amount),
            t.createdByName,
          ]),
        };
      }

      case 'approval_history': {
        const rows: (string | number)[][] = [];
        for (const a of filteredAcc) {
          for (const h of a.history || []) {
            rows.push([
              formatDateTimeBR(h.timestamp),
              getCongName(a.congregationId),
              `${MONTH_NAMES_PT[a.month - 1]}/${a.year}`,
              h.status,
              h.userName,
              h.note || '—',
            ]);
          }
        }
        return {
          title: 'Relatório de Histórico de Aprovações',
          columns: [
            'Data / Hora',
            'Congregação',
            'Competência',
            'Status',
            'Responsável',
            'Observação',
          ],
          rows,
        };
      }
    }
  }, [
    selectedReport,
    filterCong,
    members,
    transactions,
    accountability,
    congregations,
    departments,
    roles,
    supervisors,
    institution?.ageGroups,
  ]);

  const handleExportPDF = () => {
    exportReportToPDF({
      title: reportData.title,
      institutionName: institution?.name || 'Instituição Eclesiástica',
      columns: reportData.columns,
      rows: reportData.rows,
      filenameBase: selectedReport,
    });
  };

  const handleExportExcel = () => {
    exportReportToExcel({
      title: reportData.title,
      institutionName: institution?.name || 'Instituição Eclesiástica',
      columns: reportData.columns,
      rows: reportData.rows,
      filenameBase: selectedReport,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Selecione o Relatório
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg font-medium text-[#0D2B4F]"
            >
              {REPORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
              Filtrar por Congregação
            </label>
            <select
              value={filterCong}
              onChange={(e) => setFilterCong(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="all">Todas as congregações</option>
              {congregations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-4">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] text-[#1565C0] text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D2B4F]">
              {reportData.title}
            </h3>
            <p className="text-xs text-[#64748B]">
              {reportData.rows.length} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        {reportData.rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-9 h-9 text-[#1565C0] mx-auto mb-2.5" />
            <p className="text-sm font-bold text-[#0D2B4F]">
              Nenhum dado disponível para este relatório
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Os registros aparecerão aqui conforme forem cadastrados no sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAF3FF] text-[#0D2B4F] text-xs font-semibold">
                  {reportData.columns.map((col) => (
                    <th key={col} className="py-3 px-4">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F8FC]">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-3 px-4 text-[#172B4D] tabular-nums"
                      >
                        {cell}
                      </td>
                    ))}
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
