import { AgeGroupConfig, DEFAULT_AGE_GROUPS } from '../types/index.ts';

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDateTimeBR(isoStr?: string): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const parts = birthDate.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function classifyAgeGroup(
  age: number | null,
  ageGroups?: AgeGroupConfig[]
): string {
  if (age === null) return 'Não informado';
  const groups = ageGroups && ageGroups.length > 0 ? ageGroups : DEFAULT_AGE_GROUPS;
  for (const g of groups) {
    if (age >= g.minAge && (g.maxAge === null || age <= g.maxAge)) {
      return g.name;
    }
  }
  return 'Outros';
}

export function generateId(prefix = 'id'): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`;
}

export function readFileAsDataUrl(file: File, maxSizeKB = 350): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxSizeKB * 1024) {
      reject(
        new Error(
          `O arquivo excede o limite de ${maxSizeKB} KB. Comprima a imagem ou utilize um arquivo menor.`
        )
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao ler arquivo.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}
