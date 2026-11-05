import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { generateId } from '../lib/formatters.ts';
import {
  Institution,
  UserProfile,
  Congregation,
  Supervisor,
  Member,
  Role,
  Department,
  FinancialTransaction,
  AccountabilityReport,
  AccountabilityStatus,
  EventItem,
  AuditLog,
  TransferRecord,
} from '../types/index.ts';

export interface AuditActor {
  uid: string;
  name: string;
  email?: string;
}

export async function recordAuditLog(
  actor: AuditActor,
  action: string,
  module: string,
  details: string,
  targetId?: string
): Promise<void> {
  const id = generateId('audit');
  const payload: Omit<AuditLog, 'id'> = {
    userId: actor.uid,
    userName: actor.name,
    userEmail: actor.email || '',
    action,
    module,
    targetId: targetId || '',
    details: details.slice(0, 1000),
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'auditLogs', id), payload);
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

// --- Institution ---

export async function getInstitution(): Promise<Institution | null> {
  try {
    const snap = await getDoc(doc(db, 'institutions', 'main'));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Institution, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'institutions/main');
  }
}

export async function initializeInstitutionAndAdmin(
  institutionData: Omit<Institution, 'id' | 'createdAt' | 'updatedAt'>,
  adminProfile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const now = new Date().toISOString();
  const instPayload: Omit<Institution, 'id'> = {
    ...institutionData,
    createdAt: now,
    updatedAt: now,
  };
  const userPayload: Omit<UserProfile, 'id'> = {
    ...adminProfile,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', institutionData.initializedByUid), userPayload);
    batch.set(doc(db, 'institutions', 'main'), instPayload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'institutions/main');
  }

  await recordAuditLog(
    {
      uid: institutionData.initializedByUid,
      name: adminProfile.name,
      email: adminProfile.email,
    },
    'Inicialização do Sistema',
    'Sede Geral',
    `Instituição "${institutionData.name}" configurada e administrador geral "${adminProfile.name}" criado.`,
    'main'
  );
}

export async function updateInstitution(
  data: Partial<Institution>,
  actor: AuditActor
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'institutions', 'main'), {
      ...data,
      updatedAt: now,
    });
    await recordAuditLog(
      actor,
      'Atualização Institucional',
      'Configurações',
      'Dados da instituição e sede central atualizados.',
      'main'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'institutions/main');
  }
}

// --- Users & Invites ---

export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function claimUserInviteIfExists(
  uid: string,
  email: string
): Promise<UserProfile | null> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const inviteSnap = await getDoc(doc(db, 'userInvites', normalizedEmail));
    if (!inviteSnap.exists()) return null;

    const inviteData = inviteSnap.data() as Omit<UserProfile, 'id'>;
    const now = new Date().toISOString();
    const newProfile: Omit<UserProfile, 'id'> = {
      ...inviteData,
      uid,
      email: normalizedEmail,
      createdAt: inviteData.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', uid), newProfile);
    await deleteDoc(doc(db, 'userInvites', normalizedEmail));
    return { id: uid, ...newProfile };
  } catch (error) {
    console.error('Erro ao verificar convite de usuário:', error);
    return null;
  }
}

export function subscribeUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>),
      }));
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'users');
    }
  );
}

export function subscribeUserInvites(
  onData: (invites: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'userInvites'),
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>),
      }));
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      else handleFirestoreError(err, OperationType.LIST, 'userInvites');
    }
  );
}

export async function createOrInviteUser(
  userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor
): Promise<void> {
  const now = new Date().toISOString();
  const normalizedEmail = userData.email.trim().toLowerCase();
  const payload: Omit<UserProfile, 'id'> = {
    ...userData,
    email: normalizedEmail,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'userInvites', normalizedEmail), payload);
    await recordAuditLog(
      actor,
      'Cadastro de Usuário',
      'Usuários e Permissões',
      `Usuário "${userData.name}" (${normalizedEmail}) cadastrado com perfil "${userData.role}".`,
      normalizedEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `userInvites/${normalizedEmail}`);
  }
}

export async function createUserWithPasswordAdmin(
  userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>,
  password: string,
  apiKey: string,
  actor: AuditActor
): Promise<void> {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        displayName: userData.name.trim(),
        returnSecureToken: false,
      }),
    }
  );
  const json = await res.json();
  if (!res.ok || !json.localId) {
    const code = json?.error?.message || '';
    if (code.includes('EMAIL_EXISTS')) {
      throw new Error(
        'Este e-mail já possui uma conta criada. Deixe o campo de senha em branco para vincular o perfil como convite.'
      );
    }
    if (code.includes('WEAK_PASSWORD')) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    throw new Error(code || 'Não foi possível criar a conta de acesso.');
  }

  const now = new Date().toISOString();
  const uid = json.localId as string;
  const payload: Omit<UserProfile, 'id'> = {
    ...userData,
    uid,
    email: normalizedEmail,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'users', uid), payload);
    await recordAuditLog(
      actor,
      'Criação Direta de Usuário',
      'Usuários e Permissões',
      `Usuário "${userData.name}" (${normalizedEmail}) criado com login e senha diretos no perfil "${userData.role}".`,
      uid
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
  }
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>,
  actor: AuditActor,
  isInvite = false
): Promise<void> {
  const col = isInvite ? 'userInvites' : 'users';
  try {
    await updateDoc(doc(db, col, userId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    await recordAuditLog(
      actor,
      'Alteração de Permissões/Usuário',
      'Usuários e Permissões',
      `Perfil do usuário "${data.name || userId}" atualizado.`,
      userId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${col}/${userId}`);
  }
}

export async function deleteUserOrInvite(
  userId: string,
  userName: string,
  actor: AuditActor,
  isInvite = false
): Promise<void> {
  const col = isInvite ? 'userInvites' : 'users';
  try {
    await deleteDoc(doc(db, col, userId));
    await recordAuditLog(
      actor,
      'Remoção de Usuário',
      'Usuários e Permissões',
      `Usuário "${userName}" removido.`,
      userId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${col}/${userId}`);
  }
}

// --- Congregations ---

export function subscribeCongregations(
  userProfile: UserProfile,
  onData: (items: Congregation[]) => void
): Unsubscribe {
  const isSede =
    userProfile.role === 'administrador_geral' ||
    userProfile.role === 'presidente_geral';

  let q;
  if (isSede) {
    q = query(collection(db, 'congregations'), orderBy('name', 'asc'));
  } else if (userProfile.role === 'supervisor') {
    const ids = userProfile.supervisedCongregationIds || [];
    if (ids.length === 0) {
      onData([]);
      return () => {};
    }
    q = query(
      collection(db, 'congregations'),
      where('__name__', 'in', ids.slice(0, 30))
    );
  } else if (userProfile.congregationId) {
    q = query(
      collection(db, 'congregations'),
      where('__name__', '==', userProfile.congregationId)
    );
  } else {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Congregation, 'id'>),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'congregations')
  );
}

export async function saveCongregation(
  data: Omit<Congregation, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor,
  existingId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = existingId || generateId('cong');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'congregations', existingId), {
        ...data,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Edição de Congregação',
        'Congregações',
        `Congregação "${data.name}" (${data.code}) atualizada.`,
        existingId
      );
    } else {
      await setDoc(doc(db, 'congregations', id), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Cadastro de Congregação',
        'Congregações',
        `Congregação "${data.name}" (${data.code}) cadastrada.`,
        id
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      `congregations/${id}`
    );
  }
}

export async function deleteCongregation(
  congregationId: string,
  congregationName: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'congregations', congregationId));
    await recordAuditLog(
      actor,
      'Exclusão de Congregação',
      'Congregações',
      `Congregação "${congregationName}" excluída do sistema.`,
      congregationId
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `congregations/${congregationId}`
    );
  }
}

// --- Supervisors ---

export function subscribeSupervisors(
  onData: (items: Supervisor[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'supervisors'), orderBy('name', 'asc')),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Supervisor, 'id'>),
        }))
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'supervisors')
  );
}

export async function saveSupervisor(
  data: Omit<Supervisor, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor,
  existingId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = existingId || generateId('sup');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'supervisors', existingId), {
        ...data,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Edição de Supervisor',
        'Supervisores',
        `Supervisor "${data.name}" atualizado (${data.congregationIds.length} congregações vinculadas).`,
        existingId
      );
    } else {
      await setDoc(doc(db, 'supervisors', id), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Cadastro de Supervisor',
        'Supervisores',
        `Supervisor "${data.name}" cadastrado (${data.congregationIds.length} congregações vinculadas).`,
        id
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      `supervisors/${id}`
    );
  }
}

export async function deleteSupervisor(
  supervisorId: string,
  supervisorName: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'supervisors', supervisorId));
    await recordAuditLog(
      actor,
      'Exclusão de Supervisor',
      'Supervisores',
      `Supervisor "${supervisorName}" excluído do sistema.`,
      supervisorId
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `supervisors/${supervisorId}`
    );
  }
}

// --- Members ---

export function subscribeMembers(
  userProfile: UserProfile,
  onData: (items: Member[]) => void
): Unsubscribe {
  const isSede =
    userProfile.role === 'administrador_geral' ||
    userProfile.role === 'presidente_geral';

  let q;
  if (isSede) {
    q = query(collection(db, 'members'));
  } else if (userProfile.role === 'supervisor') {
    const ids = userProfile.supervisedCongregationIds || [];
    if (ids.length === 0) {
      onData([]);
      return () => {};
    }
    q = query(
      collection(db, 'members'),
      where('congregationId', 'in', ids.slice(0, 30))
    );
  } else if (userProfile.congregationId) {
    q = query(
      collection(db, 'members'),
      where('congregationId', '==', userProfile.congregationId)
    );
  } else {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Member, 'id'>),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'members')
  );
}

export async function saveMember(
  data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor,
  existingId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = existingId || generateId('mem');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'members', existingId), {
        ...data,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Edição de Membro',
        'Membros',
        `Cadastro do membro "${data.name}" atualizado.`,
        existingId
      );
    } else {
      await setDoc(doc(db, 'members', id), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Cadastro de Membro',
        'Membros',
        `Membro "${data.name}" cadastrado.`,
        id
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      `members/${id}`
    );
  }
}

export async function transferMember(
  member: Member,
  fromCongregationName: string,
  toCongregationId: string,
  toCongregationName: string,
  reason: string,
  actor: AuditActor
): Promise<void> {
  const now = new Date().toISOString();
  const transferEntry: TransferRecord = {
    fromCongregationId: member.congregationId,
    fromCongregationName,
    toCongregationId,
    toCongregationName,
    date: now.split('T')[0],
    reason,
    recordedByName: actor.name,
  };
  const updatedHistory = [...(member.transferHistory || []), transferEntry];

  try {
    await updateDoc(doc(db, 'members', member.id), {
      congregationId: toCongregationId,
      status: 'Ativo',
      transferHistory: updatedHistory,
      updatedAt: now,
    });
    await recordAuditLog(
      actor,
      'Transferência de Membro',
      'Membros',
      `Membro "${member.name}" transferido de "${fromCongregationName}" para "${toCongregationName}". Motivo: ${reason || 'Não informado'}.`,
      member.id
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `members/${member.id}`);
  }
}

export async function deleteMember(
  memberId: string,
  memberName: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'members', memberId));
    await recordAuditLog(
      actor,
      'Exclusão de Membro',
      'Membros',
      `Cadastro do membro "${memberName}" excluído do sistema.`,
      memberId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `members/${memberId}`);
  }
}

// --- Roles ---

export function subscribeRoles(onData: (items: Role[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'roles'), orderBy('hierarchyLevel', 'asc')),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Role, 'id'>),
        }))
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'roles')
  );
}

export async function saveRole(
  data: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor,
  existingId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = existingId || generateId('role');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'roles', existingId), {
        ...data,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Edição de Cargo',
        'Cargos',
        `Cargo "${data.name}" atualizado.`,
        existingId
      );
    } else {
      await setDoc(doc(db, 'roles', id), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Cadastro de Cargo',
        'Cargos',
        `Cargo "${data.name}" cadastrado.`,
        id
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      `roles/${id}`
    );
  }
}

export async function deleteRole(
  roleId: string,
  roleName: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'roles', roleId));
    await recordAuditLog(
      actor,
      'Exclusão de Cargo',
      'Cargos',
      `Cargo "${roleName}" excluído do sistema.`,
      roleId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `roles/${roleId}`);
  }
}

// --- Departments ---

export function subscribeDepartments(
  userProfile: UserProfile,
  onData: (items: Department[]) => void
): Unsubscribe {
  const isSede =
    userProfile.role === 'administrador_geral' ||
    userProfile.role === 'presidente_geral';

  let q;
  if (isSede) {
    q = query(collection(db, 'departments'));
  } else if (userProfile.role === 'supervisor') {
    const ids = userProfile.supervisedCongregationIds || [];
    if (ids.length === 0) {
      onData([]);
      return () => {};
    }
    q = query(
      collection(db, 'departments'),
      where('congregationId', 'in', ids.slice(0, 30))
    );
  } else if (userProfile.congregationId) {
    q = query(
      collection(db, 'departments'),
      where('congregationId', '==', userProfile.congregationId)
    );
  } else {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Department, 'id'>),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'departments')
  );
}

export async function saveDepartment(
  data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor,
  existingId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = existingId || generateId('dept');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'departments', existingId), {
        ...data,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Edição de Departamento',
        'Departamentos',
        `Departamento "${data.name}" atualizado.`,
        existingId
      );
    } else {
      await setDoc(doc(db, 'departments', id), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Cadastro de Departamento',
        'Departamentos',
        `Departamento "${data.name}" cadastrado.`,
        id
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      `departments/${id}`
    );
  }
}

export async function deleteDepartment(
  departmentId: string,
  departmentName: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'departments', departmentId));
    await recordAuditLog(
      actor,
      'Exclusão de Departamento',
      'Departamentos',
      `Departamento "${departmentName}" excluído do sistema.`,
      departmentId
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `departments/${departmentId}`
    );
  }
}

// --- Financial Transactions ---

export function subscribeTransactions(
  userProfile: UserProfile,
  onData: (items: FinancialTransaction[]) => void
): Unsubscribe {
  const isSede =
    userProfile.role === 'administrador_geral' ||
    userProfile.role === 'presidente_geral';

  let q;
  if (isSede) {
    q = query(collection(db, 'transactions'));
  } else if (userProfile.role === 'supervisor') {
    const ids = userProfile.supervisedCongregationIds || [];
    if (ids.length === 0) {
      onData([]);
      return () => {};
    }
    q = query(
      collection(db, 'transactions'),
      where('congregationId', 'in', ids.slice(0, 30))
    );
  } else if (userProfile.congregationId) {
    q = query(
      collection(db, 'transactions'),
      where('congregationId', '==', userProfile.congregationId)
    );
  } else {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FinancialTransaction, 'id'>),
      }));
      list.sort((a, b) => b.date.localeCompare(a.date));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
  );
}

export async function createTransaction(
  data: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt' | 'reversed'>,
  actor: AuditActor
): Promise<string> {
  const now = new Date().toISOString();
  const id = generateId('fin');
  try {
    await setDoc(doc(db, 'transactions', id), {
      ...data,
      reversed: false,
      createdAt: now,
      updatedAt: now,
    });
    await recordAuditLog(
      actor,
      'Lançamento Financeiro',
      'Financeiro',
      `${data.type === 'entrada' ? 'Entrada' : 'Despesa'} (${data.category}) de R$ ${data.amount.toFixed(2)} — ${data.description}`,
      id
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `transactions/${id}`);
  }
}

export async function reverseTransaction(
  transaction: FinancialTransaction,
  reason: string,
  actor: AuditActor
): Promise<void> {
  if (!reason.trim()) {
    throw new Error('É obrigatório informar o motivo do estorno.');
  }
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'transactions', transaction.id), {
      reversed: true,
      reversalReason: reason.trim(),
      reversedByName: actor.name,
      reversedAt: now,
      updatedAt: now,
    });
    await recordAuditLog(
      actor,
      'Estorno Financeiro',
      'Financeiro',
      `Lançamento "${transaction.description}" (R$ ${transaction.amount.toFixed(2)}) estornado. Motivo: ${reason.trim()}`,
      transaction.id
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `transactions/${transaction.id}`
    );
  }
}

export async function deleteTransaction(
  transaction: FinancialTransaction,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'transactions', transaction.id));
    await recordAuditLog(
      actor,
      'Exclusão Financeira',
      'Financeiro',
      `Lançamento "${transaction.description}" (${
        transaction.type === 'entrada' ? 'Entrada' : 'Despesa'
      } - ${transaction.category}, R$ ${transaction.amount.toFixed(
        2
      )}) excluído do sistema.`,
      transaction.id
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `transactions/${transaction.id}`
    );
  }
}

// --- Accountability Reports (Prestação de Contas) ---

export function subscribeAccountability(
  userProfile: UserProfile,
  onData: (items: AccountabilityReport[]) => void
): Unsubscribe {
  const isSede =
    userProfile.role === 'administrador_geral' ||
    userProfile.role === 'presidente_geral';

  let q;
  if (isSede) {
    q = query(collection(db, 'accountability'));
  } else if (userProfile.role === 'supervisor') {
    const ids = userProfile.supervisedCongregationIds || [];
    if (ids.length === 0) {
      onData([]);
      return () => {};
    }
    q = query(
      collection(db, 'accountability'),
      where('congregationId', 'in', ids.slice(0, 30))
    );
  } else if (userProfile.congregationId) {
    q = query(
      collection(db, 'accountability'),
      where('congregationId', '==', userProfile.congregationId)
    );
  } else {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AccountabilityReport, 'id'>),
      }));
      list.sort((a, b) => b.year - a.year || b.month - a.month);
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'accountability')
  );
}

export async function submitAccountabilityReport(
  congregationId: string,
  month: number,
  year: number,
  monthTransactions: FinancialTransaction[],
  actor: AuditActor,
  existingReport?: AccountabilityReport
): Promise<void> {
  const activeTx = monthTransactions.filter((t) => !t.reversed);
  const missingReceipts = activeTx.filter(
    (t) => t.type === 'despesa' && !t.receiptUrl
  );
  if (missingReceipts.length > 0) {
    throw new Error(
      `Não é possível enviar a prestação de contas: ${missingReceipts.length} despesa(s) não possuem comprovante anexado.`
    );
  }

  const totalIncome = activeTx
    .filter((t) => t.type === 'entrada')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = activeTx
    .filter((t) => t.type === 'despesa')
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const now = new Date().toISOString();
  const id = existingReport?.id || `${congregationId}_${year}_${month}`;
  const history = [
    ...(existingReport?.history || []),
    {
      status: 'Enviada' as AccountabilityStatus,
      userUid: actor.uid,
      userName: actor.name,
      timestamp: now,
      note: 'Prestação de contas fechada e enviada para análise.',
    },
  ];

  try {
    if (existingReport) {
      await updateDoc(doc(db, 'accountability', id), {
        status: 'Enviada',
        totalIncome,
        totalExpense,
        balance,
        submittedByUid: actor.uid,
        submittedByName: actor.name,
        submittedAt: now,
        history,
        updatedAt: now,
      });
    } else {
      await setDoc(doc(db, 'accountability', id), {
        congregationId,
        month,
        year,
        status: 'Enviada',
        totalIncome,
        totalExpense,
        balance,
        submittedByUid: actor.uid,
        submittedByName: actor.name,
        submittedAt: now,
        history,
        createdAt: now,
        updatedAt: now,
      });
    }
    await recordAuditLog(
      actor,
      'Envio de Prestação de Contas',
      'Prestação de Contas',
      `Prestação de contas (${month}/${year}) enviada com saldo de R$ ${balance.toFixed(2)}.`,
      id
    );
  } catch (error) {
    handleFirestoreError(
      error,
      existingReport ? OperationType.UPDATE : OperationType.CREATE,
      `accountability/${id}`
    );
  }
}

export async function reviewAccountabilityReport(
  report: AccountabilityReport,
  newStatus: AccountabilityStatus,
  justification: string,
  actor: AuditActor
): Promise<void> {
  if (report.submittedByUid && report.submittedByUid === actor.uid) {
    throw new Error(
      'Regra de controle: o usuário que enviou a prestação de contas não pode aprová-la ou analisá-la.'
    );
  }
  if (newStatus === 'Devolvida' && !justification.trim()) {
    throw new Error(
      'É obrigatório informar uma justificativa ao devolver a prestação para correção.'
    );
  }

  const now = new Date().toISOString();
  const history = [
    ...(report.history || []),
    {
      status: newStatus,
      userUid: actor.uid,
      userName: actor.name,
      timestamp: now,
      note: justification.trim() || `Status alterado para ${newStatus}.`,
    },
  ];

  try {
    await updateDoc(doc(db, 'accountability', report.id), {
      status: newStatus,
      reviewedByUid: actor.uid,
      reviewedByName: actor.name,
      reviewedAt: now,
      justification: justification.trim(),
      history,
      updatedAt: now,
    });
    await recordAuditLog(
      actor,
      `Prestação ${newStatus}`,
      'Prestação de Contas',
      `Prestação (${report.month}/${report.year}) marcada como "${newStatus}". ${justification.trim() ? 'Justificativa: ' + justification.trim() : ''}`,
      report.id
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `accountability/${report.id}`
    );
  }
}

export async function deleteAccountabilityReport(
  reportId: string,
  label: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'accountability', reportId));
    await recordAuditLog(
      actor,
      'Exclusão de Prestação de Contas',
      'Prestação de Contas',
      `Prestação de contas "${label}" excluída do sistema.`,
      reportId
    );
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `accountability/${reportId}`
    );
  }
}

// --- Events ---

export function subscribeEvents(
  userProfile: UserProfile,
  onData: (items: EventItem[]) => void
): Unsubscribe {
  const isSede =
    userProfile.role === 'administrador_geral' ||
    userProfile.role === 'presidente_geral';

  let q;
  if (isSede) {
    q = query(collection(db, 'events'));
  } else if (userProfile.role === 'supervisor') {
    const ids = userProfile.supervisedCongregationIds || [];
    if (ids.length === 0) {
      onData([]);
      return () => {};
    }
    q = query(
      collection(db, 'events'),
      where('congregationId', 'in', ids.slice(0, 30))
    );
  } else if (userProfile.congregationId) {
    q = query(
      collection(db, 'events'),
      where('congregationId', '==', userProfile.congregationId)
    );
  } else {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EventItem, 'id'>),
      }));
      list.sort((a, b) => a.date.localeCompare(b.date));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'events')
  );
}

export async function saveEvent(
  data: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>,
  actor: AuditActor,
  existingId?: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = existingId || generateId('evt');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'events', existingId), {
        ...data,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Edição de Evento',
        'Eventos',
        `Evento "${data.name}" (${data.date}) atualizado.`,
        existingId
      );
    } else {
      await setDoc(doc(db, 'events', id), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      await recordAuditLog(
        actor,
        'Cadastro de Evento',
        'Eventos',
        `Evento "${data.name}" (${data.date}) agendado.`,
        id
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      `events/${id}`
    );
  }
}

export async function deleteEvent(
  eventId: string,
  eventName: string,
  actor: AuditActor
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'events', eventId));
    await recordAuditLog(
      actor,
      'Exclusão de Evento',
      'Eventos',
      `Evento "${eventName}" removido da agenda.`,
      eventId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

// --- Audit Logs ---

export function subscribeAuditLogs(
  onData: (items: AuditLog[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc')),
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLog, 'id'>),
        }))
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
  );
}

export async function fetchAllAuditLogsOnce(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLog, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'auditLogs');
  }
}
