import {
  calculateAge,
  classifyAgeGroup,
  formatCurrency,
  formatDateBR,
} from '../lib/formatters.ts';
import {
  DEFAULT_AGE_GROUPS,
  DEFAULT_PERMISSIONS_BY_ROLE,
} from '../types/index.ts';

export function runDomainRuleChecks(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  const assert = (cond: boolean, label: string) => {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error('Teste falhou:', label);
    }
  };

  // 1. Formatação monetária e de data pt-BR
  assert(
    formatCurrency(1250.5).includes('1.250,50'),
    'Formatação em Real (R$)'
  );
  assert(formatDateBR('2026-11-04') === '04/11/2026', 'Data padrão brasileiro');

  // 2. Classificação automática de faixa etária
  assert(
    classifyAgeGroup(8, DEFAULT_AGE_GROUPS) === 'Infantil',
    'Faixa Infantil (0-11)'
  );
  assert(
    classifyAgeGroup(15, DEFAULT_AGE_GROUPS) === 'Adolescentes',
    'Faixa Adolescentes (12-17)'
  );
  assert(
    classifyAgeGroup(24, DEFAULT_AGE_GROUPS) === 'Jovens',
    'Faixa Jovens (18-29)'
  );
  assert(
    classifyAgeGroup(42, DEFAULT_AGE_GROUPS) === 'Adultos',
    'Faixa Adultos (30-59)'
  );
  assert(
    classifyAgeGroup(65, DEFAULT_AGE_GROUPS) === 'Terceira idade',
    'Faixa Terceira idade (60+)'
  );

  // 3. Cálculo de idade a partir da data de nascimento
  const age = calculateAge('2000-01-01');
  assert(age !== null && age >= 25, 'Cálculo de idade');

  // 4. Regras de permissão por perfil (RBAC)
  assert(
    DEFAULT_PERMISSIONS_BY_ROLE.administrador_geral.manageUsers === true,
    'Administrador geral gerencia usuários'
  );
  assert(
    DEFAULT_PERMISSIONS_BY_ROLE.tesoureiro.createFinance === true &&
      DEFAULT_PERMISSIONS_BY_ROLE.tesoureiro.approveAccountability === false,
    'Tesoureiro lança financeiro mas não aprova prestação'
  );
  assert(
    DEFAULT_PERMISSIONS_BY_ROLE.supervisor.approveAccountability === true &&
      DEFAULT_PERMISSIONS_BY_ROLE.supervisor.createFinance === false,
    'Supervisor aprova prestação mas não lança financeiro'
  );

  return { passed, failed };
}
