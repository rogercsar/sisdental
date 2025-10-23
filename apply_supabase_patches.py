import io, os, sys
from datetime import date

path = os.path.join(os.getcwd(), 'app.py')
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()


def replace_block(s, start_marker, end_marker, new_code):
    start = s.find(start_marker)
    if start == -1:
        print(f"[WARN] Start marker not found: {start_marker}")
        return s, False
    end = s.find(end_marker, start)
    if end == -1:
        print(f"[WARN] End marker not found after start: {end_marker}")
        return s, False
    before = s[:start]
    after = s[end:]
    return before + new_code + after, True

# New code blocks
new_post = """@app.route('/api/odontograma/<int:paciente_id>/tratamentos', methods=['POST'])
def add_tratamento_paciente(paciente_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    sb = get_supabase()

    # Verifica paciente
    try:
        pres = sb.table('pacientes').select('id').eq('id', paciente_id).limit(1).execute()
        if not (getattr(pres, 'data', None) or []):
            return jsonify({"erro": "Paciente não encontrado"}), 404
    except Exception as e_check:
        print(f"Erro Supabase ao verificar paciente {paciente_id}: {e_check}")
        traceback.print_exc()
        return jsonify({"erro": "Erro ao verificar paciente"}), 500

    dados = request.json
    if not dados:
        return jsonify({"erro": "Requisição sem corpo JSON"}), 400

    dente_numero = dados.get('denteNumero')
    tipo_tratamento = dados.get('tipo')
    data_tratamento = dados.get('data')
    observacoes = dados.get('observacoes')
    proxima_sessao = dados.get('proximaSessao') or None
    valor_tratamento_str = dados.get('valor')
    concluido = bool(dados.get('concluido', False))

    required = ['denteNumero', 'tipo', 'data']
    missing = [f for f in required if not dados.get(f)]
    if missing:
        return jsonify({"erro": f"Campos obrigatórios: {', '.join(missing)}"}), 400

    valor_tratamento = None
    if valor_tratamento_str is not None and valor_tratamento_str != '':
        try:
            valor_tratamento = float(valor_tratamento_str)
            if valor_tratamento < 0:
                return jsonify({"erro": "Valor negativo"}), 400
        except (ValueError, TypeError):
            return jsonify({"erro": "Valor inválido"}), 400

    try:
        if data_tratamento:
            datetime.datetime.strptime(data_tratamento, '%Y-%m-%d')
        if proxima_sessao:
            datetime.datetime.strptime(proxima_sessao, '%Y-%m-%d')
    except ValueError:
        return jsonify({"erro": "Formato data inválido"}), 400

    try:
        insert_payload = {
            'paciente_id': paciente_id,
            'dente_numero': dente_numero,
            'tipo_tratamento': tipo_tratamento,
            'data_tratamento': data_tratamento,
            'observacoes': observacoes,
            'proxima_sessao': proxima_sessao,
            'valor': valor_tratamento,
            'concluido': concluido
        }
        res = sb.table('odontograma_tratamentos').insert(insert_payload).select('*').execute()
        rows = getattr(res, 'data', None) or []
        if not rows:
            return jsonify({"erro": "Falha ao salvar tratamento"}), 500
        novo_trat = rows[0]
        novo_trat_id = novo_trat.get('id')

        if valor_tratamento is not None and valor_tratamento > 0 and novo_trat_id:
            desc_fin = f"Trat.: {tipo_tratamento} (Dente {dente_numero})"
            fin_payload = {
                'paciente_id': paciente_id,
                'tratamento_id': novo_trat_id,
                'descricao': desc_fin,
                'valor': valor_tratamento,
                'status': 'pendente',
                'data_vencimento': data_tratamento,
                'data_pagamento': None
            }
            sb.table('financeiro').insert(fin_payload).execute()

        return jsonify(format_for_json(novo_trat)), 201
    except Exception as e:
        print(f"Erro Supabase ao salvar tratamento: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao salvar: {str(e)}"}), 500

"""

new_delete = """@app.route('/api/odontograma/tratamentos/<int:tratamento_id>', methods=['DELETE'])
def delete_tratamento(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        sel = sb.table('odontograma_tratamentos').select('id').eq('id', tratamento_id).limit(1).execute()
        if not (getattr(sel, 'data', None) or []):
            return jsonify({"erro": "Tratamento não encontrado"}), 404

        sb.table('financeiro').delete().eq('tratamento_id', tratamento_id).execute()
        sb.table('odontograma_tratamentos').delete().eq('id', tratamento_id).execute()
        return '', 204
    except Exception as e:
        print(f"Erro Supabase durante exclusão do tratamento {tratamento_id}: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao excluir: {str(e)}"}), 500

"""

new_put_status = """@app.route('/api/odontograma/tratamentos/<int:tratamento_id>/status', methods=['PUT'])
def update_tratamento_status(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    try:
        dados = request.json
        if dados is None or 'concluido' not in dados:
            return jsonify({"erro": "Status 'concluido' (booleano) é obrigatório no corpo da requisição."}), 400
        novo_status = bool(dados.get('concluido'))
        sb = get_supabase()
        sel = sb.table('odontograma_tratamentos').select('id').eq('id', tratamento_id).limit(1).execute()
        if not (getattr(sel, 'data', None) or []):
            return jsonify({"erro": "Tratamento não encontrado"}), 404
        sb.table('odontograma_tratamentos').update({'concluido': novo_status}).eq('id', tratamento_id).execute()
        return jsonify({"id": tratamento_id, "concluido": novo_status, "mensagem": "Status do tratamento atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar status do tratamento {tratamento_id}: {e}")
        traceback.print_exc()
        return jsonify({"erro": "Erro ao atualizar status do tratamento"}), 500

"""

new_det_paciente = """@app.route('/paciente/<int:paciente_id>')
def detalhes_paciente(paciente_id):
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

        hoje = date.today().isoformat()
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

new_ag_status = """@app.route('/agendamento/<int:id>/status', methods=['POST'])
def atualizar_status_agendamento(id):
    if not session.get('logado'):
        flash("Acesso não autorizado.", "danger")
        return redirect(url_for('login'))

    novo_status = request.form.get('novo_status')
    status_validos = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']

    if not novo_status or novo_status not in status_validos:
        flash("Status inválido fornecido.", "warning")
        return redirect(request.referrer or url_for('agendamentos'))

    sb = get_supabase()
    try:
        sel = sb.table('agendamentos').select('id').eq('id', id).limit(1).execute()
        if not (getattr(sel, 'data', None) or []):
            flash("Agendamento não encontrado.", "danger")
            return redirect(url_for('agendamentos'))

        sb.table('agendamentos').update({'status': novo_status}).eq('id', id).execute()
        flash(f"Status do agendamento atualizado para '{novo_status}'.", "success")
    except Exception as e:
        print(f"Erro ao atualizar status do agendamento {id}: {e}")
        traceback.print_exc()
        flash("Erro ao atualizar status do agendamento.", "danger")

    return redirect(request.referrer or url_for('agendamentos'))

"""

# Apply replacements
changed = 0
s, ok = replace_block(s,
    "@app.route('/api/odontograma/<int:paciente_id>/tratamentos', methods=['POST'])",
    "@app.route('/api/odontograma/tratamentos/<int:tratamento_id>', methods=['DELETE'])",
    new_post)
changed += int(ok)

s, ok = replace_block(s,
    "@app.route('/api/odontograma/tratamentos/<int:tratamento_id>', methods=['DELETE'])",
    "@app.route('/api/odontograma/tratamentos/<int:tratamento_id>/status', methods=['PUT'])",
    new_delete)
changed += int(ok)

s, ok = replace_block(s,
    "@app.route('/api/odontograma/tratamentos/<int:tratamento_id>/status', methods=['PUT'])",
    "@app.route('/editar_agendamento/<int:id>', methods=['GET', 'POST'])",
    new_put_status)
changed += int(ok)

s, ok = replace_block(s,
    "@app.route('/paciente/<int:paciente_id>')",
    "@app.route('/editar_agendamento/<int:id>', methods=['GET', 'POST'])",
    new_det_paciente)
changed += int(ok)

s, ok = replace_block(s,
    "@app.route('/agendamento/<int:id>/status', methods=['POST'])",
    "@app.route('/portal/login', methods=['GET', 'POST'])",
    new_ag_status)
changed += int(ok)

if changed == 0:
    print("[ERROR] No blocks replaced. Aborting without write.")
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(s)
print(f"[OK] Replaced {changed} blocks in app.py")
