import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  AgeGroupConfig,
  DEFAULT_AGE_GROUPS,
  DEFAULT_PERMISSIONS_BY_ROLE,
} from '../types/index.ts';
import { initializeInstitutionAndAdmin } from '../services/firestoreService.ts';
import { readFileAsDataUrl, generateId } from '../lib/formatters.ts';

export const InitialSetupWizard: React.FC = () => {
  const { firebaseUser, refreshState, logout } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Instituição & Identidade Visual
  const [instName, setInstName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1565C0');
  const [darkColor, setDarkColor] = useState('#0D2B4F');

  // Step 2: Informações da Sede Central
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [instEmail, setInstEmail] = useState('');

  // Step 3: Primeiro Administrador Geral & Faixas Etárias
  const [adminName, setAdminName] = useState(firebaseUser?.displayName || '');
  const [adminPhone, setAdminPhone] = useState('');
  const [ageGroups, setAgeGroups] =
    useState<AgeGroupConfig[]>(DEFAULT_AGE_GROUPS);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, 300);
      setLogoUrl(dataUrl);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddAgeGroup = () => {
    setAgeGroups((prev) => [
      ...prev,
      { id: generateId('ag'), name: '', minAge: 0, maxAge: null },
    ]);
  };

  const handleRemoveAgeGroup = (id: string) => {
    setAgeGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const handleUpdateAgeGroup = (
    id: string,
    field: keyof AgeGroupConfig,
    value: string | number | null
  ) => {
    setAgeGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    if (!instName.trim()) {
      setError('Informe o nome da instituição religiosa.');
      setStep(1);
      return;
    }
    if (!adminName.trim()) {
      setError('Informe o nome completo do Administrador Geral.');
      setStep(3);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const cleanAgeGroups = ageGroups.filter((g) => g.name.trim().length > 0);
      await initializeInstitutionAndAdmin(
        {
          name: instName.trim(),
          logoUrl: logoUrl || '',
          primaryColor,
          darkColor,
          cnpj: cnpj.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          phone: phone.trim(),
          email: instEmail.trim(),
          ageGroups:
            cleanAgeGroups.length > 0 ? cleanAgeGroups : DEFAULT_AGE_GROUPS,
          initializedByUid: firebaseUser.uid,
        },
        {
          uid: firebaseUser.uid,
          name: adminName.trim(),
          email: (firebaseUser.email || '').toLowerCase(),
          phone: adminPhone.trim(),
          role: 'administrador_geral',
          permissions: DEFAULT_PERMISSIONS_BY_ROLE.administrador_geral,
          active: true,
        }
      );
      await refreshState();
    } catch (err: any) {
      console.error('Erro na inicialização:', err);
      setError(
        err?.message ||
          'Erro ao concluir a configuração inicial. Verifique os dados e tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] py-10 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#0D2B4F] px-8 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1565C0] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                Configuração Inicial da Instituição
              </h1>
              <p className="text-xs text-[#EAF3FF]/80">
                Sistema zerado — configure a Sede Geral e o primeiro
                Administrador Geral
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-[#EAF3FF]/80 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Trocar conta
          </button>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-3 border-b border-[#E2E8F0] bg-[#F5F8FC] text-xs font-medium">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-3.5 px-4 text-center border-b-2 transition-colors ${
              step === 1
                ? 'border-[#1565C0] text-[#0D2B4F] bg-white font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            1. Instituição e Logotipo
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-3.5 px-4 text-center border-b-2 transition-colors ${
              step === 2
                ? 'border-[#1565C0] text-[#0D2B4F] bg-white font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            2. Dados da Sede Central
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-3.5 px-4 text-center border-b-2 transition-colors ${
              step === 3
                ? 'border-[#1565C0] text-[#0D2B4F] bg-white font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            3. Administrador e Faixas Etárias
          </button>
        </div>

        <form onSubmit={handleFinishSetup} className="p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Nome Oficial da Instituição Religiosa *
                </label>
                <input
                  type="text"
                  required
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  placeholder="Ex.: Igreja Evangélica..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Logotipo da Instituição (opcional, máx. 300 KB)
                </label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Pré-visualização do logotipo"
                      className="w-16 h-16 rounded-lg object-contain border border-[#E2E8F0] bg-[#F5F8FC] p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F5F8FC] flex items-center justify-center text-[#64748B]">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <label className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#EAF3FF] text-xs font-medium text-[#1565C0] cursor-pointer inline-flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4" />
                    Selecionar imagem
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    Cor Principal (Padrão Azul Institucional)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-[#E2E8F0] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    Cor Escura do Menu Lateral
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={darkColor}
                      onChange={(e) => setDarkColor(e.target.value)}
                      className="w-10 h-10 rounded border border-[#E2E8F0] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={darkColor}
                      onChange={(e) => setDarkColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-white border border-[#E2E8F0] rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  CNPJ / Registro Institucional
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Telefone da Sede
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 0000-0000"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  E-mail Institucional da Sede
                </label>
                <input
                  type="email"
                  value={instEmail}
                  onChange={(e) => setInstEmail(e.target.value)}
                  placeholder="contato@instituicao.org.br"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Endereço da Sede Central
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#EAF3FF] border border-[#1565C0]/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#1565C0] shrink-0 mt-0.5" />
                <div className="text-xs text-[#172B4D] space-y-1">
                  <p className="font-semibold text-[#0D2B4F]">
                    Primeiro Administrador Geral
                  </p>
                  <p className="text-[#64748B]">
                    A conta autenticada{' '}
                    <span className="font-medium text-[#172B4D]">
                      {firebaseUser?.email}
                    </span>{' '}
                    será vinculada como Administrador Geral. Após a conclusão, a
                    configuração inicial será bloqueada contra alterações não
                    autorizadas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    Nome Completo do Administrador *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1565C0]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-[#0D2B4F]">
                      Classificação de Faixas Etárias
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Sugestões iniciais configuráveis (você pode ajustar agora
                      ou depois nas configurações).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAgeGroup}
                    className="px-3 py-1.5 rounded-lg bg-[#EAF3FF] text-[#1565C0] text-xs font-medium hover:bg-[#1565C0] hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar faixa
                  </button>
                </div>

                <div className="space-y-2">
                  {ageGroups.map((ag) => (
                    <div
                      key={ag.id}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={ag.name}
                        onChange={(e) =>
                          handleUpdateAgeGroup(ag.id, 'name', e.target.value)
                        }
                        placeholder="Nome da faixa"
                        className="col-span-5 px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                      />
                      <div className="col-span-3 flex items-center gap-1">
                        <span className="text-xs text-[#64748B]">De:</span>
                        <input
                          type="number"
                          min={0}
                          value={ag.minAge}
                          onChange={(e) =>
                            handleUpdateAgeGroup(
                              ag.id,
                              'minAge',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs tabular-nums bg-white border border-[#E2E8F0] rounded-lg"
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span className="text-xs text-[#64748B]">Até:</span>
                        <input
                          type="number"
                          min={0}
                          value={ag.maxAge ?? ''}
                          placeholder="Sem limite"
                          onChange={(e) =>
                            handleUpdateAgeGroup(
                              ag.id,
                              'maxAge',
                              e.target.value === ''
                                ? null
                                : parseInt(e.target.value, 10)
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs tabular-nums bg-white border border-[#E2E8F0] rounded-lg"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveAgeGroup(ag.id)}
                          className="p-1.5 text-[#64748B] hover:text-red-600"
                          title="Remover faixa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-5 border-t border-[#E2E8F0] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#172B4D] hover:bg-[#F5F8FC]"
              >
                Voltar
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-sm font-medium transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting
                  ? 'Salvando configuração...'
                  : 'Concluir Configuração Inicial'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
