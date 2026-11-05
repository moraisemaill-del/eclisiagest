import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  Institution,
  UserProfile,
  UserPermissions,
} from '../types/index.ts';
import {
  getInstitution,
  getUserProfileByUid,
  claimUserInviteIfExists,
  recordAuditLog,
} from '../services/firestoreService.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  institution: Institution | null;
  isInitialized: boolean | null; // null = loading
  loading: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshState: () => Promise<void>;
  isSedeAdmin: boolean;
  hasPermission: (perm: keyof UserPermissions) => boolean;
  canAccessCongregation: (congId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const loggedSessionUidRef = useRef<string | null>(null);

  const loadContextData = useCallback(async (user: User | null) => {
    setLoading(true);
    setAuthError(null);
    try {
      if (!user || !auth.currentUser) {
        setUserProfile(null);
        setInstitution(null);
        setIsInitialized(null);
        setLoading(false);
        return;
      }

      const inst = await getInstitution();
      setInstitution(inst);
      setIsInitialized(inst !== null);

      let profile = await getUserProfileByUid(user.uid);
      if (!profile && user.email) {
        profile = await claimUserInviteIfExists(user.uid, user.email);
      }

      if (!profile && inst !== null) {
        const { doc: fsDoc, setDoc: fsSetDoc } = await import(
          'firebase/firestore'
        );
        const { db: fsDb } = await import('../lib/firebase.ts');
        const { DEFAULT_PERMISSIONS_BY_ROLE } = await import(
          '../types/index.ts'
        );
        const now = new Date().toISOString();
        const fallbackName =
          user.displayName ||
          (user.email ? user.email.split('@')[0] : 'Administrador');
        const bootstrapped: Omit<UserProfile, 'id'> = {
          uid: user.uid,
          name: fallbackName,
          email: (user.email || '').toLowerCase(),
          phone: '',
          role: 'administrador_geral',
          permissions: DEFAULT_PERMISSIONS_BY_ROLE.administrador_geral,
          active: true,
          createdAt: now,
          updatedAt: now,
        };
        await fsSetDoc(fsDoc(fsDb, 'users', user.uid), bootstrapped);
        profile = { id: user.uid, ...bootstrapped };
      }

      setUserProfile(profile);

      if (profile && loggedSessionUidRef.current !== user.uid) {
        loggedSessionUidRef.current = user.uid;
        await recordAuditLog(
          {
            uid: user.uid,
            name: profile.name,
            email: profile.email,
          },
          'Login no Sistema',
          'Autenticação',
          `Usuário "${profile.name}" (${profile.role}) acessou o sistema.`
        );
      }
    } catch (err: any) {
      console.error('Erro ao carregar sessão:', err);
      setAuthError(
        err?.message || 'Não foi possível verificar as credenciais de acesso.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      loadContextData(user);
    });
    return () => unsub();
  }, [loadContextData]);

  const signInWithGoogle = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      if (
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user'
      ) {
        return;
      }
      console.error('Erro no login Google:', err);
      setAuthError(
        err?.message || 'Falha ao autenticar com o Google. Tente novamente.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        setAuthError(
          'O login por E-mail/Senha ainda não foi ativado no Console do Firebase. Ative-o em Authentication > Sign-in method ou utilize o botão "Entrar com Conta Google" acima.'
        );
      } else if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password'
      ) {
        setAuthError(
          'E-mail ou senha inválidos, ou conta ainda não criada. Se for seu primeiro acesso com este e-mail, selecione "Primeiro Acesso".'
        );
      } else {
        setAuthError(err?.message || 'Falha ao autenticar com e-mail e senha.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    name?: string
  ) => {
    if (signingIn) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      if (name && name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        setAuthError(
          'O login por E-mail/Senha ainda não foi ativado no Console do Firebase. Ative-o em Authentication > Sign-in method ou utilize o botão "Entrar com Conta Google" acima.'
        );
      } else if (err?.code === 'auth/email-already-in-use') {
        setAuthError(
          'Este e-mail já possui uma conta. Selecione "Entrar" para acessar.'
        );
      } else if (err?.code === 'auth/weak-password') {
        setAuthError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setAuthError(err?.message || 'Falha ao criar conta.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    const currentUser = auth.currentUser;
    const currentProfile = userProfile;
    if (currentUser && currentProfile) {
      try {
        await recordAuditLog(
          {
            uid: currentUser.uid,
            name: currentProfile.name,
            email: currentProfile.email,
          },
          'Logout do Sistema',
          'Autenticação',
          `Usuário "${currentProfile.name}" encerrou a sessão.`
        );
      } catch {
        // Ignore audit error on sign-out
      }
    }
    loggedSessionUidRef.current = null;
    setUserProfile(null);
    setInstitution(null);
    setIsInitialized(null);
    await signOut(auth);
  };

  const refreshState = async () => {
    await loadContextData(firebaseUser);
  };

  const isSedeAdmin = Boolean(
    userProfile &&
      userProfile.active &&
      (userProfile.role === 'administrador_geral' ||
        userProfile.role === 'presidente_geral')
  );

  const hasPermission = (perm: keyof UserPermissions): boolean => {
    if (!userProfile || !userProfile.active) return false;
    if (isSedeAdmin) return true;
    return Boolean(userProfile.permissions?.[perm]);
  };

  const canAccessCongregation = (congId: string): boolean => {
    if (!userProfile || !userProfile.active) return false;
    if (isSedeAdmin) return true;
    if (userProfile.role === 'supervisor') {
      return (userProfile.supervisedCongregationIds || []).includes(congId);
    }
    return userProfile.congregationId === congId;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        institution,
        isInitialized,
        loading,
        signingIn,
        authError,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        logout,
        refreshState,
        isSedeAdmin,
        hasPermission,
        canAccessCongregation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
}
