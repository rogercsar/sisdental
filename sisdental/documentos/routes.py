from flask import redirect, flash, url_for, session, send_file
from . import documentos_bp
from sisdental import get_supabase
import datetime
import traceback
import io
import uuid
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

@documentos_bp.route('/paciente/<int:paciente_id>/gerar_atestado')
def gerar_atestado(paciente_id):
    if not session.get('logado'):
        flash("Acesso não autorizado.", "danger")
        return redirect(url_for('auth.login'))

    sb = get_supabase()
    try:
        res = sb.table('pacientes').select('id, nome').eq('id', paciente_id).limit(1).execute()
        paciente = (getattr(res, 'data', None) or [None])[0]
        if not paciente:
            flash("Paciente não encontrado.", "danger")
            return redirect(url_for('pacientes.listar_pacientes'))

        nome_paciente = paciente.get('nome', '')
        data_atual = datetime.datetime.now()

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        # ... (Lógica de desenho do PDF do atestado)
        c.drawString(100, 750, f"ATESTADO MÉDICO para {nome_paciente}")
        c.save()
        pdf_content = buffer.getvalue()

        # Salvar no Supabase Storage
        nome_arquivo = f"atestado_{paciente_id}_{data_atual.strftime('%Y%m%d%H%M%S')}.pdf"
        storage_path = f"pacientes/{paciente_id}/{nome_arquivo}"
        sb.storage.from_("documentos").upload(storage_path, pdf_content, {"contentType": "application/pdf"})

        # Registrar metadados no banco
        sb.table('documentos_paciente').insert({
            'paciente_id': paciente_id,
            'tipo_documento': 'atestado',
            'data_geracao': data_atual.isoformat(),
            'nome_arquivo': nome_arquivo,
            'storage_path': storage_path,
            'descricao': f"Atestado gerado em {data_atual.strftime('%d/%m/%Y')}"
        }).execute()

        flash("Atestado gerado e salvo com sucesso!", "success")
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name=f'atestado_{nome_paciente}.pdf', mimetype='application/pdf')

    except Exception as e:
        traceback.print_exc()
        flash("Erro ao gerar o atestado.", "danger")
        return redirect(url_for('pacientes.listar_pacientes'))


@documentos_bp.route('/paciente/<int:paciente_id>/gerar_receita')
def gerar_receita(paciente_id):
    if not session.get('logado'):
        flash("Acesso não autorizado.", "danger")
        return redirect(url_for('auth.login'))

    sb = get_supabase()
    try:
        res = sb.table('pacientes').select('id, nome').eq('id', paciente_id).limit(1).execute()
        paciente = (getattr(res, 'data', None) or [None])[0]
        if not paciente:
            flash("Paciente não encontrado.", "danger")
            return redirect(url_for('pacientes.listar_pacientes'))

        nome_paciente = paciente.get('nome', '')
        data_atual = datetime.datetime.now()

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        # ... (Lógica de desenho do PDF da receita)
        c.drawString(100, 750, f"RECEITA para {nome_paciente}")
        c.save()
        pdf_content = buffer.getvalue()

        # Salvar no Supabase Storage
        nome_arquivo = f"receita_{paciente_id}_{data_atual.strftime('%Y%m%d%H%M%S')}.pdf"
        storage_path = f"pacientes/{paciente_id}/{nome_arquivo}"
        sb.storage.from_("documentos").upload(storage_path, pdf_content, {"contentType": "application/pdf"})

        # Registrar metadados
        sb.table('documentos_paciente').insert({
            'paciente_id': paciente_id,
            'tipo_documento': 'receita',
            'data_geracao': data_atual.isoformat(),
            'nome_arquivo': nome_arquivo,
            'storage_path': storage_path,
            'descricao': f"Receita gerada em {data_atual.strftime('%d/%m/%Y')}"
        }).execute()

        flash("Receita gerada e salva com sucesso!", "success")
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name=f'receita_{nome_paciente}.pdf', mimetype='application/pdf')

    except Exception as e:
        traceback.print_exc()
        flash("Erro ao gerar a receita.", "danger")
        return redirect(url_for('pacientes.listar_pacientes'))
