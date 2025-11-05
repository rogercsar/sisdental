from flask import render_template, redirect, url_for, session
from . import financeiro_bp

# A rota principal /financeiro agora apenas renderiza o template.
# A lógica de carregamento e manipulação de dados será feita via API.
@financeiro_bp.route('/')
def financas():
    if not session.get('logado'):
        return redirect(url_for('auth.login'))
    return render_template('financeiro.html')
