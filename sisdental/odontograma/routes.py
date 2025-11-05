from flask import render_template, redirect, url_for, session, flash
from . import odontograma_bp
from sisdental import get_supabase
from datetime import date
import traceback

@odontograma_bp.route('/<int:paciente_id>')
def odontograma_paciente(paciente_id):
    if not session.get('logado'):
        return redirect(url_for('auth.login'))
    try:
        sb = get_supabase()
        res = sb.table('pacientes').select('id, nome').eq('id', paciente_id).limit(1).execute()
        rows = getattr(res, 'data', None) or []
        if not rows:
            flash('Paciente não encontrado.', 'danger')
            return redirect(url_for('pacientes.listar_pacientes'))

        nome_paciente = rows[0].get('nome') or 'Paciente'

        tres = sb.table('odontograma_tratamentos').select('*').eq('paciente_id', paciente_id).order('data_criacao', ascending=True).execute()
        tratamentos = getattr(tres, 'data', None) or []

        fres = sb.table('financeiro').select('*').eq('paciente_id', paciente_id).order('data_vencimento', desc=True).limit(5).execute()
        financeiros = getattr(fres, 'data', None) or []

        today_str = date.today().isoformat()
        ares = sb.table('agendamentos').select('*').eq('paciente_id', paciente_id).gte('data', today_str).order('data', ascending=True).order('hora', ascending=True).limit(5).execute()
        agendamentos = getattr(ares, 'data', None) or []

        return render_template('odontograma.html', paciente_id=paciente_id, nome_paciente=nome_paciente,
                               tratamentos_iniciais=tratamentos, financeiro_recentes=financeiros,
                               agendamentos_proximos=agendamentos)
    except Exception as e:
        traceback.print_exc()
        flash('Erro ao carregar odontograma.', 'danger')
        return redirect(url_for('pacientes.listar_pacientes'))
