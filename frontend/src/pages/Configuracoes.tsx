import React, { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../lib/supabase';

interface ClinicaConfig {
  id?: number;
  nome: string;
  logo_url: string;
  cnpj: string;
  telefone: string;
  endereco: string;
}

const Configuracoes: React.FC = () => {
  const sb = useMemo(() => getSupabase(), []);

  const envDefaults: ClinicaConfig = {
    nome: (import.meta.env.VITE_CLINIC_NAME as string) ?? 'SisDental Clínica Odontológica',
    logo_url: (import.meta.env.VITE_CLINIC_LOGO_URL as string) ?? '',
    cnpj: (import.meta.env.VITE_CLINIC_CNPJ as string) ?? '',
    telefone: (import.meta.env.VITE_CLINIC_PHONE as string) ?? '',
    endereco: (import.meta.env.VITE_CLINIC_ADDRESS as string) ?? '',
  };

  const [activeTab, setActiveTab] = useState<'perfil' | 'usuarios' | 'sistema'>('perfil');
  const [form, setForm] = useState<ClinicaConfig>({ ...envDefaults });
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        if (!sb) {
          setForm({ ...envDefaults });
          setNotice('Supabase não configurado. Usando valores do .env como padrão.');
          return;
        }
        const { data, error } = await sb
          .from('clinica_config')
          .select('id, nome, logo_url, cnpj, telefone, endereco')
          .limit(1)
          .maybeSingle();
        if (error) {
          // Se a tabela não existir ou RLS bloquear, manter padrão de env e avisar
          if (error.message?.toLowerCase().includes('relation') || error.code === '42P01') {
            setNotice('Tabela \'clinica_config\' não encontrada. Configure a tabela no banco para persistir os dados.');
            setForm({ ...envDefaults });
          } else {
            setError(error.message);
            setForm({ ...envDefaults });
          }
        } else if (data) {
          setForm({
            id: data.id,
            nome: data.nome ?? envDefaults.nome,
            logo_url: data.logo_url ?? envDefaults.logo_url,
            cnpj: data.cnpj ?? envDefaults.cnpj,
            telefone: data.telefone ?? envDefaults.telefone,
            endereco: data.endereco ?? envDefaults.endereco,
          });
        } else {
          setForm({ ...envDefaults });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  const salvar = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!sb) {
        setError('Supabase não disponível. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
        return;
      }
      const payload: ClinicaConfig = {
        id: 1,
        nome: form.nome.trim(),
        logo_url: form.logo_url.trim(),
        cnpj: form.cnpj.trim(),
        telefone: form.telefone.trim(),
        endereco: form.endereco.trim(),
      };
      const { error } = await sb.from('clinica_config').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setSuccess('Dados salvos com sucesso.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof ClinicaConfig, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="container py-3">
      <h2 className="mb-3">Configurações</h2>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'perfil' ? 'active' : ''}`}
            onClick={() => setActiveTab('perfil')}
          >
            Meu Perfil
          </button>
        </li>
        <li className="nav-item">
          <button className="nav-link disabled" title="Em breve">Usuários</button>
        </li>
        <li className="nav-item">
          <button className="nav-link disabled" title="Em breve">Sistema</button>
        </li>
      </ul>

      {activeTab === 'perfil' && (
        <div className="card">
          <div className="card-body">
            {loading && <div className="alert alert-secondary">Carregando...</div>}
            {notice && <div className="alert alert-warning">{notice}</div>}
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nome da Clínica</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.nome}
                  onChange={(e) => setField('nome', e.target.value)}
                  placeholder="Ex.: SisDental Clínica Odontológica"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">CNPJ</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.cnpj}
                  onChange={(e) => setField('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.telefone}
                  onChange={(e) => setField('telefone', e.target.value)}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Endereço</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.endereco}
                  onChange={(e) => setField('endereco', e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>
              <div className="col-md-12">
                <label className="form-label">Logo (URL)</label>
                <input
                  type="url"
                  className="form-control"
                  value={form.logo_url}
                  onChange={(e) => setField('logo_url', e.target.value)}
                  placeholder="https://.../logo.png"
                />
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setForm({ ...envDefaults })}
                disabled={saving}
                title="Recarregar valores padrão do .env"
              >
                Recarregar padrão (.env)
              </button>
            </div>

            <hr className="my-4" />
            <div className="row align-items-center">
              <div className="col-md-2">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="img-fluid" />
                ) : (
                  <div className="text-muted small">Sem logo</div>
                )}
              </div>
              <div className="col">
                <div className="text-muted small">Pré-visualização cabeçalho da impressão</div>
                <div className="border rounded p-3">
                  <h5 className="mb-1">{form.nome || envDefaults.nome}</h5>
                  <div className="small">CNPJ: {form.cnpj || '—'}</div>
                  <div className="small">{form.endereco || '—'}</div>
                  <div className="small">{form.telefone || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;