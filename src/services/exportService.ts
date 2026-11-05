import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AccountabilityReport,
  Congregation,
  FinancialTransaction,
  Institution,
} from '../types/index.ts';
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  MONTH_NAMES_PT,
} from '../lib/formatters.ts';

export interface ReportExportOptions {
  title: string;
  institutionName: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  filenameBase: string;
}

export function exportReportToPDF(opts: ReportExportOptions): void {
  const doc = new jsPDF({
    orientation: opts.columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header bar in institutional dark blue (#0D2B4F)
  doc.setFillColor(13, 43, 79);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.institutionName || 'Instituição Eclesiástica', 14, 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.title, 14, 17);

  doc.setFontSize(8);
  const generatedText = `Emitido em: ${formatDateTimeBR(new Date().toISOString())}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(generatedText, pageWidth - 14 - doc.getTextWidth(generatedText), 17);

  let startY = 30;
  if (opts.subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(opts.subtitle, 14, 30);
    startY = 35;
  }

  autoTable(doc, {
    startY,
    head: [opts.columns],
    body: opts.rows.map((r) => r.map((cell) => String(cell ?? '—'))),
    theme: 'grid',
    headStyles: {
      fillColor: [21, 101, 192], // #1565C0
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      textColor: [23, 43, 77],
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 252],
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${opts.filenameBase}.pdf`);
}

export function exportReportToExcel(opts: ReportExportOptions): void {
  const worksheetData = [
    [opts.institutionName || 'Instituição Eclesiástica'],
    [opts.title],
    [opts.subtitle || `Emitido em: ${formatDateTimeBR(new Date().toISOString())}`],
    [],
    opts.columns,
    ...opts.rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
  XLSX.writeFile(wb, `${opts.filenameBase}.xlsx`);
}

export interface AccountabilitySpreadsheetOptions {
  institution?: Institution | null;
  congregation?: Congregation;
  congregationName: string;
  month: number;
  year: number;
  report?: AccountabilityReport;
  transactions: FinancialTransaction[];
}

export function exportAccountabilitySpreadsheet(
  opts: AccountabilitySpreadsheetOptions
): void {
  const activeTx = opts.transactions
    .filter((t) => !t.reversed)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalIncome = activeTx
    .filter((t) => t.type === 'entrada')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = activeTx
    .filter((t) => t.type === 'despesa')
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const expensesWithReceipt = activeTx.filter(
    (t) => t.type === 'despesa' && Boolean(t.receiptUrl)
  ).length;
  const totalExpensesCount = activeTx.filter(
    (t) => t.type === 'despesa'
  ).length;

  const monthName = MONTH_NAMES_PT[opts.month - 1] || String(opts.month);
  const instName = opts.institution?.name || 'Instituição Eclesiástica';

  // Group by category
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  for (const tx of activeTx) {
    if (tx.type === 'entrada') {
      incomeByCategory[tx.category] =
        (incomeByCategory[tx.category] || 0) + tx.amount;
    } else {
      expenseByCategory[tx.category] =
        (expenseByCategory[tx.category] || 0) + tx.amount;
    }
  }

  // Sheet 1: Resumo da Prestação
  const summaryRows: (string | number)[][] = [
    ['PLANILHA OFICIAL DE PRESTAÇÃO DE CONTAS MENSAL'],
    ['Instituição', instName],
    ['CNPJ', opts.institution?.cnpj || '—'],
    ['Congregação', opts.congregationName],
    ['Código da Unidade', opts.congregation?.code || '—'],
    ['Pastor Dirigente', opts.congregation?.pastorName || '—'],
    ['Supervisor Responsável', opts.congregation?.supervisorName || '—'],
    ['Competência', `${monthName} / ${opts.year}`],
    ['Situação Atual', opts.report?.status || 'Em preenchimento'],
    ['Enviado por', opts.report?.submittedByName || '—'],
    [
      'Data de Envio',
      opts.report?.submittedAt ? formatDateTimeBR(opts.report.submittedAt) : '—',
    ],
    ['Analisado por', opts.report?.reviewedByName || '—'],
    [
      'Data da Análise',
      opts.report?.reviewedAt ? formatDateTimeBR(opts.report.reviewedAt) : '—',
    ],
    ['Parecer / Justificativa', opts.report?.justification || '—'],
    ['Emitido em', formatDateTimeBR(new Date().toISOString())],
    [],
    ['RESUMO FINANCEIRO DO PERÍODO', 'VALOR (R$)'],
    ['Total de Entradas', Number(totalIncome.toFixed(2))],
    ['Total de Despesas', Number(totalExpense.toFixed(2))],
    ['Saldo Final do Mês', Number(balance.toFixed(2))],
    ['Quantidade de Lançamentos Ativos', activeTx.length],
    [
      'Comprovantes de Despesa Anexados',
      `${expensesWithReceipt} de ${totalExpensesCount}`,
    ],
    [],
    ['ENTRADAS POR CATEGORIA', 'VALOR (R$)'],
    ...Object.entries(incomeByCategory).map(([cat, val]) => [
      cat,
      Number(val.toFixed(2)),
    ]),
    ['Subtotal Entradas', Number(totalIncome.toFixed(2))],
    [],
    ['DESPESAS POR CATEGORIA', 'VALOR (R$)'],
    ...Object.entries(expenseByCategory).map(([cat, val]) => [
      cat,
      Number(val.toFixed(2)),
    ]),
    ['Subtotal Despesas', Number(totalExpense.toFixed(2))],
  ];

  // Sheet 2: Lançamentos Detalhados
  const txHeader = [
    'Data',
    'Tipo',
    'Categoria',
    'Descrição',
    'Forma de Pagamento',
    'Valor (R$)',
    'Comprovante Anexado',
    'Arquivo do Comprovante',
    'Lançado por',
    'Observações',
  ];

  const txRows: (string | number)[][] = activeTx.map((t) => [
    formatDateBR(t.date),
    t.type === 'entrada' ? 'Entrada' : 'Despesa',
    t.category,
    t.description,
    t.paymentMethod || '—',
    Number((t.type === 'entrada' ? t.amount : -t.amount).toFixed(2)),
    t.receiptUrl ? 'Sim' : 'Não',
    t.receiptName || (t.receiptUrl ? 'Anexo' : '—'),
    t.createdByName || '—',
    t.notes || '—',
  ]);

  const txSheetData: (string | number)[][] = [
    [`Lançamentos Detalhados — ${opts.congregationName} (${monthName}/${opts.year})`],
    [],
    txHeader,
    ...txRows,
    [],
    ['', '', '', '', 'TOTAL ENTRADAS', Number(totalIncome.toFixed(2))],
    ['', '', '', '', 'TOTAL DESPESAS', Number((-totalExpense).toFixed(2))],
    ['', '', '', '', 'SALDO LÍQUIDO', Number(balance.toFixed(2))],
  ];

  // Sheet 3: Histórico de Tramitação
  const historyRows: (string | number)[][] = [
    [`Histórico de Tramitação — ${opts.congregationName} (${monthName}/${opts.year})`],
    [],
    ['Data/Hora', 'Situação', 'Responsável', 'Observação / Parecer'],
    ...(opts.report?.history || []).map((h) => [
      formatDateTimeBR(h.timestamp),
      h.status,
      h.userName,
      h.note || '—',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 42 }];

  const wsTx = XLSX.utils.aoa_to_sheet(txSheetData);
  wsTx['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 36 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 22 },
    { wch: 30 },
  ];

  const wsHistory = XLSX.utils.aoa_to_sheet(historyRows);
  wsHistory['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 26 }, { wch: 45 }];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo da Prestação');
  XLSX.utils.book_append_sheet(wb, wsTx, 'Lançamentos Detalhados');
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Histórico de Tramitação');

  const safeCong = opts.congregationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '');
  XLSX.writeFile(
    wb,
    `prestacao_contas_${safeCong}_${opts.year}_${String(opts.month).padStart(2, '0')}.xlsx`
  );
}

export function exportAccountabilityPDF(
  opts: AccountabilitySpreadsheetOptions
): void {
  const activeTx = opts.transactions
    .filter((t) => !t.reversed)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalIncome = activeTx
    .filter((t) => t.type === 'entrada')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = activeTx
    .filter((t) => t.type === 'despesa')
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const monthName = MONTH_NAMES_PT[opts.month - 1] || String(opts.month);
  const safeCong = opts.congregationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '');

  exportReportToPDF({
    title: `Prestação de Contas — ${opts.congregationName} (${monthName}/${opts.year})`,
    institutionName: opts.institution?.name || 'Instituição Eclesiástica',
    subtitle: `Situação: ${opts.report?.status || 'Em preenchimento'} | Entradas: ${formatCurrency(
      totalIncome
    )} | Despesas: ${formatCurrency(totalExpense)} | Saldo: ${formatCurrency(balance)}`,
    columns: [
      'Data',
      'Tipo',
      'Categoria',
      'Descrição',
      'Pagamento',
      'Valor',
      'Comprovante',
    ],
    rows: activeTx.map((t) => [
      formatDateBR(t.date),
      t.type === 'entrada' ? 'Entrada' : 'Despesa',
      t.category,
      t.description,
      t.paymentMethod || '—',
      formatCurrency(t.amount),
      t.receiptUrl ? 'Sim' : 'Não',
    ]),
    filenameBase: `prestacao_contas_${safeCong}_${opts.year}_${String(opts.month).padStart(2, '0')}`,
  });
}
