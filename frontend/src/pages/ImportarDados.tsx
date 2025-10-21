import { useMemo, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type TipoImport = 'pacientes' | 'agendamentos' | 'financeiro';

interface RowAny { [k: string]: any }

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');

export default function ImportarDados() {
  const sb = useMemo(() => getSupabase(), []);
  const [tipo, setTipo] = useState<TipoImport>('pacientes');
  const [rows, setRows] = useState<RowAny[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [mapping, setMapping] = useState<Record<string, string>>({});

  const parseFile = async (file: File) => {
    setParsing(true); setErr(null); setMsg(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'csv') {
        await new Promise<void>((resolve, reject) => {
          Papa.parse<RowAny>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res: Papa.ParseResult<RowAny>) => {
              setRows(res.data as RowAny[]);
              setHeaders(res.meta.fields || []);
              resolve();
            },
            error: (err: Error) => reject(err)
          });
        });
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<RowAny>(ws, { defval: '' });
        const h = Object.keys(data[0] || {});
        setRows(data); setHeaders(h);
      }
      guessMapping();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setParsing(false);
    }
  };

  const guessMapping = () => {
    const hMap = new Map(headers.map(h => [normalize(h), h] as [string, string]));
    const pick = (keys: string[]) => keys.find(k => hMap.has(k));
    const m: Record<string, string> = {};
    if (tipo === 'pacientes') {
      m['nome'] = hMap.get(pick(['nome','name']) || '') || '';
      m['cpf'] = hMap.get(pick(['cpf']) || '') || '';
      m['telefone'] = hMap.get(pick(['telefone','phone']) || '') || '';
      m['email'] = hMap.get(pick(['email']) || '') || '';
      m['data_nascimento'] = hMap.get(pick(['data_nascimento','nascimento','data_de_nascimento','birthdate']) || '') || '';
    } else if (tipo === 'agendamentos') {
      m['paciente_id'] = hMap.get(pick(['paciente_id','id_paciente']) || '') || '';
      m['cpf'] = hMap.get(pick(['cpf']) || '') || '';
      m['servico'] = hMap.get(pick(['servico','serviço']) || '') || '';
      m['data'] = hMap.get(pick(['data','data_consulta']) || '') || '';
      m['hora'] = hMap.get(pick(['hora','horario']) || '') || '';
      m['status'] = hMap.get(pick(['status']) || '') || '';
      m['observacoes'] = hMap.get(pick(['observacoes','observações','obs']) || '') || '';
    } else {
      m['paciente_id'] = hMap.get(pick(['paciente_id','id_paciente']) || '') || '';
      m['cpf'] = hMap.get(pick(['cpf']) || '') || '';
      m['descricao'] = hMap.get(pick(['descricao','descrição']) || '') || '';
      m['valor'] = hMap.get(pick(['valor','valor_r$','preco','preço']) || '') || '';
      m['status'] = hMap.get(pick(['status']) || '') || '';
      m['data_vencimento'] = hMap.get(pick(['data_vencimento','vencimento']) || '') || '';
      m['data_pagamento'] = hMap.get(pick(['data_pagamento','pagamento']) || '') || '';
    }
    setMapping(m);
  };

  const getVal = (r: RowAny, col: string) => (col ? r[col] : undefined);
  const parseDate = (v: any): string | null => {
    if (!v) return null;
    const s = String(v).trim();
    const m = s.match(/(\d{4})[-\/.](\d{2})[-\/.](\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const m2 = s.match(/(\d{2})[-\/.](\d{2})[-\/.](\d{4})/);
    if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
    return null;
  };

  const resolvePacienteIdsByCpf = async (cpfs: string[]) => {
    const unique = Array.from(new Set(cpfs.filter(Boolean)));
    if (unique.length === 0) return new Map<string, number>();
    const { data, error } = await sb!.from('pacientes').select('id, cpf').in('cpf', unique);
    if (error) throw error;
    const map = new Map<string, number>();
    (data ?? []).forEach((p: any) => map.set(p.cpf, p.id));
    return map;
  };

  const importar = async () => {
    if (!sb) { setErr('Supabase não configurado'); return; }
    setErr(null); setMsg(null);
    try {
      if (tipo === 'pacientes') {
        const payload = rows.map((r) => ({
          nome: String(getVal(r, mapping['nome']) || '').trim(),
          cpf: String(getVal(r, mapping['cpf']) || '').trim() || null,
          telefone: String(getVal(r, mapping['telefone']) || '').trim() || null,
          email: String(getVal(r, mapping['email']) || '').trim() || null,
          data_nascimento: parseDate(getVal(r, mapping['data_nascimento']))
        })).filter(x => x.nome);
        const { error } = await sb.from('pacientes').upsert(payload, { onConflict: 'cpf' });
        if (error) throw error;
        setMsg(`Importação de pacientes concluída: ${payload.length} registros.`);
      } else if (tipo === 'agendamentos') {
        const usarCpf = !mapping['paciente_id'] && !!mapping['cpf'];
        let cpfToId = new Map<string, number>();
        if (usarCpf) {
          cpfToId = await resolvePacienteIdsByCpf(rows.map(r => String(getVal(r, mapping['cpf']) || '').trim()));
        }
        const payload = rows.map((r) => {
          const paciente_id = mapping['paciente_id'] ? Number(getVal(r, mapping['paciente_id'])) : (usarCpf ? cpfToId.get(String(getVal(r, mapping['cpf']) || '').trim()) : undefined);
          return {
            paciente_id,
            servico: String(getVal(r, mapping['servico']) || '').trim(),
            data: parseDate(getVal(r, mapping['data'])),
            hora: String(getVal(r, mapping['hora']) || '').trim() || null,
            status: String(getVal(r, mapping['status']) || '').trim() || null,
            observacoes: String(getVal(r, mapping['observacoes']) || '').trim() || null,
          };
        }).filter(x => x.paciente_id && x.servico && x.data);
        if (usarCpf && payload.some(x => !x.paciente_id)) throw new Error('Alguns CPFs não foram encontrados. Importe/atualize pacientes primeiro.');
        const { error } = await sb.from('agendamentos').insert(payload);
        if (error) throw error;
        setMsg(`Importação de agendamentos concluída: ${payload.length} registros.`);
      } else {
        const usarCpf = !mapping['paciente_id'] && !!mapping['cpf'];
        let cpfToId = new Map<string, number>();
        if (usarCpf) {
          cpfToId = await resolvePacienteIdsByCpf(rows.map(r => String(getVal(r, mapping['cpf']) || '').trim()));
        }
        const payload = rows.map((r) => {
          const paciente_id = mapping['paciente_id'] ? Number(getVal(r, mapping['paciente_id'])) : (usarCpf ? cpfToId.get(String(getVal(r, mapping['cpf']) || '').trim()) : undefined);
          return {
            paciente_id,
            descricao: String(getVal(r, mapping['descricao']) || '').trim(),
            valor: getVal(r, mapping['valor']) ? Number(String(getVal(r, mapping['valor'])).replace(/[^0-9.,-]/g,'').replace('.', '').replace(',', '.')) : null,
            status: String(getVal(r, mapping['status']) || '').trim() || null,
            data_vencimento: parseDate(getVal(r, mapping['data_vencimento'])),
            data_pagamento: parseDate(getVal(r, mapping['data_pagamento'])),
          };
        }).filter(x => x.paciente_id && x.descricao && (x.valor !== null));
        if (usarCpf && payload.some(x => !x.paciente_id)) throw new Error('Alguns CPFs não foram encontrados. Importe/atualize pacientes primeiro.');
        const { error } = await sb.from('financeiro').insert(payload);
        if (error) throw error;
        setMsg(`Importação do financeiro concluída: ${payload.length} registros.`);
      }
    } catch (e: any) {
      setErr(e.message ?? String(e));
    }
  };

  const previewHeaders = headers.slice(0, 6);
  const previewRows = rows.slice(0, 5);

  const fieldsRequired: Record<TipoImport, string[]> = {
    pacientes: ['nome'],
    agendamentos: ['servico','data','hora'],
    financeiro: ['descricao','valor']
  };

  const fieldsOptional: Record<TipoImport, string[]> = {
    pacientes: ['cpf','telefone','email','data_nascimento'],
    agendamentos: ['paciente_id','cpf','status','observacoes'],
    financeiro: ['paciente_id','cpf','status','data_vencimento','data_pagamento']
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Importar Dados</h2>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoImport); setMapping({}); }}>
                <option value="pacientes">Pacientes</option>
                <option value="agendamentos">Agendamentos</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Arquivo (.csv, .xls, .xlsx)</label>
              <input className="form-control" type="file" accept=".csv, .xls, .xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100" disabled={parsing || rows.length === 0} onClick={importar}>
                {parsing ? 'Processando...' : 'Importar'}
              </button>
            </div>
          </div>

          {err && <div className="alert alert-danger mt-3">{err}</div>}
          {msg && <div className="alert alert-success mt-3">{msg}</div>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Mapeamento de Colunas</h5>
            <p className="text-muted">Selecione as colunas do arquivo para cada campo abaixo. Para Agendamentos/Financeiro, informe <strong>paciente_id</strong> ou <strong>cpf</strong>.</p>
            <div className="row g-3">
              {[...fieldsRequired[tipo], ...fieldsOptional[tipo]].map((f) => (
                <div className="col-md-4" key={f}>
                  <label className="form-label">{f}</label>
                  <select className="form-select" value={mapping[f] || ''} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value })}>
                    <option value="">(não mapear)</option>
                    {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Preview (primeiras linhas)</h5>
            <div className="table-responsive">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    {previewHeaders.map((h) => (<th key={h}>{h}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, idx) => (
                    <tr key={idx}>
                      {previewHeaders.map((h) => (<td key={h}>{String(r[h] ?? '')}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}