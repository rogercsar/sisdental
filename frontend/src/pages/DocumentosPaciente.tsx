import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string; cpf?: string | null }
interface Documento {
  id: number;
  paciente_id: number;
  tipo_documento: string | null;
  data_geracao: string | null; // ISO (YYYY-MM-DD)
  nome_arquivo: string | null;
  storage_path: string | null;
  descricao: string | null;
}

const tipoOpcoes = ['Radiografia', 'Receita', 'Consentimento', 'Exame', 'Orçamento', 'Outro'];

function hojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_');
}

const DocumentosPaciente: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const { id } = useParams<{ id: string }>();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');

  // Novo documento
  const [file, setFile] = useState<File | null>(null);
  const [tipoDoc, setTipoDoc] = useState<string>('Outro');
  const [dataGeracao, setDataGeracao] = useState<string>(hojeISO());
  const [descricao, setDescricao] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !id) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const pacienteId = Number(id);
        const { data: p, error: pErr } = await supabase
          .from('pacientes')
          .select('id, nome, cpf')
          .eq('id', pacienteId)
          .single();
        if (pErr) throw pErr;
        setPaciente(p as Paciente);

        const { data: d, error: dErr } = await supabase
          .from('documentos_paciente')
          .select('id, paciente_id, tipo_documento, data_geracao, nome_arquivo, storage_path, descricao')
          .eq('paciente_id', pacienteId)
          .order('data_geracao', { ascending: false });
        if (dErr) throw dErr;
        setDocs((d ?? []) as Documento[]);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, id]);

  const reloadDocs = async () => {
    if (!supabase || !id) return;
    try {
      const pacienteId = Number(id);
      const { data: d, error: dErr } = await supabase
        .from('documentos_paciente')
        .select('id, paciente_id, tipo_documento, data_geracao, nome_arquivo, storage_path, descricao')
        .eq('paciente_id', pacienteId)
        .order('data_geracao', { ascending: false });
      if (dErr) throw dErr;
      setDocs((d ?? []) as Documento[]);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase || !id) { setError('Supabase não configurado.'); return; }
    if (!file) { setError('Selecione um arquivo.'); return; }
    if (!tipoDoc) { setError('Selecione o tipo do documento.'); return; }
    setUploading(true);
    try {
      const pacienteId = Number(id);
      const safeName = sanitizeFilename(file.name);
      const path = `pacientes/${pacienteId}/${Date.now()}_${safeName}`;

      // Upload ao bucket
      const { error: upErr } = await supabase.storage
        .from('documentos')
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // Insert metadata
      const { error: insErr } = await supabase
        .from('documentos_paciente')
        .insert({
          paciente_id: pacienteId,
          tipo_documento: tipoDoc,
          data_geracao: dataGeracao || hojeISO(),
          nome_arquivo: file.name,
          storage_path: path,
          descricao: descricao || null,
        });
      if (insErr) throw insErr;

      // Reset form e recarrega lista
      setFile(null);
      setTipoDoc('Outro');
      setDataGeracao(hojeISO());
      setDescricao('');
      await reloadDocs();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setUploading(false);
    }
  };

  const visualizar = async (doc: Documento) => {
    if (!supabase || !doc.storage_path) return;
    try {
      const { data } = supabase.storage
        .from('documentos')
        .getPublicUrl(doc.storage_path);
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  const excluir = async (doc: Documento) => {
    if (!supabase || !doc.storage_path) return;
    const ok = window.confirm(`Excluir documento "${doc.nome_arquivo}"?`);
    if (!ok) return;
    try {
      const { error: rmErr } = await supabase.storage
        .from('documentos')
        .remove([doc.storage_path]);
      if (rmErr) throw rmErr;
      const { error: delErr } = await supabase
        .from('documentos_paciente')
        .delete()
        .eq('id', doc.id);
      if (delErr) throw delErr;
      await reloadDocs();
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  const docsFiltrados = docs.filter(d => filtroTipo === 'Todos' || (d.tipo_documento ?? 'Outro') === filtroTipo);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          <i className="fas fa-file-alt me-2"></i>
          Documentos {paciente ? `- ${paciente.nome}` : ''}
        </h2>
        <div className="d-flex gap-2">
          {paciente && (
            <Link to={`/pacientes/${paciente.id}/detalhes`} className="btn btn-outline-secondary">
              Voltar aos detalhes
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Upload de novo documento */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Adicionar Documento</h5>
          {!paciente ? (
            <p className="text-muted">Carregando paciente...</p>
          ) : (
            <form onSubmit={onUpload} className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Arquivo</label>
                <input type="file" className="form-control" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
              </div>
              <div className="col-md-3">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
                  {tipoOpcoes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Data do Documento</label>
                <input type="date" className="form-control" value={dataGeracao} onChange={(e) => setDataGeracao(e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label">Descrição (opcional)</label>
                <input type="text" className="form-control" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Observações" />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <label className="me-2">Filtrar por tipo:</label>
          <select className="form-select d-inline-block" style={{ width: 220 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option>Todos</option>
            {tipoOpcoes.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="text-muted">{docsFiltrados.length} documento(s)</div>
      </div>

      {/* Lista de documentos */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Documentos do Paciente</h5>
          {loading ? (
            <p>Carregando...</p>
          ) : docsFiltrados.length === 0 ? (
            <p className="text-muted">Nenhum documento encontrado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Nome do Arquivo</th>
                    <th>Descrição</th>
                    <th style={{ width: 160 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {docsFiltrados.map(doc => (
                    <tr key={doc.id}>
                      <td>{doc.data_geracao ?? '-'}</td>
                      <td>{doc.tipo_documento ?? '-'}</td>
                      <td>{doc.nome_arquivo ?? '-'}</td>
                      <td>{doc.descricao ?? '-'}</td>
                      <td>
                        <button className="btn btn-outline-primary btn-sm me-2" onClick={() => visualizar(doc)} title="Visualizar/baixar">
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => excluir(doc)} title="Excluir">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentosPaciente;