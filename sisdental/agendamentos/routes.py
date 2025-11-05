from flask import render_template, request, redirect, flash, url_for, session
from . import agendamentos_bp
from sisdental import get_supabase
import datetime
import traceback

@agendamentos_bp.route('/cadastrar', methods=['GET', 'POST'])
def cadastrar_agendamento():
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    sb = get_supabase()
    try:
        if request.method == 'POST':
            paciente_id = request.form.get('paciente_id')
            servico = request.form.get('servico')
            data = request.form.get('data')
            hora = request.form.get('hora')
            observacoes = request.form.get('observacoes', '')

            if not all([paciente_id, servico, data, hora]):
                flash('Preencha todos os campos obrigatórios (Paciente, Serviço, Data, Hora).', 'warning')
            else:
                hora_val = hora if len(hora) == 8 else (hora + ':00' if len(hora) == 5 else hora)
                sb.table('agendamentos').insert({
                    'paciente_id': int(paciente_id),
                    'servico': servico,
                    'data': data,
                    'hora': hora_val,
                    'observacoes': observacoes,
                    'status': 'Agendado'
                }).execute()
                flash('Agendamento cadastrado com sucesso!', 'success')
                return redirect(url_for('agendamentos.cadastrar_agendamento'))

        res_p = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
        rows_p = getattr(res_p, 'data', None) or []
        pacientes_lista = [(r.get('id'), r.get('nome')) for r in rows_p]
        return render_template('cadastrar_agendamento.html', pacientes=pacientes_lista)

    except Exception as e:
        flash(f'Erro ao processar agendamento: {str(e)}', 'danger')
        pacientes_lista = []
        try:
            res_p = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
            rows_p = getattr(res_p, 'data', None) or []
            pacientes_lista = [(r.get('id'), r.get('nome')) for r in rows_p]
        except Exception as fetch_err:
            print(f"Erro ao buscar pacientes após erro inicial: {fetch_err}")
        form_data = request.form if request.method == 'POST' else {}
        return render_template('cadastrar_agendamento.html', pacientes=pacientes_lista, form_data=form_data)


@agendamentos_bp.route('/')
def listar_agendamentos():
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    filtros = {
        'paciente': request.args.get('paciente', ''),
        'data': request.args.get('data', ''),
        'status': request.args.get('status', '')
    }

    sb = get_supabase()
    try:
        allowed_ids = None
        if filtros.get('paciente'):
            pres = sb.table('pacientes').select('id, nome').ilike('nome', f"%{filtros['paciente']}%").execute()
            prows = getattr(pres, 'data', None) or []
            allowed_ids = [p.get('id') for p in prows]
            if not allowed_ids:
                return render_template('agendamentos.html', filtros=filtros, agendamentos_lista=[])

        q = sb.table('agendamentos').select('id, paciente_id, servico, data, hora, status, observacoes')
        if allowed_ids is not None:
            q = q.in_('paciente_id', allowed_ids)
        if filtros.get('data'):
            q = q.eq('data', filtros['data'])
        if filtros.get('status'):
            q = q.eq('status', filtros['status'])
        q = q.order('data', ascending=True).order('hora', ascending=True)
        res = q.execute()
        rows = getattr(res, 'data', None) or []

        ids_set = {r.get('paciente_id') for r in rows if r.get('paciente_id') is not None}
        nomes_por_id = {}
        if ids_set:
            p2 = sb.table('pacientes').select('id, nome').in_('id', list(ids_set)).execute()
            p2rows = getattr(p2, 'data', None) or []
            nomes_por_id = {p.get('id'): p.get('nome') for p in p2rows}

        hoje = datetime.date.today()
        amanha = hoje + datetime.timedelta(days=1)

        ag_list = []
        for a in rows:
            dstr = a.get('data')
            data_fmt = dstr or '-'
            e_hoje, e_amanha = False, False
            if isinstance(dstr, str) and dstr:
                try:
                    dobj = datetime.datetime.strptime(dstr, '%Y-%m-%d').date()
                    data_fmt = dobj.strftime('%d/%m/%Y')
                    e_hoje = (dobj == hoje)
                    e_amanha = (dobj == amanha)
                except Exception: pass

            hora_raw = a.get('hora') or ''
            hora_fmt = (hora_raw or '')[:5]
            ag_list.append({
                'id': a.get('id'), 'paciente_id': a.get('paciente_id'),
                'nome': nomes_por_id.get(a.get('paciente_id')) or 'Paciente',
                'servico': a.get('servico'), 'data_formatada': data_fmt,
                'hora_formatada': hora_fmt, 'status': a.get('status') or 'Agendado',
                'observacoes': a.get('observacoes') or '', 'e_hoje': e_hoje, 'e_amanha': e_amanha,
            })
        return render_template('agendamentos.html', filtros=filtros, agendamentos_lista=ag_list)
    except Exception as e:
        traceback.print_exc()
        flash('Erro ao carregar agendamentos.', 'danger')
        return render_template('agendamentos.html', filtros=filtros, agendamentos_lista=[])

@agendamentos_bp.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar_agendamento(id):
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    sb = get_supabase()
    try:
        if request.method == 'POST':
            paciente_id = request.form.get('paciente_id')
            servico = request.form.get('servico')
            data = request.form.get('data')
            hora = request.form.get('hora')
            status = request.form.get('status')
            observacoes = request.form.get('observacoes', '')

            if not all([paciente_id, servico, data, hora, status]):
                flash('Preencha todos os campos obrigatórios.', 'warning')
                return redirect(url_for('agendamentos.editar_agendamento', id=id))

            hora_db = (hora or '').strip()
            if hora_db and len(hora_db) == 5:
                hora_db = f"{hora_db}:00"

            update_payload = {
                'paciente_id': int(paciente_id), 'servico': servico, 'data': data,
                'hora': hora_db, 'status': status, 'observacoes': observacoes
            }
            sb.table('agendamentos').update(update_payload).eq('id', id).execute()
            flash('Agendamento atualizado com sucesso!', 'success')
            return redirect(url_for('agendamentos.listar_agendamentos'))

        res = sb.table('agendamentos').select('*').eq('id', id).limit(1).execute()
        rows = getattr(res, 'data', None) or []
        if not rows:
            flash('Agendamento não encontrado.', 'danger')
            return redirect(url_for('agendamentos.listar_agendamentos'))
        agendamento = rows[0]

        plist_res = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
        prows = getattr(plist_res, 'data', None) or []
        pacientes_lista = [(p.get('id'), p.get('nome')) for p in prows]

        status_possiveis = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']

        return render_template('editar_agendamento.html', agendamento=agendamento,
                               pacientes=pacientes_lista, status_lista=status_possiveis)
    except Exception as e:
        traceback.print_exc()
        flash(f'Erro ao processar edição do agendamento: {str(e)}', 'danger')
        return redirect(url_for('agendamentos.listar_agendamentos'))


@agendamentos_bp.route('/<int:id>/status', methods=['POST'])
def atualizar_status_agendamento(id):
    if not session.get('logado'):
        flash("Acesso não autorizado.", "danger")
        return redirect(url_for('auth.login'))

    novo_status = request.form.get('novo_status')
    status_validos = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']

    if not novo_status or novo_status not in status_validos:
        flash("Status inválido fornecido.", "warning")
        return redirect(request.referrer or url_for('agendamentos.listar_agendamentos'))

    sb = get_supabase()
    try:
        sb.table('agendamentos').update({'status': novo_status}).eq('id', id).execute()
        flash(f"Status do agendamento atualizado para '{novo_status}'.", "success")
    except Exception as e:
        traceback.print_exc()
        flash("Erro ao atualizar status do agendamento.", "danger")

    return redirect(request.referrer or url_for('agendamentos.listar_agendamentos'))
