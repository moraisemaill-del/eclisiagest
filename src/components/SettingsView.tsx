import React, { useState } from 'react';
import {
  Building2,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { AgeGroupConfig, DEFAULT_AGE_GROUPS } from '../types/index.ts';
import { updateInstitution } from '../services/firestoreService.ts';
import { readFileAsDataUrl, generateId } from '../lib/formatters.ts';

export const SettingsView: React.FC = () => {
  const { firebaseUser, userProfile, institution, refreshState } = useAuth();

  const [name, setName] = useState(institution?.name || '');
  const [logoUrl, setLogoUrl] = useState(institution?.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(
    institution?.primaryColor || '#1565C0'
  );
  const [darkColor, setDarkColor] = useState(
    institution?.darkColor || '#0D2B4F'
  );
  const [cnpj, setCnpj] = useState(institution?.cnpj || '');
  const [address, setAddress] = useState(institution?.address || '');
  const [city, setCity] = useState(institution?.city || '');
  const [state, setState] = useState(institution?.state || '');
  const [zipCode, setZipCode] = useState(institution?.zipCode || '');
  const [phone, setPhone] = useState(institution?.phone || '');
  const [email, setEmail] = useState(institution?.email || '');
  const [ageGroups, setAgeGroups] = useState<AgeGroupConfig[]>(
    institution?.ageGroups || DEFAULT_AGE_GROUPS
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !userProfile) return;
    if (!name.trim()) {
      setError('O nome da instituição é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateInstitution(
        {
          name: name.trim(),
          logoUrl,
          primaryColor,
          darkColor,
          cnpj: cnpj.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          phone: phone.trim(),
          email: email.trim(),
          ageGroups: ageGroups.filter((g) => g.name.trim().length > 0),
        },
        {
          uid: firebaseUser.uid,
          name: userProfile.name,
          email: userProfile.email,
        }
      );
      await refreshState();
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Configurações institucionais atualizadas com sucesso.</span>
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-[#0D2B4F] border-b border-[#E2E8F0] pb-3">
          Identidade Institucional e Sede Central
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Nome da Instituição *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#172B4D] mb-1.5">
              Logotipo Institucional
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logotipo"
                  className="w-14 h-14 rounded-lg object-contain border border-[#E2E8F0] p-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#F5F8FC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <label className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#1565C0] hover:bg-[#EAF3FF] cursor-pointer inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Alterar logotipo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Cor Principal
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-9 h-9 rounded border border-[#E2E8F0]"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Cor Escura do Menu Lateral
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                className="w-9 h-9 rounded border border-[#E2E8F0]"
              />
              <input
                type="text"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              CNPJ / Registro
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Telefone da Sede
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              E-mail Institucional
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Endereço da Sede
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] mb-1">
              Cidade
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">
                CEP
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Age Groups Configuration */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#0D2B4F]">
              Configuração de Faixas Etárias
            </h2>
            <p className="text-xs text-[#64748B]">
              Personalize livremente as faixas utilizadas na classificação
              automática dos membros
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddAgeGroup}
            className="px-3.5 py-1.5 rounded-lg bg-[#EAF3FF] text-[#1565C0] text-xs font-medium hover:bg-[#1565C0] hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Faixa
          </button>
        </div>

        <div className="space-y-2.5">
          {ageGroups.map((ag) => (
            <div key={ag.id} className="grid grid-cols-12 gap-2.5 items-center">
              <input
                type="text"
                value={ag.name}
                onChange={(e) =>
                  handleUpdateAgeGroup(ag.id, 'name', e.target.value)
                }
                placeholder="Nome da faixa"
                className="col-span-5 px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
              />
              <div className="col-span-3 flex items-center gap-1.5">
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
                  className="w-full px-2.5 py-2 text-xs tabular-nums bg-white border border-[#E2E8F0] rounded-lg"
                />
              </div>
              <div className="col-span-3 flex items-center gap-1.5">
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
                  className="w-full px-2.5 py-2 text-xs tabular-nums bg-white border border-[#E2E8F0] rounded-lg"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveAgeGroup(ag.id)}
                  className="p-1.5 text-[#64748B] hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[#1565C0] hover:bg-[#1976D2] text-white text-sm font-medium cursor-pointer"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  );
};
