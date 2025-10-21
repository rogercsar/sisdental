import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string }
interface Tratamento {
  id: number;
  paciente_id: number;
  dente_numero: number | null;
  tipo_tratamento: string | null;
  valor: number | null;
  concluido: boolean | null;
  observacoes: string | null;
  data_tratamento: string | null; // YYYY-MM-DD
}

interface Servico { id: number; nome: string; preco_padrao?: number | null; ativo?: boolean | null }

const adultRow1 = [18,17,16,15,14,13,12,11]; // arcada superior direita -> esquerda
const adultRow2 = [21,22,23,24,25,26,27,28]; // arcada superior esquerda -> direita
const adultRow3 = [38,37,36,35,34,33,32,31]; // arcada inferior esquerda -> direita
const adultRow4 = [41,42,43,44,45,46,47,48]; // arcada inferior direita -> esquerda

const childRow1 = [55,54,53,52,51]; // superior direita-decíduos
const childRow2 = [61,62,63,64,65]; // superior esquerda-decíduos
const childRow3 = [75,74,73,72,71]; // inferior esquerda-decíduos
const childRow4 = [81,82,83,84,85]; // inferior direita-decíduos

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatCurrency = (value: any) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  try { return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  catch { return String(value); }
};

const Odontograma: React.FC = () => {
  const { pacienteId } = useParams();
  const supabase = useMemo(() => getSupabase(), []);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [arcada, setArcada] = useState<'adulta' | 'infantil'>('adulta');

  const [tipoTratamento, setTipoTratamento] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState<number | 'manual' | ''>('');
  const [valor, setValor] = useState('');
  const [concluido, setConcluido] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [data, setData] = useState(todayISO());
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'concluido' | 'andamento'>('todos');

  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !pacienteId) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const idNum = Number(pacienteId);
        const { data: p, error: pErr } = await supabase
          .from('pacientes')
          .select('id, nome')
          .eq('id', idNum)
          .single();
        if (pErr) throw pErr;
        setPaciente(p as Paciente);

        const { data: tData, error: tErr } = await supabase
          .from('odontograma_tratamentos')
          .select('id, paciente_id, dente_numero, tipo_tratamento, valor, concluido, observacoes, data_tratamento')
          .eq('paciente_id', idNum)
          .order('data_tratamento', { ascending: false });
        if (tErr) throw tErr;
        setTratamentos((tData ?? []) as Tratamento[]);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, pacienteId]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('servicos')
      .select('id, nome, preco_padrao, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar serviços:', error);
        } else {
          setServicos((data || []) as Servico[]);
        }
      });
  }, [supabase]);

  const tratamentosDoDente = (numero: number | null) => tratamentos.filter(t => t.dente_numero === numero);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Supabase não configurado'); return; }
    if (!paciente || !selectedTooth) { setError('Selecione um dente para registrar o tratamento.'); return; }
    setError(null);
    try {
      const { data: inserted, error: insErr } = await supabase
        .from('odontograma_tratamentos')
        .insert({
          paciente_id: paciente.id,
          dente_numero: selectedTooth,
          tipo_tratamento: tipoTratamento || null,
          valor: valor ? parseFloat(valor) : null,
          concluido,
          observacoes: observacoes || null,
          data_tratamento: data || todayISO(),
        })
        .select();
      if (insErr) throw insErr;
      setTratamentos([...(inserted ?? []) as Tratamento[], ...tratamentos]);
      setTipoTratamento('');
      setValor('');
      setConcluido(false);
      setObservacoes('');
      setData(todayISO());
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  const toggleConcluido = async (t: Tratamento) => {
    if (!supabase) return;
    try {
      const { error: updErr } = await supabase
        .from('odontograma_tratamentos')
        .update({ concluido: !t.concluido })
        .eq('id', t.id);
      if (updErr) throw updErr;
      setTratamentos(tratamentos.map(x => x.id === t.id ? { ...x, concluido: !t.concluido } : x));
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Odontograma {paciente ? `- ${paciente.nome}` : ''}</h2>
        {paciente && (
          <Link to={`/pacientes/${paciente.id}/detalhes`} className="btn btn-outline-secondary">Voltar aos detalhes</Link>
        )}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Grid de dentes */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Selecione um dente</h5>
          <div className="d-flex gap-2 mb-3">
            <button
              type="button"
              className={`btn btn-sm ${arcada === 'adulta' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setArcada('adulta')}
            >
              Arcada Adulta
            </button>
            <button
              type="button"
              className={`btn btn-sm ${arcada === 'infantil' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setArcada('infantil')}
            >
              Arcada Infantil
            </button>
          </div>
          <div className="mb-3">
            {(arcada === 'adulta' ? [adultRow1, adultRow2, adultRow3, adultRow4] : [childRow1, childRow2, childRow3, childRow4]).map((row, idx) => (
              <div key={idx} className="d-flex flex-wrap gap-2 mb-2">
                {row.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`btn ${selectedTooth === n ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedTooth(n)}
                  >{n}</button>
                ))}
              </div>
            ))}
          </div>
          <p className="text-muted">FDI adulto (11–18, 21–28, 31–38, 41–48) e infantil (51–55, 61–65, 71–75, 81–85).</p>
        </div>
      </div>

      {/* Formulário de novo tratamento */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Registrar Tratamento</h5>
          <form onSubmit={onSubmit}>
            <div className="row">
              <div className="col-md-3 mb-3">
                <label className="form-label">Dente *</label>
                <input type="number" className="form-control" value={selectedTooth ?? ''} onChange={(e) => setSelectedTooth(Number(e.target.value)||null)} required />
              </div>
              <div className="col-md-3 mb-3">
                <label className="form-label">Data *</label>
                <input type="date" className="form-control" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Tratamento *</label>
                <select
                  className="form-select"
                  value={servicoId}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setServicoId('');
                      setTipoTratamento('');
                    } else if (v === 'manual') {
                      setServicoId('manual');
                      setTipoTratamento('');
                    } else {
                      const id = Number(v);
                      setServicoId(id);
                      const s = servicos.find(x => x.id === id);
                      setTipoTratamento(s?.nome ?? '');
                      if (s?.preco_padrao != null) setValor(String(s.preco_padrao));
                    }
                  }}
                  required
                >
                  <option value="">Selecione o serviço...</option>
                  {servicos.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
                  <option value="manual">Outro (digitar)</option>
                </select>
                {servicoId === 'manual' && (
                  <input
                    type="text"
                    className="form-control mt-2"
                    placeholder="Descreva o tratamento"
                    value={tipoTratamento}
                    onChange={(e) => setTipoTratamento(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="row">
              <div className="col-md-3 mb-3">
                <label className="form-label">Valor (R$)</label>
                <input type="number" step="0.01" className="form-control" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div className="col-md-3 mb-3 d-flex align-items-center">
                <div className="form-check mt-4">
                  <input className="form-check-input" type="checkbox" checked={concluido} id="concluidoCheck" onChange={(e) => setConcluido(e.target.checked)} />
                  <label className="form-check-label" htmlFor="concluidoCheck">Concluído</label>
                </div>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Observações</label>
                <textarea className="form-control" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Salvar</button>
          </form>
        </div>
      </div>

      {/* Lista por dente selecionado */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Tratamentos do Dente {selectedTooth ?? '-'}</h5>
          {selectedTooth && tratamentosDoDente(selectedTooth).length > 0 ? (
            <>
              <div className="d-flex justify-content-end mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">Filtrar:</span>
                  <select className="form-select form-select-sm" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}>
                    <option value="todos">Todos</option>
                    <option value="concluido">Concluído</option>
                    <option value="andamento">Em Andamento</option>
                  </select>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tratamento</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Observações</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tratamentosDoDente(selectedTooth).filter(t => (
                      filtroStatus === 'todos' ? true : (filtroStatus === 'concluido' ? !!t.concluido : !t.concluido)
                    )).map(t => (
                      <tr key={t.id}>
                        <td>{t.data_tratamento ?? '-'}</td>
                        <td>{t.tipo_tratamento ?? '-'}</td>
                        <td>{formatCurrency(t.valor)}</td>
                        <td>{t.concluido ? (<span className="badge bg-success">Concluído</span>) : (<span className="badge bg-warning text-dark">Em Andamento</span>)}</td>
                        <td>{t.observacoes ?? '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => toggleConcluido(t)}>
                            {t.concluido ? 'Reabrir' : 'Concluir'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-muted">Nenhum tratamento para o dente selecionado.</p>
          )}
        </div>
      </div>

      {/* Histórico geral do paciente */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Histórico Geral</h5>
          {tratamentos.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dente</th>
                    <th>Tratamento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {tratamentos.map(t => (
                    <tr key={t.id}>
                      <td>{t.data_tratamento ?? '-'}</td>
                      <td>{t.dente_numero ?? '-'}</td>
                      <td>{t.tipo_tratamento ?? '-'}</td>
                      <td>{formatCurrency(t.valor)}</td>
                      <td>{t.concluido ? (<span className="badge bg-success">Concluído</span>) : (<span className="badge bg-warning text-dark">Em Andamento</span>)}</td>
                      <td>{t.observacoes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">Nenhum tratamento registrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Odontograma;