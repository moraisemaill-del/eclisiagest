import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  UserCheck,
  Users,
  Briefcase,
  Wallet,
  FileCheck2,
  CalendarDays,
  FileSpreadsheet,
  Shield,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ROLE_LABELS } from '../types/index.ts';

export type NavSection =
  | 'dashboard'
  | 'congregations'
  | 'supervisors'
  | 'members'
  | 'roles_departments'
  | 'finance'
  | 'accountability'
  | 'events'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface LayoutProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  children: React.ReactNode;
}

interface NavItemConfig {
  id: NavSection;
  label: string;
  group: 'Visão Geral' | 'Estrutura e Pessoas' | 'Financeiro e Governança';
  icon: React.FC<{ className?: string }>;
  visible: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  activeSection,
  onNavigate,
  children,
}) => {
  const { userProfile, institution, logout, isSedeAdmin, hasPermission } =
    useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const darkBg = institution?.darkColor || '#0D2B4F';
  const primaryColor = institution?.primaryColor || '#1565C0';

  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Painel Geral',
      group: 'Visão Geral',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'congregations',
      label: 'Congregações',
      group: 'Estrutura e Pessoas',
      icon: Building2,
      visible:
        isSedeAdmin ||
        userProfile?.role === 'supervisor' ||
        hasPermission('manageCongregations'),
    },
    {
      id: 'supervisors',
      label: 'Supervisores',
      group: 'Estrutura e Pessoas',
      icon: UserCheck,
      visible: isSedeAdmin || userProfile?.role === 'supervisor',
    },
    {
      id: 'members',
      label: 'Membros',
      group: 'Estrutura e Pessoas',
      icon: Users,
      visible: hasPermission('viewMembers') || hasPermission('editMembers'),
    },
    {
      id: 'roles_departments',
      label: 'Cargos e Departamentos',
      group: 'Estrutura e Pessoas',
      icon: Briefcase,
      visible:
        hasPermission('manageRoles') ||
        hasPermission('manageDepartments') ||
        hasPermission('viewMembers'),
    },
    {
      id: 'events',
      label: 'Eventos e Agenda',
      group: 'Estrutura e Pessoas',
      icon: CalendarDays,
      visible: hasPermission('manageEvents') || true,
    },
    {
      id: 'finance',
      label: 'Financeiro',
      group: 'Financeiro e Governança',
      icon: Wallet,
      visible: hasPermission('viewFinance') || hasPermission('createFinance'),
    },
    {
      id: 'accountability',
      label: 'Prestação de Contas',
      group: 'Financeiro e Governança',
      icon: FileCheck2,
      visible:
        hasPermission('viewFinance') ||
        hasPermission('createFinance') ||
        hasPermission('approveAccountability'),
    },
    {
      id: 'reports',
      label: 'Relatórios',
      group: 'Financeiro e Governança',
      icon: FileSpreadsheet,
      visible: hasPermission('viewReports'),
    },
    {
      id: 'users',
      label: 'Usuários e Permissões',
      group: 'Financeiro e Governança',
      icon: Shield,
      visible: isSedeAdmin || hasPermission('manageUsers'),
    },
    {
      id: 'audit',
      label: 'Auditoria',
      group: 'Financeiro e Governança',
      icon: History,
      visible: isSedeAdmin || hasPermission('viewAudit'),
    },
    {
      id: 'settings',
      label: 'Configurações da Sede',
      group: 'Financeiro e Governança',
      icon: Settings,
      visible: isSedeAdmin,
    },
  ];

  const visibleItems = navItems.filter((item) => item.visible);
  const currentTitle =
    visibleItems.find((i) => i.id === activeSection)?.label || 'Painel Geral';

  const groups: Array<NavItemConfig['group']> = [
    'Visão Geral',
    'Estrutura e Pessoas',
    'Financeiro e Governança',
  ];

  const handleSelectNav = (id: NavSection) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const initials = (userProfile?.name || 'AD')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const renderNavGroups = () => (
    <div className="space-y-5">
      {groups.map((groupName) => {
        const groupItems = visibleItems.filter((i) => i.group === groupName);
        if (groupItems.length === 0) return null;
        return (
          <div key={groupName} className="space-y-1">
            <p className="px-3.5 text-[11px] font-semibold text-[#EAF3FF]/50">
              {groupName}
            </p>
            {groupItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#1565C0] text-white shadow-xs'
                      : 'text-[#EAF3FF]/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F8FC] text-[#172B4D]">
      {/* Desktop Sidebar */}
      <aside
        style={{ backgroundColor: darkBg }}
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 text-white select-none"
      >
        <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
          {institution?.logoUrl ? (
            <img
              src={institution.logoUrl}
              alt={institution.name}
              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            >
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {institution?.name || 'EcclesiaGest'}
            </p>
            <p className="text-[11px] text-[#EAF3FF]/70 truncate">
              Gestão Multicongregacional
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          {renderNavGroups()}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#1565C0] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {userProfile?.name}
              </p>
              <p className="text-[11px] text-[#EAF3FF]/70 truncate">
                {userProfile ? ROLE_LABELS[userProfile.role] : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0D2B4F]/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            style={{ backgroundColor: darkBg }}
            className="relative w-64 max-w-[80vw] flex flex-col text-white z-10 h-full"
          >
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <span className="text-sm font-bold text-white truncate">
                {institution?.name || 'EcclesiaGest'}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-5 overflow-y-auto">
              {renderNavGroups()}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={logout}
                className="w-full py-2 px-3 rounded-lg bg-white/10 text-xs font-medium text-white flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Encerrar Sessão
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#0D2B4F] hover:bg-[#EAF3FF]"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span className="truncate">{institution?.name}</span>
                <span aria-hidden="true">/</span>
                <span className="text-[#1565C0] font-medium truncate">
                  {currentTitle}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#0D2B4F] truncate">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs font-semibold text-[#172B4D]">
                {userProfile?.name}
              </p>
              <p className="text-[11px] text-[#1565C0] font-medium">
                {userProfile ? ROLE_LABELS[userProfile.role] : ''}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EAF3FF] text-[#1565C0] text-xs font-bold flex items-center justify-center border border-[#1565C0]/15">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
