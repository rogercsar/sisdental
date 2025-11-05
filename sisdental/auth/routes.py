from flask import render_template, request, redirect, flash, url_for, session
from . import auth_bp
from sisdental import get_supabase
from sisdental.forms import RegisterForm

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        email = form.username.data
        password = form.password.data
        try:
            sb = get_supabase()
            res = sb.auth.admin.create_user({
                'email': email,
                'password': password,
                'email_confirm': True
            })
            user = getattr(res, 'user', None)
            user_id = user.id if user else None

            if user_id:
                sb.table('profiles').upsert({
                    'id': user_id,
                    'role': 'staff',
                    'full_name': email
                }).execute()

            flash('Cadastro feito com sucesso! Faça login.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            flash(f"Erro durante o registro: {e}", "danger")

    return render_template('register.html', form=form)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['username']
        password = request.form['password']
        try:
            pub = get_supabase_public()
            sb = get_supabase()

            # Faz login via Supabase Auth (cliente público)
            auth_res = pub.auth.sign_in_with_password({
                'email': email,
                'password': password
            })
            user = getattr(auth_res, 'user', None)
            user_id = user.id if user else None

            # Busca perfil para role
            role = None; full_name = None
            prof_res = sb.table('profiles').select('id, role, full_name').eq('id', user_id).limit(1).execute()
            prof_rows = getattr(prof_res, 'data', None) or []
            if prof_rows:
                role = prof_rows[0].get('role'); full_name = prof_rows[0].get('full_name')

            session.permanent = True
            session['logado'] = True
            session['usuario'] = full_name or email
            session['usuario_id'] = user_id
            session['usuario_role'] = role
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('main.home')) # Redireciona para a home (que estará em outro blueprint)
        except Exception as e:
            flash('Usuário ou senha inválidos.', 'danger')
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('Sessão encerrada.', 'info')
    return redirect(url_for('auth.login'))
