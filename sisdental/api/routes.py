from flask import jsonify, request, session
from . import api_bp
from sisdental import get_supabase
from sisdental.utils import format_for_json
import traceback
import os
import requests

# --- API Pacientes ---
@api_bp.route('/pacientes/listar', methods=['GET'])
def api_get_pacientes():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        res = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
        pacientes_lista = getattr(res, 'data', None) or []
        return jsonify(format_for_json(pacientes_lista))
    except Exception as e:
        return jsonify({"erro": f"Erro ao buscar pacientes: {str(e)}"}), 500

# --- API Financeiro ---
@api_bp.route('/financeiro/lancamentos', methods=['GET'])
def api_get_lancamentos():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    sb = get_supabase()
    try:
        # A query original era mais complexa, vamos simplificar para o join do supabase
        q = sb.table('financeiro').select('*, pacientes:paciente_id(id, nome)').order('data_vencimento', desc=True)
        res = q.execute()
        lancamentos = getattr(res, 'data', None) or []
        return jsonify(format_for_json(lancamentos))
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": "Erro interno ao buscar lançamentos."}), 500

@api_bp.route('/financeiro/lancamentos', methods=['POST'])
def api_create_lancamento():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    data = request.get_json()
    if not data:
        return jsonify({"erro": "Requisição sem dados JSON"}), 400

    required_fields = ['paciente_id', 'descricao', 'valor', 'status', 'data_vencimento']
    if not all(field in data for field in required_fields):
         return jsonify({"erro": "Campos obrigatórios faltando"}), 400

    sb = get_supabase()
    try:
        payload = {
            'paciente_id': int(data['paciente_id']),
            'agendamento_id': data.get('agendamento_id'),
            'descricao': data['descricao'],
            'valor': float(data['valor']),
            'status': data['status'],
            'data_vencimento': data['data_vencimento'],
            'data_pagamento': data.get('data_pagamento')
        }
        res = sb.table('financeiro').insert(payload).select('*, pacientes:paciente_id(id, nome)').execute()
        novo_lancamento = (getattr(res, 'data', None) or [None])[0]
        return jsonify(format_for_json(novo_lancamento)), 201

    except (ValueError, TypeError) as e:
        return jsonify({"erro": f"Valor inválido fornecido: {e}"}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao salvar lançamento: {str(e)}"}), 500

@api_bp.route('/financeiro/lancamentos/<int:id>', methods=['DELETE'])
def api_delete_lancamento(id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        sb.table('financeiro').delete().eq('id', id).execute()
        return jsonify({"sucesso": True}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao excluir lançamento: {str(e)}"}), 500

@api_bp.route('/financeiro/lancamentos/<int:id>/status', methods=['PUT'])
def api_update_lancamento_status(id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({"erro": "Status é obrigatório"}), 400

    novo_status = data['status']
    if novo_status not in ['pago', 'pendente']:
        return jsonify({"erro": "Status inválido"}), 400

    payload = {
        'status': novo_status,
        'data_pagamento': data.get('data_pagamento')
    }

    sb = get_supabase()
    try:
        sb.table('financeiro').update(payload).eq('id', id).execute()
        return jsonify({"sucesso": True}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao atualizar status: {str(e)}"}), 500

# --- API Odontograma ---
@api_bp.route('/odontograma/<int:paciente_id>/tratamentos', methods=['GET'])
def get_tratamentos_paciente(paciente_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        res = sb.table('odontograma_tratamentos').select('*').eq('paciente_id', paciente_id).order('data_criacao', ascending=True).execute()
        tratamentos = getattr(res, 'data', None) or []
        return jsonify(format_for_json(tratamentos))
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": "Erro ao buscar tratamentos"}), 500

@api_bp.route('/odontograma/tratamentos', methods=['POST'])
def add_tratamento_paciente():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.json
    if not dados:
        return jsonify({"erro": "Requisição sem corpo JSON"}), 400

    paciente_id = dados.get('paciente_id')
    dente_numero = dados.get('denteNumero')
    tipo_tratamento = dados.get('tipo')
    data_tratamento = dados.get('data')
    valor_tratamento_str = dados.get('valor')

    if not all([paciente_id, dente_numero, tipo_tratamento, data_tratamento]):
        return jsonify({"erro": "Campos obrigatórios faltando"}), 400

    valor_tratamento = None
    if valor_tratamento_str:
        try:
            valor_tratamento = float(valor_tratamento_str)
        except (ValueError, TypeError):
            return jsonify({"erro": "Valor inválido"}), 400

    sb = get_supabase()
    try:
        payload = {
            'paciente_id': paciente_id,
            'dente_numero': dente_numero,
            'tipo_tratamento': tipo_tratamento,
            'data_tratamento': data_tratamento,
            'observacoes': dados.get('observacoes'),
            'proxima_sessao': dados.get('proximaSessao'),
            'valor': valor_tratamento,
            'concluido': bool(dados.get('concluido', False))
        }
        res = sb.table('odontograma_tratamentos').insert(payload).select('*').execute()
        novo_tratamento = (getattr(res, 'data', None) or [None])[0]

        if valor_tratamento and valor_tratamento > 0 and novo_tratamento:
            desc_fin = f"Trat.: {tipo_tratamento} (Dente {dente_numero})"
            fin_payload = {
                'paciente_id': paciente_id,
                'tratamento_id': novo_tratamento['id'],
                'descricao': desc_fin,
                'valor': valor_tratamento,
                'status': 'pendente',
                'data_vencimento': data_tratamento,
            }
            sb.table('financeiro').insert(fin_payload).execute()

        return jsonify(format_for_json(novo_tratamento)), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao salvar tratamento: {str(e)}"}), 500

@api_bp.route('/odontograma/tratamentos/<int:tratamento_id>', methods=['DELETE'])
def delete_tratamento(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        # Também remove o lançamento financeiro associado, se houver
        sb.table('financeiro').delete().eq('tratamento_id', tratamento_id).execute()
        sb.table('odontograma_tratamentos').delete().eq('id', tratamento_id).execute()
        return '', 204
    except Exception as e:
        return jsonify({"erro": f"Erro ao excluir: {str(e)}"}), 500

@api_bp.route('/odontograma/tratamentos/<int:tratamento_id>/status', methods=['PUT'])
def update_tratamento_status(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    dados = request.json
    if 'concluido' not in dados:
        return jsonify({"erro": "Campo 'concluido' é obrigatório"}), 400

    sb = get_supabase()
    try:
        payload = {'concluido': bool(dados['concluido'])}
        sb.table('odontograma_tratamentos').update(payload).eq('id', tratamento_id).execute()
        return jsonify({"sucesso": True}), 200
    except Exception as e:
        return jsonify({"erro": f"Erro ao atualizar status: {str(e)}"}), 500

# --- API Mercado Pago ---
@api_bp.route('/checkout/mercadopago/preference', methods=['POST'])
def create_mercadopago_preference():
    try:
        mp_access_token = os.getenv('MP_ACCESS_TOKEN')
        if not mp_access_token:
            return jsonify({"error": "MP_ACCESS_TOKEN não configurado no servidor"}), 500

        body = request.get_json(silent=True) or {}

        # Validação básica do corpo da requisição
        items = body.get("items")
        if not items or not isinstance(items, list) or not items[0].get("unit_price"):
            return jsonify({"error": "Requisição inválida, 'items' com 'unit_price' é obrigatório."}), 400

        headers = {
            "Authorization": f"Bearer {mp_access_token}",
            "Content-Type": "application/json",
        }

        resp = requests.post(
            "https://api.mercadopago.com/checkout/preferences",
            json=body,
            headers=headers,
            timeout=30,
        )

        data = resp.json()

        if resp.status_code >= 400:
            return jsonify({"error": "Falha ao criar preferência", "details": data}), resp.status_code

        return jsonify({
            "id": data.get("id"),
            "init_point": data.get("init_point"),
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Exceção ao criar preferência", "details": str(e)}), 500
