import os, sys
path = os.path.join(os.getcwd(), 'app.py')
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()

start_marker = "def detalhes_paciente(paciente_id):"
end_marker = "@app.route('/editar_agendamento/<int:id>', methods=['GET', 'POST'])"
start = s.find(start_marker)
if start == -1:
    print('[ERROR] detalhes_paciente function start not found')
    sys.exit(1)
end = s.find(end_marker, start)
if end == -1:
    print('[ERROR] end marker for detalhes_paciente not found')
    sys.exit(1)

new_body = """def detalhes_paciente(paciente_id):
    if not session.get('logado'):
        return redirect(url_for('login'))

    sb = get_supabase()
    try:
        pres = sb.table('pacientes').select('*').eq('id', paciente_id).limit(1).execute()
        prows = getattr(pres, 'data', None) or []
        if not prows:
            flash('Paciente não encontrado.', 'danger')
            return redirect(url_for('pacientes'))
        paciente_fmt = format_for_json(prows[0])

        tres = sb.table('odontograma_tratamentos').select('id, dente_numero, tipo_tratamento, data_tratamento, observacoes, valor, concluido').eq('paciente_id', paciente_id).order('data_tratamento', ascending=False).execute()
        tratamentos_raw = getattr(tres, 'data', None) or []
        tratamentos = format_for_json(tratamentos_raw)

        fres = sb.table('financeiro').select('id, descricao, valor, status, data_vencimento, data_pagamento, tratamento_id').eq('paciente_id', paciente_id).order('data_vencimento', ascending=False).execute()
        financeiro_raw = getattr(fres, 'data', None) or []
        financeiro_lista = format_for_json(financeiro_raw)

        hoje = __import__('datetime').date.today().isoformat()
        ares = sb.table('agendamentos').select('id, servico, data, hora, status').eq('paciente_id', paciente_id).gte('data', hoje).order('data', ascending=True).order('hora', ascending=True).execute()
        ag_raw = getattr(ares, 'data', None) or []
        agendamentos_futuros = format_for_json(ag_raw)

        return render_template('detalhes_paciente.html', paciente=paciente_fmt, tratamentos=tratamentos, financeiro_lista=financeiro_lista, agendamentos_futuros=agendamentos_futuros)
    except Exception as e:
        print(f"Erro ao carregar detalhes do paciente {paciente_id}: {e}")
        traceback.print_exc()
        flash('Erro ao carregar detalhes do paciente.', 'danger')
        return redirect(url_for('pacientes'))
"""

before = s[:start]
after = s[end:]
new_s = before + new_body + after
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_s)
print('[OK] detalhes_paciente migrated to Supabase')
