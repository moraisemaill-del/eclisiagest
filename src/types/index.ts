export interface AgeGroupConfig {
  id: string;
  name: string;
  minAge: number;
  maxAge: number | null; // null = sem limite superior (ex: 60+)
}

export const DEFAULT_AGE_GROUPS: AgeGroupConfig[] = [
  { id: 'infantil', name: 'Infantil', minAge: 0, maxAge: 11 },
  { id: 'adolescentes', name: 'Adolescentes', minAge: 12, maxAge: 17 },
  { id: 'jovens', name: 'Jovens', minAge: 18, maxAge: 29 },
  { id: 'adultos', name: 'Adultos', minAge: 30, maxAge: 59 },
  { id: 'terceira_idade', name: 'Terceira idade', minAge: 60, maxAge: null },
];

export interface Institution {
  id?: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  darkColor: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  ageGroups?: AgeGroupConfig[];
  initializedByUid: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | 'presidente_geral'
  | 'administrador_geral'
  | 'supervisor'
  | 'pastor_dirigente'
  | 'tesoureiro'
  | 'secretario'
  | 'lider_departamento';

export const ROLE_LABELS: Record<UserRole, string> = {
  presidente_geral: 'Presidente Geral',
  administrador_geral: 'Administrador Geral',
  supervisor: 'Supervisor',
  pastor_dirigente: 'Pastor Dirigente',
  tesoureiro: 'Tesoureiro',
  secretario: 'Secretário',
  lider_departamento: 'Líder de Departamento',
};

export interface UserPermissions {
  viewMembers: boolean;
  editMembers: boolean;
  viewFinance: boolean;
  createFinance: boolean;
  approveAccountability: boolean;
  manageCongregations: boolean;
  manageDepartments: boolean;
  manageRoles: boolean;
  manageEvents: boolean;
  viewReports: boolean;
  viewAudit: boolean;
  manageUsers: boolean;
}

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  viewMembers: 'Visualizar membros',
  editMembers: 'Cadastrar e editar membros',
  viewFinance: 'Visualizar financeiro',
  createFinance: 'Lançar movimentações e fechar mês',
  approveAccountability: 'Analisar e aprovar prestações',
  manageCongregations: 'Gerenciar congregações',
  manageDepartments: 'Gerenciar departamentos',
  manageRoles: 'Gerenciar cargos',
  manageEvents: 'Gerenciar eventos e agenda',
  viewReports: 'Visualizar e exportar relatórios',
  viewAudit: 'Visualizar auditoria',
  manageUsers: 'Gerenciar usuários e permissões',
};

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
  presidente_geral: {
    viewMembers: true,
    editMembers: true,
    viewFinance: true,
    createFinance: true,
    approveAccountability: true,
    manageCongregations: true,
    manageDepartments: true,
    manageRoles: true,
    manageEvents: true,
    viewReports: true,
    viewAudit: true,
    manageUsers: true,
  },
  administrador_geral: {
    viewMembers: true,
    editMembers: true,
    viewFinance: true,
    createFinance: true,
    approveAccountability: true,
    manageCongregations: true,
    manageDepartments: true,
    manageRoles: true,
    manageEvents: true,
    viewReports: true,
    viewAudit: true,
    manageUsers: true,
  },
  supervisor: {
    viewMembers: true,
    editMembers: false,
    viewFinance: true,
    createFinance: false,
    approveAccountability: true,
    manageCongregations: false,
    manageDepartments: true,
    manageRoles: false,
    manageEvents: true,
    viewReports: true,
    viewAudit: false,
    manageUsers: false,
  },
  pastor_dirigente: {
    viewMembers: true,
    editMembers: true,
    viewFinance: true,
    createFinance: false,
    approveAccountability: false,
    manageCongregations: false,
    manageDepartments: true,
    manageRoles: true,
    manageEvents: true,
    viewReports: true,
    viewAudit: false,
    manageUsers: false,
  },
  tesoureiro: {
    viewMembers: false,
    editMembers: false,
    viewFinance: true,
    createFinance: true,
    approveAccountability: false,
    manageCongregations: false,
    manageDepartments: false,
    manageRoles: false,
    manageEvents: false,
    viewReports: true,
    viewAudit: false,
    manageUsers: false,
  },
  secretario: {
    viewMembers: true,
    editMembers: true,
    viewFinance: false,
    createFinance: false,
    approveAccountability: false,
    manageCongregations: false,
    manageDepartments: true,
    manageRoles: true,
    manageEvents: true,
    viewReports: true,
    viewAudit: false,
    manageUsers: false,
  },
  lider_departamento: {
    viewMembers: true,
    editMembers: false,
    viewFinance: false,
    createFinance: false,
    approveAccountability: false,
    manageCongregations: false,
    manageDepartments: true,
    manageRoles: false,
    manageEvents: true,
    viewReports: false,
    viewAudit: false,
    manageUsers: false,
  },
};

export interface UserProfile {
  id?: string;
  uid?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  congregationId?: string;
  supervisedCongregationIds?: string[];
  departmentId?: string;
  permissions: UserPermissions;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CongregationStatus = 'ativa' | 'inativa';

export interface Congregation {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  pastorName?: string;
  supervisorId?: string;
  supervisorName?: string;
  openedAt?: string;
  status: CongregationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supervisor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  congregationIds: string[];
  appointedAt?: string;
  status: 'ativo' | 'inativo';
  notes?: string;
  userUid?: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberStatus = 'Ativo' | 'Afastado' | 'Transferido' | 'Inativo';

export interface TransferRecord {
  fromCongregationId: string;
  fromCongregationName: string;
  toCongregationId: string;
  toCongregationName: string;
  date: string;
  reason?: string;
  recordedByName: string;
}

export interface Member {
  id: string;
  name: string;
  photoUrl?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  congregationId: string;
  joinedAt?: string;
  status: MemberStatus;
  roleId?: string;
  roleName?: string;
  departmentId?: string;
  departmentName?: string;
  notes?: string;
  transferHistory?: TransferRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  responsibilities?: string;
  departmentName?: string;
  hierarchyLevel: number;
  superiorRole?: string;
  congregationId?: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt: string;
}

export const SUGGESTED_ROLES: Array<{ name: string; hierarchyLevel: number }> = [
  { name: 'Presidente geral', hierarchyLevel: 1 },
  { name: 'Vice-presidente', hierarchyLevel: 2 },
  { name: 'Diretor', hierarchyLevel: 3 },
  { name: 'Supervisor', hierarchyLevel: 4 },
  { name: 'Pastor dirigente', hierarchyLevel: 5 },
  { name: 'Vice-dirigente', hierarchyLevel: 6 },
  { name: 'Presbítero', hierarchyLevel: 7 },
  { name: 'Diácono', hierarchyLevel: 8 },
  { name: 'Tesoureiro', hierarchyLevel: 8 },
  { name: 'Secretário', hierarchyLevel: 8 },
  { name: 'Líder de jovens', hierarchyLevel: 9 },
  { name: 'Líder infantil', hierarchyLevel: 9 },
  { name: 'Líder de louvor', hierarchyLevel: 9 },
  { name: 'Professor', hierarchyLevel: 10 },
  { name: 'Auxiliar', hierarchyLevel: 11 },
  { name: 'Voluntário', hierarchyLevel: 12 },
];

export interface Department {
  id: string;
  name: string;
  description?: string;
  congregationId: string;
  leaderName?: string;
  viceLeaderName?: string;
  memberIds?: string[];
  createdDate?: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt: string;
}

export const SUGGESTED_DEPARTMENTS: string[] = [
  'Jovens',
  'Crianças',
  'Louvor',
  'Evangelismo',
  'Mulheres',
  'Homens',
  'Casais',
  'Diaconato',
  'Ensino',
  'Ação social',
];

export type TransactionType = 'entrada' | 'despesa';

export const INCOME_CATEGORIES: string[] = [
  'Dízimos',
  'Ofertas',
  'Doações',
  'Contribuições',
  'Outras receitas',
];

export const EXPENSE_CATEGORIES: string[] = [
  'Água',
  'Energia',
  'Aluguel',
  'Manutenção',
  'Materiais',
  'Alimentação',
  'Transporte',
  'Eventos',
  'Outras despesas',
];

export const PAYMENT_METHODS: string[] = [
  'PIX',
  'Dinheiro',
  'Transferência Bancária',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Boleto',
  'Cheque',
];

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: number;
  year: number;
  createdByUid: string;
  createdByName: string;
  congregationId: string;
  paymentMethod?: string;
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
  reversed: boolean;
  reversalReason?: string;
  reversedByName?: string;
  reversedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccountabilityStatus =
  | 'Em preenchimento'
  | 'Enviada'
  | 'Em análise'
  | 'Devolvida'
  | 'Aprovada pelo supervisor'
  | 'Recebida pela sede';

export interface AccountabilityHistoryEntry {
  status: AccountabilityStatus;
  userUid: string;
  userName: string;
  timestamp: string;
  note?: string;
}

export interface AccountabilityReport {
  id: string;
  congregationId: string;
  month: number;
  year: number;
  status: AccountabilityStatus;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  submittedByUid?: string;
  submittedByName?: string;
  submittedAt?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  justification?: string;
  history?: AccountabilityHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'Agendado' | 'Em andamento' | 'Concluído' | 'Cancelado';

export const EVENT_TYPES: string[] = [
  'Culto',
  'Congresso',
  'Reunião',
  'Evento',
  'Programação especial',
  'Atividade de departamento',
];

export interface EventItem {
  id: string;
  name: string;
  type?: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  congregationId: string;
  responsibleName?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  action: string;
  module: string;
  targetId?: string;
  details: string;
  createdAt: string;
}
