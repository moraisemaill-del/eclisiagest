import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  LogIn,
  AlertCircle,
  LogOut,
  Mail,
  Lock,
  Layers,
  FileCheck2,
  Users,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

export const LoginScreen: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    institution,
    isInitialized,
    signingIn,
    authError,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    logout,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const isUnauthorizedUser =
    firebaseUser &&
    isInitialized === true &&
    (!userProfile || !userProfile.active);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (isRegisterMode) {
      await registerWithEmail(email, password, name);
    } else {
      await signInWithEmail(email, password);
    }
  };

  const fillDefaultTestCredentials = () => {
    setEmail('suaigreja@gmail.com');
    setPassword('deuso++');
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Institutional Panel */}
      <div className="lg:col-span-7 bg-[#0D2B4F] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #64B5F6 0%, transparent 45%), radial-gradient(circle at 80% 80%, #1976D2 0%, transparent 50%)',
          }}
        />

        <div className="relative z-10 flex items-center gap-3.5">
          {institution?.logoUrl ? (
            <img
              src={institution.logoUrl}
              alt={institution.name}
              className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#1565C0] flex items-center justify-center shadow-sm shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">
              {institution?.name || 'EcclesiaGest'}
            </span>
            <span className="text-xs text-[#EAF3FF]/75">
              Plataforma de Gestão Eclesiástica Multicongregacional
            </span>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-xl space-y-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
            Administração centralizada para a Sede e autonomia organizada para
            cada congregação.
          </h1>
          <p className="text-sm sm:text-base text-[#EAF3FF]/80 leading-relaxed">
            Gerencie congregações, supervisores, membros, departamentos,
            movimentações financeiras e prestações de contas mensais em um
            ambiente seguro e auditável.
          </p>

          <div className="pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Layers className="w-5 h-5 text-[#64B5F6]" />
              <h3 className="text-xs font-semibold text-white">
                Estrutura Multicongregacional
              </h3>
              <p className="text-xs text-[#EAF3FF]/70 leading-relaxed">
                Controle por unidade com isolamento de acesso por supervisor e
                liderança local.
              </p>
            </div>

            <div className="space-y-1.5">
              <FileCheck2 className="w-5 h-5 text-[#64B5F6]" />
              <h3 className="text-xs font-semibold text-white">
                Prestação de Contas
              </h3>
              <p className="text-xs text-[#EAF3FF]/70 leading-relaxed">
                Conferência obrigatória de comprovantes, fluxo de aprovação e
                relatórios PDF/Excel.
              </p>
            </div>

            <div className="space-y-1.5">
              <Users className="w-5 h-5 text-[#64B5F6]" />
              <h3 className="text-xs font-semibold text-white">
                Membros e Auditoria
              </h3>
              <p className="text-xs text-[#EAF3FF]/70 leading-relaxed">
                Classificação automática por faixa etária, transferências e
                histórico imutável.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-[#EAF3FF]/70">
          <ShieldCheck className="w-4 h-4 text-[#64B5F6] shrink-0" />
          <span>
            Acesso restrito a usuários administrativos e lideranças autorizadas.
          </span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-[#F5F8FC]">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-7 sm:p-8 space-y-6">
          {authError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{authError}</p>
                {authError.includes('Console do Firebase') && (
                  <a
                    href="https://console.firebase.google.com/project/p-key-hdlipt0dknss/authentication/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block font-semibold text-[#1565C0] underline"
                  >
                    Abrir Authentication no Console do Firebase
                  </a>
                )}
              </div>
            </div>
          )}

          {isUnauthorizedUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#EAF3FF] border border-[#1565C0]/20 text-sm text-[#172B4D] space-y-2">
                <p className="font-semibold text-[#0D2B4F]">
                  Acesso aguardando autorização da Sede
                </p>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Você autenticou como{' '}
                  <span className="font-medium text-[#172B4D]">
                    {firebaseUser.email}
                  </span>
                  , mas este e-mail ainda não foi vinculado a um perfil
                  administrativo ativo pela Sede Geral.
                </p>
                <p className="text-xs text-[#64748B]">
                  Solicite ao Administrador Geral que cadastre seu e-mail no
                  módulo de Usuários e Permissões.
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-4 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#172B4D] hover:bg-[#F5F8FC] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#1565C0]" />
                Sair e entrar com outra conta
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-[#0D2B4F]">
                  Acessar o Painel
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Entre rapidamente com sua conta Google ou utilize e-mail e
                  senha.
                </p>
              </div>

              <button
                type="button"
                disabled={signingIn}
                onClick={signInWithGoogle}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-2.5 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {signingIn ? 'Conectando...' : 'Entrar com Conta Google'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#E2E8F0]" />
                <span className="shrink mx-3 text-[11px] font-medium text-[#64748B]">
                  ou com e-mail e senha
                </span>
                <div className="grow border-t border-[#E2E8F0]" />
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 p-1 bg-[#F5F8FC] border border-[#E2E8F0] rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className={`py-2 rounded-md transition-colors cursor-pointer ${
                    !isRegisterMode
                      ? 'bg-white text-[#0D2B4F] shadow-2xs font-semibold'
                      : 'text-[#64748B] hover:text-[#172B4D]'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className={`py-2 rounded-md transition-colors cursor-pointer ${
                    isRegisterMode
                      ? 'bg-white text-[#0D2B4F] shadow-2xs font-semibold'
                      : 'text-[#64748B] hover:text-[#172B4D]'
                  }`}
                >
                  Criar Conta
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Pr. João Silva"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@dominio.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    Senha (mínimo 6 caracteres)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-2.5 px-4 rounded-lg border border-[#1565C0] bg-white hover:bg-[#EAF3FF] disabled:opacity-60 text-[#1565C0] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {signingIn
                    ? 'Autenticando...'
                    : isRegisterMode
                    ? 'Criar Conta e Entrar'
                    : 'Entrar com E-mail e Senha'}
                </button>

                <button
                  type="button"
                  onClick={fillDefaultTestCredentials}
                  className="w-full py-2 px-3 rounded-lg bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#E2E8F0] text-[11px] font-medium text-[#0D2B4F] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#1565C0]" />
                  Preencher Acesso Padrão (suaigreja@gmail.com)
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
