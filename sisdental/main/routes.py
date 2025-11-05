from flask import render_template, redirect, url_for, session, flash
from . import main_bp
from sisdental import get_supabase
from datetime import date
import traceback

@main_bp.route('/')
def home():
    if not session.get('logado'):
        return redirect(url_for('auth.login'))

    nome_usuario = session.get('usuario', 'Visitante')
    sb = get_supabase()
    today = date.today().isoformat()

    dashboard_data = {
        'total_pacientes': 0,
        'consultas_hoje': 0,
        'total_agendamentos': 0,
        'agendamentos_hoje_lista': []
    }

    try:
        # 1. Total de Pacientes
        tp_res = sb.table('pacientes').select('id', count='exact').execute()
        dashboard_data['total_pacientes'] = getattr(tp_res, 'count', 0) or 0

        # 2. Consultas de hoje
        ch_res = sb.table('agendamentos').select('id', count='exact').eq('data', today).execute()
        dashboard_data['consultas_hoje'] = getattr(ch_res, 'count', 0) or 0

        # 3. Total de agendamentos
        ta_res = sb.table('agendamentos').select('id', count='exact').execute()
        dashboard_data['total_agendamentos'] = getattr(ta_res, 'count', 0) or 0

        # 4. Lista de agendamentos de hoje com nome do paciente
        hoje_res = sb.table('agendamentos')\
            .select("hora, servico, pacientes:paciente_id(id, nome)")\
            .eq('data', today)\
            .order('hora', ascending=True)\
            .limit(5)\
            .execute()
        rows = getattr(hoje_res, 'data', None) or []
        ag_list = []
        for a in rows:
            pac = (a.get('pacientes') or {})
            hora_raw = a.get('hora')
            hora_fmt = (hora_raw or '')[:5]
            ag_list.append({
                'paciente_id': pac.get('id'),
                'nome': pac.get('nome'),
                'servico': a.get('servico'),
                'hora_formatada': hora_fmt
            })
        dashboard_data['agendamentos_hoje_lista'] = ag_list

    except Exception as e:
        print(f"Erro ao buscar dados do dashboard via Supabase: {e}")
        traceback.print_exc()
        flash("Não foi possível carregar os dados do dashboard.", "warning")

    return render_template('index.html', nome=nome_usuario, dashboard=dashboard_data)
