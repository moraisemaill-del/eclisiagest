import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { InitialSetupWizard } from './components/InitialSetupWizard.tsx';
import { Layout, NavSection } from './components/Layout.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { CongregationsView } from './components/CongregationsView.tsx';
import { SupervisorsView } from './components/SupervisorsView.tsx';
import { MembersView } from './components/MembersView.tsx';
import { RolesDepartmentsView } from './components/RolesDepartmentsView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { AccountabilityView } from './components/AccountabilityView.tsx';
import { EventsView } from './components/EventsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { UsersPermissionsView } from './components/UsersPermissionsView.tsx';
import { AuditView } from './components/AuditView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import {
  Congregation,
  Supervisor,
  Member,
  Role,
  Department,
  FinancialTransaction,
  AccountabilityReport,
  EventItem,
  UserProfile,
  AuditLog,
} from './types/index.ts';
import {
  subscribeCongregations,
  subscribeSupervisors,
  subscribeMembers,
  subscribeRoles,
  subscribeDepartments,
  subscribeTransactions,
  subscribeAccountability,
  subscribeEvents,
  subscribeUsers,
  subscribeUserInvites,
  subscribeAuditLogs,
} from './services/firestoreService.ts';

const MainAppShell: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    isInitialized,
    loading,
    isSedeAdmin,
    hasPermission,
  } = useAuth();

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');

  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [accountability, setAccountability] = useState<AccountabilityReport[]>(
    []
  );
  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!firebaseUser || !userProfile || !userProfile.active || !isInitialized) {
      return;
    }

    const unsubs = [
      subscribeCongregations(userProfile, setCongregations),
      subscribeSupervisors(setSupervisors),
      subscribeMembers(userProfile, setMembers),
      subscribeRoles(setRoles),
      subscribeDepartments(userProfile, setDepartments),
      subscribeTransactions(userProfile, setTransactions),
      subscribeAccountability(userProfile, setAccountability),
      subscribeEvents(userProfile, setEvents),
    ];

    if (isSedeAdmin || hasPermission('manageUsers')) {
      unsubs.push(subscribeUsers(setUsers));
      unsubs.push(subscribeUserInvites(setInvites));
    }

    if (isSedeAdmin || hasPermission('viewAudit')) {
      unsubs.push(subscribeAuditLogs(setAuditLogs));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, userProfile, isInitialized, isSedeAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-[#64748B]">
            Carregando sistema institucional...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginScreen />;
  }

  if (isInitialized === false) {
    return <InitialSetupWizard />;
  }

  if (!userProfile || !userProfile.active) {
    return <LoginScreen />;
  }

  return (
    <Layout activeSection={activeSection} onNavigate={setActiveSection}>
      {activeSection === 'dashboard' && (
        <DashboardView
          congregations={congregations}
          supervisors={supervisors}
          members={members}
          transactions={transactions}
          accountability={accountability}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'congregations' && (
        <CongregationsView
          congregations={congregations}
          supervisors={supervisors}
          members={members}
          departments={departments}
          transactions={transactions}
        />
      )}

      {activeSection === 'supervisors' && (
        <SupervisorsView
          supervisors={supervisors}
          congregations={congregations}
          accountability={accountability}
        />
      )}

      {activeSection === 'members' && (
        <MembersView
          members={members}
          congregations={congregations}
          roles={roles}
          departments={departments}
        />
      )}

      {activeSection === 'roles_departments' && (
        <RolesDepartmentsView
          roles={roles}
          departments={departments}
          congregations={congregations}
          members={members}
        />
      )}

      {activeSection === 'finance' && (
        <FinanceView
          transactions={transactions}
          congregations={congregations}
        />
      )}

      {activeSection === 'accountability' && (
        <AccountabilityView
          accountability={accountability}
          congregations={congregations}
          transactions={transactions}
        />
      )}

      {activeSection === 'events' && (
        <EventsView events={events} congregations={congregations} />
      )}

      {activeSection === 'reports' && (
        <ReportsView
          congregations={congregations}
          supervisors={supervisors}
          members={members}
          departments={departments}
          roles={roles}
          transactions={transactions}
          accountability={accountability}
        />
      )}

      {activeSection === 'users' && (
        <UsersPermissionsView
          users={users}
          invites={invites}
          congregations={congregations}
        />
      )}

      {activeSection === 'audit' && <AuditView auditLogs={auditLogs} />}

      {activeSection === 'settings' && <SettingsView />}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}
