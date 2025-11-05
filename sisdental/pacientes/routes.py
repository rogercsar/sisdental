from flask import render_template, request, redirect, flash, url_for, session
from . import pacientes_bp
from sisdental import get_supabase
from sisdental.forms import PacienteForm
import datetime

@pacientes_bp.route('/cadastrar', methods=['GET', 'POST'])
def cadastrar_paciente():
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    form = PacienteForm()
    if form.validate_on_submit():
        sb = get_supabase()
        try:
            payload = {
                'nome': form.nome.data,
                'cpf': form.cpf.data or None,
                'telefone': form.telefone.data or None,
                'email': form.email.data or None,
                'data_nascimento': form.data_nascimento.data
            }
            sb.table('pacientes').insert(payload).execute()
            flash('Paciente cadastrado com sucesso!', 'success')
            return redirect(url_for('pacientes.listar_pacientes'))
        except Exception as e:
            flash(f'Erro ao cadastrar paciente: {str(e)}', 'danger')

    return render_template('cadastrar_paciente.html', form=form)

@pacientes_bp.route('/')
def listar_pacientes():
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    busca = request.args.get('busca', '')
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = 10
    offset = (pagina - 1) * por_pagina

    try:
        sb = get_supabase()
        q = sb.table('pacientes').select('*').order('nome', ascending=True)
        if busca:
            q = q.ilike('nome', f'%{busca}%')
        q = q.range(offset, offset + por_pagina - 1)
        res = q.execute()
        rows = getattr(res, 'data', None) or []

        pacientes_data = []
        for r in rows:
            dn = r.get('data_nascimento')
            dn_obj = None
            if isinstance(dn, str) and dn:
                try:
                    dn_obj = datetime.datetime.strptime(dn, '%Y-%m-%d').date()
                except ValueError:
                    pass
            pacientes_data.append((r.get('id'), r.get('nome'), r.get('cpf'), r.get('telefone'), r.get('email'), dn_obj))

        return render_template('pacientes.html', pacientes=pacientes_data, busca=busca, pagina=pagina)
    except Exception as e:
        flash(f"Erro ao buscar pacientes: {e}", "danger")
        return render_template('pacientes.html', pacientes=[], busca=busca, pagina=pagina)

@pacientes_bp.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar_paciente(id):
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    sb = get_supabase()
    res = sb.table('pacientes').select('*').eq('id', id).limit(1).execute()
    paciente = (getattr(res, 'data', None) or [None])[0]

    if not paciente:
        flash('Paciente não encontrado.', 'danger')
        return redirect(url_for('pacientes.listar_pacientes'))

    form = PacienteForm(data=paciente)

    if form.validate_on_submit():
        try:
            payload = {
                'nome': form.nome.data,
                'cpf': form.cpf.data,
                'telefone': form.telefone.data,
                'email': form.email.data,
                'data_nascimento': form.data_nascimento.data
            }
            sb.table('pacientes').update(payload).eq('id', id).execute()
            flash('Paciente atualizado com sucesso!', 'success')
            return redirect(url_for('pacientes.listar_pacientes'))
        except Exception as e:
            flash(f"Erro ao editar paciente: {e}", "danger")

    return render_template('editar_paciente.html', form=form, paciente_id=id)

@pacientes_bp.route('/excluir/<int:id>')
def excluir_paciente(id):
    if not session.get('logado'):
        return redirect(url_for('auth.login'))
    try:
        sb = get_supabase()
        sb.table('pacientes').delete().eq('id', id).execute()
        flash('Paciente excluído com sucesso!', 'success')
    except Exception as e:
        flash(f'Erro ao excluir paciente: {str(e)}', 'danger')
    return redirect(url_for('pacientes.listar_pacientes'))
