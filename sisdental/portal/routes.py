from flask import render_template, request, redirect, flash, url_for, session, send_file
from . import portal_bp
from sisdental import get_supabase, get_supabase_public
from datetime import date
import traceback
import io

from werkzeug.security import generate_password_hash, check_password_hash

@portal_bp.route('/primeiro-acesso', methods=['GET', 'POST'])
def primeiro_acesso():
    if request.method == 'POST':
        cpf = ''.join(filter(str.isdigit, request.form.get('cpf', '')))
        data_nascimento = request.form.get('data_nascimento')
        senha = request.form.get('senha')
        confirmar_senha = request.form.get('confirmar_senha')

        if not all([cpf, data_nascimento, senha, confirmar_senha]):
            flash('Todos os campos são obrigatórios.', 'warning')
            return redirect(url_for('portal.primeiro_acesso'))

        if senha != confirmar_senha:
            flash('As senhas não coincidem.', 'danger')
            return redirect(url_for('portal.primeiro_acesso'))

        try:
            sb = get_supabase()
            res = sb.table('pacientes').select('id, senha_hash').eq('cpf', cpf).eq('data_nascimento', data_nascimento).limit(1).execute()
            paciente = (getattr(res, 'data', None) or [None])[0]

            if not paciente:
                flash('CPF ou Data de Nascimento inválidos.', 'danger')
                return redirect(url_for('portal.primeiro_acesso'))

            if paciente.get('senha_hash'):
                flash('Sua conta já foi configurada. Use a página de login.', 'info')
                return redirect(url_for('portal.portal_login'))

            senha_hash = generate_password_hash(senha)
            sb.table('pacientes').update({'senha_hash': senha_hash}).eq('id', paciente['id']).execute()

            flash('Senha configurada com sucesso! Agora você pode fazer o login.', 'success')
            return redirect(url_for('portal.portal_login'))

        except Exception as e:
            flash('Ocorreu um erro ao configurar sua senha.', 'danger')
            traceback.print_exc()

    return render_template('portal_primeiro_acesso.html')

@portal_bp.route('/login', methods=['GET', 'POST'])
def portal_login():
    if request.method == 'POST':
        cpf = ''.join(filter(str.isdigit, request.form.get('cpf', '')))
        senha = request.form.get('password')

        if not cpf or not senha:
            flash('CPF e Senha são obrigatórios.', 'warning')
            return redirect(url_for('portal.portal_login'))

        try:
            sb = get_supabase()
            res = sb.table('pacientes').select('id, nome, senha_hash').eq('cpf', cpf).limit(1).execute()
            paciente = (getattr(res, 'data', None) or [None])[0]

            if not paciente or not paciente.get('senha_hash'):
                flash('CPF ou Senha inválidos. Se este é seu primeiro acesso, configure sua senha.', 'danger')
                return redirect(url_for('portal.portal_login'))

            if not check_password_hash(paciente['senha_hash'], senha):
                flash('CPF ou Senha inválidos.', 'danger')
                return redirect(url_for('portal.portal_login'))

            session.permanent = True
            session['paciente_logado'] = True
            session['paciente_id'] = paciente['id']
            session['paciente_nome'] = paciente['nome']
            flash(f"Bem-vindo(a), {paciente['nome']}!", 'success')
            return redirect(url_for('portal.portal_home'))

        except Exception as e:
            flash("Ocorreu um erro durante o login.", "danger")
            traceback.print_exc()
            return redirect(url_for('portal.portal_login'))

    return render_template('portal_login.html')

@portal_bp.route('/home')
def portal_home():
    if not session.get('paciente_logado'):
        flash("Faça login para acessar o portal.", "warning")
        return redirect(url_for('portal.portal_login'))

    paciente_id = session.get('paciente_id')
    if not paciente_id:
        session.clear()
        flash("Sessão inválida. Faça login novamente.", "warning")
        return redirect(url_for('portal.portal_login'))

    paciente_nome = session.get('paciente_nome', 'Paciente')

    tratamentos = []
    financeiro_lista = []
    agendamentos_futuros = []
    documentos_lista = []

    try:
        sb = get_supabase()

        # Buscar tratamentos
        t_res = sb.table('odontograma_tratamentos').select('*').eq('paciente_id', paciente_id).order('data_tratamento', desc=True).execute()
        tratamentos = getattr(t_res, 'data', None) or []

        # Buscar financeiro
        f_res = sb.table('financeiro').select('*').eq('paciente_id', paciente_id).order('data_vencimento', desc=True).execute()
        financeiro_lista = getattr(f_res, 'data', None) or []

        # Buscar agendamentos futuros
        today_iso = date.today().isoformat()
        a_res = sb.table('agendamentos').select('*').eq('paciente_id', paciente_id).gte('data', today_iso).order('data', ascending=True).execute()
        agendamentos_futuros = getattr(a_res, 'data', None) or []

        # Buscar Documentos
        d_res = sb.table('documentos_paciente').select('*').eq('paciente_id', paciente_id).order('data_geracao', desc=True).execute()
        documentos_lista = getattr(d_res, 'data', None) or []

    except Exception as e:
        traceback.print_exc()
        flash("Erro ao carregar suas informações.", "danger")

    return render_template('portal_home.html',
                           nome_paciente=paciente_nome,
                           tratamentos=tratamentos,
                           financeiro_lista=financeiro_lista,
                           agendamentos_futuros=agendamentos_futuros,
                           documentos_lista=documentos_lista)

@portal_bp.route('/logout')
def portal_logout():
    session.pop('paciente_logado', None)
    session.pop('paciente_id', None)
    session.pop('paciente_nome', None)
    flash('Você saiu do portal.', 'info')
    return redirect(url_for('portal.portal_login'))
