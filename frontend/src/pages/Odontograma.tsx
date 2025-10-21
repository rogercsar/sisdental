import React, { useEffect, useMemo, useState, useRef } from 'react';
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

// Helpers: quadrant, status e cores por tipo de tratamento
const toothQuadrant = (n: number) => {
  const q = Math.floor(n / 10);
  return q > 4 ? (q - 4) : q; // infantil: 5..8 -> 1..4
};

const parseDate = (s: string | null) => {
  if (!s) return 0;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
};

const tipoCategoria = (t: string | null | undefined): string => {
  if (!t) return 'outro';
  const s = t.toLowerCase();
  if (s.includes('resta')) return 'restauracao';
  if (s.includes('endo') || s.includes('canal')) return 'endodontia';
  if (s.includes('extra') || s.includes('exo')) return 'exodontia';
  if (s.includes('limp') || s.includes('profil')) return 'profilaxia';
  if (s.includes('orto') || s.includes('aparelho')) return 'ortodontia';
  if (s.includes('perio') || s.includes('rasp')) return 'periodontia';
  if (s.includes('prot') || s.includes('coroa') || s.includes('ponte')) return 'protese';
  if (s.includes('clare')) return 'clareamento';
  if (s.includes('consulta') || s.includes('exame')) return 'consulta';
  return 'outro';
};

const corPorCategoria: Record<string, string> = {
  restauracao: '#f9d46b', // amarelo suave
  endodontia: '#a78bfa', // roxo
  exodontia: '#fca5a5', // vermelho claro
  profilaxia: '#93c5fd', // azul claro
  ortodontia: '#f472b6', // rosa
  periodontia: '#f59e0b', // laranja
  protese: '#b6b1a4', // cinza quente
  clareamento: '#fde68a', // creme
  consulta: '#c7d2fe', // lavanda
  outro: '#e5e7eb', // cinza neutro
};

const Odontograma: React.FC = () => {
  const { pacienteId } = useParams();
  const supabase = useMemo(() => getSupabase(), []);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [arcada, setArcada] = useState<'adulta' | 'infantil'>('adulta');
  const archesRef = useRef<HTMLDivElement>(null);
  const [archAmp, setArchAmp] = useState(14);
  const [archSmooth, setArchSmooth] = useState(1);
  
  useEffect(() => {
    const updateAmp = () => {
      const w = archesRef.current?.clientWidth ?? window.innerWidth;
      const dynamic = Math.max(8, Math.min(18, Math.round(w / 60)));
      setArchAmp(dynamic);
      const smooth = w < 480 ? 0.6 : w < 768 ? 0.8 : 1.0;
      setArchSmooth(smooth);
    };
    updateAmp();
    window.addEventListener('resize', updateAmp);
    return () => window.removeEventListener('resize', updateAmp);
  }, [arcada]);
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

  // Último tratamento, status, cor por tipo e tooltip
  const ultimoTratamento = (numero: number) => {
    const arr = tratamentosDoDente(numero);
    if (arr.length === 0) return null;
    return arr.sort((a, b) => parseDate(b.data_tratamento) - parseDate(a.data_tratamento) || (b.id - a.id))[0];
  };
  const statusDoDente = (numero: number): 'none'|'andamento'|'concluido' => {
    const lt = ultimoTratamento(numero);
    if (!lt) return 'none';
    return lt.concluido ? 'concluido' : 'andamento';
  };
  const corTipoDoDente = (numero: number) => {
    const lt = ultimoTratamento(numero);
    const cat = tipoCategoria(lt?.tipo_tratamento);
    return corPorCategoria[cat];
  };
  const tooltipDoDente = (numero: number) => {
    const lt = ultimoTratamento(numero);
    if (!lt) return `Dente ${numero}: sem tratamentos registrados`;
    const sts = lt.concluido ? 'Concluído' : 'Em andamento';
    const dt = lt.data_tratamento ? new Date(lt.data_tratamento).toLocaleDateString('pt-BR') : '-';
    return `Dente ${numero}: Último ${dt} • ${lt.tipo_tratamento ?? '—'} • ${sts}`;
  };

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

      {/* Arcadas com dentes estilizados */}
      <div className="card mb-4 shadow-sm odontograma-card">
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

          {(() => {
            const upper = arcada === 'adulta' ? [...adultRow1, ...adultRow2] : [...childRow1, ...childRow2];
            const lower = arcada === 'adulta' ? [...adultRow3, ...adultRow4] : [...childRow3, ...childRow4];
            return (
              <div className="odontograma-arches" ref={archesRef}>
                <div className="odontograma-arch-label">Arcada Superior {arcada === 'adulta' ? '(Q1 11–18 | Q2 21–28)' : '(Q5 51–55 | Q6 61–65)'}</div>
                <div className="odontograma-arch upper mb-3">
                  {upper.map((n, i) => (
                    <Tooth
                      key={n}
                      number={n}
                      arch="upper"
                      index={i}
                      total={upper.length}
                      amp={archAmp}
                      infantil={arcada==='infantil'}
                      status={statusDoDente(n)}
                      typeColor={corTipoDoDente(n)}
                      quadrant={toothQuadrant(n)}
                      smooth={archSmooth}
                      tooltip={tooltipDoDente(n)}
                      selected={selectedTooth === n}
                      onClick={() => setSelectedTooth(n)}
                    />
                  ))}
                </div>
                <div className="odontograma-arch-label">Arcada Inferior {arcada === 'adulta' ? '(Q3 31–38 | Q4 41–48)' : '(Q7 71–75 | Q8 81–85)'}</div>
                <div className="odontograma-arch lower">
                  {lower.map((n, i) => (
                    <Tooth
                      key={n}
                      number={n}
                      arch="lower"
                      index={i}
                      total={lower.length}
                      amp={archAmp}
                      infantil={arcada==='infantil'}
                      status={statusDoDente(n)}
                      typeColor={corTipoDoDente(n)}
                      quadrant={toothQuadrant(n)}
                      smooth={archSmooth}
                      tooltip={tooltipDoDente(n)}
                      selected={selectedTooth === n}
                      onClick={() => setSelectedTooth(n)}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          <p className="text-muted mt-2">FDI adulto (11–18, 21–28, 31–38, 41–48) e infantil (51–55, 61–65, 71–75, 81–85).</p>
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
                        <td>{t.data_tratamento ? new Date(t.data_tratamento).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>
                          <span className="type-swatch" style={{ backgroundColor: corPorCategoria[tipoCategoria(t.tipo_tratamento)] }} />
                          {t.tipo_tratamento ?? '-'}
                        </td>
                        <td>{formatCurrency(t.valor)}</td>
                        <td>
                          <span className={`badge ${t.concluido ? 'badge-status-concluido' : 'badge-status-andamento'}`}>
                            {t.concluido ? 'Concluído' : 'Em Andamento'}
                          </span>
                        </td>
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
                      <td>{t.data_tratamento ? new Date(t.data_tratamento).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{t.dente_numero ?? '-'}</td>
                      <td>
                        <span className="type-swatch" style={{ backgroundColor: corPorCategoria[tipoCategoria(t.tipo_tratamento)] }} />
                        {t.tipo_tratamento ?? '-'}
                      </td>
                      <td>{formatCurrency(t.valor)}</td>
                      <td>
                        <span className={`badge ${t.concluido ? 'badge-status-concluido' : 'badge-status-andamento'}`}>
                          {t.concluido ? 'Concluído' : 'Em Andamento'}
                        </span>
                      </td>
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

// Componente de dente estilizado com SVG
const Tooth: React.FC<{ number: number; selected?: boolean; onClick?: () => void; arch?: 'upper'|'lower'; index?: number; total?: number; amp?: number; infantil?: boolean; status?: 'none'|'andamento'|'concluido'; typeColor?: string; quadrant?: number; smooth?: number; tooltip?: string; }> = ({ number, selected, onClick, arch = 'upper', index = 0, total = 1, amp = 14, infantil = false, status = 'none', typeColor = '#e5e7eb', quadrant = 1, smooth = 1, tooltip }) => {
  const t = total > 1 ? (index / (total - 1)) : 0;
  const s = Math.pow(Math.sin(t * Math.PI), smooth);
  const archScale = arch === 'lower' ? 0.94 : 1.0; // arco inferior levemente mais suave
  const quadrantScale = quadrant === 2 || quadrant === 3 ? 0.96 : 1.0; // leve suavização nos quadrantes esquerdos
  const offset = s * amp * archScale * quadrantScale;
  const translateY = arch === 'upper' ? -offset : offset;

  const d = number % 10;
  const size = (() => {
    if (d === 1 || d === 2) return { w: 32, h: 36 }; // incisivos mais estreitos e coroa mais reta
    if (d === 3) return { w: 34, h: 38 }; // canino ligeiramente mais alto
    if (d === 4 || d === 5) return { w: 34, h: 36 }; // pré-molares
    if (d === 6 || d === 7) return { w: 36, h: 36 }; // molares mais largos
    return { w: 35, h: 34 }; // terceiros molares
  })();

  const stroke = selected ? '#0d6efd' : (infantil ? '#0dcaf0' : '#6c757d');
  const fillColor = status === 'none' ? '#ffffff' : (typeColor || '#cfe2ff');
  const fillOpacity = status === 'andamento' ? 0.6 : (status === 'concluido' ? 0.85 : 1);



  return (
    <button
      type="button"
      className={`tooth-btn ${selected ? 'tooth-selected' : ''}`}
      onClick={onClick}
      aria-label={`Dente ${number}`}
      title={tooltip}
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <svg className="tooth-svg" viewBox="0 0 64 64" width={size.w} height={size.h} aria-hidden="true">
        <path
          d="M32 6c-8 0-14 6-15 13-1 6 1 12 3 18 2 6 4 12 6 18 1 3 3 5 6 5s5-2 6-5c2-6 4-12 6-18 2-6 4-12 3-18C46 12 40 6 32 6z"
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth="2"
        />
        {(d === 1 || d === 2) && (
          <path d="M22 16c3-4 17-4 20 0" stroke={stroke} strokeWidth="1.5" fill="none" opacity="0.55" />
        )}
        {d === 3 && (
          <path d="M32 14c0 8 0 8 0 16" stroke={stroke} strokeWidth="1.2" fill="none" opacity="0.5" />
        )}
        {(d === 6 || d === 7 || d === 8) && (
          <>
            <path d="M18 24c8 6 20 6 28 0" stroke={stroke} strokeWidth="1.2" fill="none" opacity="0.5" />
            <path d="M18 28c8 6 20 6 28 0" stroke={stroke} strokeWidth="1.2" fill="none" opacity="0.35" />
          </>
        )}
      </svg>
      <span className="tooth-label">{number}</span>
    </button>
  );
};