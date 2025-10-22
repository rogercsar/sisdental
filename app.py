from flask import Flask, render_template, request, redirect, flash, url_for, session, jsonify # Adicionado jsonify
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, date, datetime, time

# Removido reportlab e xlsxwriter por enquanto para simplificar, adicione de volta se necessário
# from reportlab.lib.pagesizes import letter
# from reportlab.pdfgen import canvas
# import io
# import xlsxwriter
# from flask import send_file
import traceback # Para log de erro detalhado
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch # Para margens
from reportlab.lib.styles import getSampleStyleSheet # Para estilos
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle # Para tabelas
from reportlab.lib import colors
import io
from flask import send_file
from flask import jsonify # Importe jsonify
import traceback
import decimal
import datetime
import os
import uuid
import requests

app = Flask(__name__)
app.secret_key = 'chave_top_secreta'
app.permanent_session_lifetime = timedelta(days=1)

# Configuração do MySQL
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Admin@147!'
app.config['MYSQL_DB'] = 'sisdental'
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'documentos_storage') # Define o caminho completo
mysql = MySQL(app)

# Cria a pasta se ela não existir
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# --- Rotas de Autenticação e Páginas Comuns ---

# --- Função Auxiliar para Formatação JSON ---
def format_for_json(data):
    """Formata recursivamente dados (listas/dicionários) para serem compatíveis com JSON."""
    if isinstance(data, list):
        # Se for uma lista, aplica a função a cada item
        return [format_for_json(item) for item in data]
    if isinstance(data, dict):
        # Se for um dicionário, cria um novo e formata cada valor
        formatted_dict = {}
        for key, value in data.items():
            if isinstance(value, decimal.Decimal):
                # Converte Decimal para float
                formatted_dict[key] = float(value)
            elif isinstance(value, (datetime.datetime, datetime.date)):
                # Converte datetime ou date para string ISO 8601 (YYYY-MM-DDTHH:mm:ss ou YYYY-MM-DD)
                # Retorna None se o valor original for None
                formatted_dict[key] = value.isoformat() if value else None
            elif isinstance(value, time):
                 # Converte time para string HH:MM:SS
                 formatted_dict[key] = value.strftime('%H:%M:%S') if value else None
            elif isinstance(value, timedelta):
                 # Converte timedelta para string HH:MM:SS
                 total_seconds = int(value.total_seconds())
                 # Garante que não haja dias na conversão, apenas horas, minutos, segundos
                 hours, remainder = divmod(total_seconds % (24 * 3600), 3600)
                 minutes, seconds = divmod(remainder, 60)
                 formatted_dict[key] = f"{hours:02}:{minutes:02}:{seconds:02}"
            else:
                # Garante que booleanos sejam booleanos (MySQL pode retornar 0/1)
                # Verifique os nomes das suas colunas booleanas
                if key in ['concluido']: # Adicione outras colunas booleanas aqui se necessário
                    formatted_dict[key] = bool(value)
                else:
                    # Mantém outros tipos como estão
                    formatted_dict[key] = value
        return formatted_dict
    # Se não for lista nem dicionário, retorna o valor original
    return data


# --- Suas Rotas Flask começam aqui ---

# --- Rota para Gerar Atestado Médico (COM LOGS E CONVERSÃO CORRIGIDA) ---
@app.route('/paciente/<int:paciente_id>/gerar_atestado')
def gerar_atestado(paciente_id):
    print(f"\n--- [Gerar Atestado] Iniciando para paciente ID: {paciente_id} ---") # Log 1
    if not session.get('logado'):
        print("--- [Gerar Atestado] ERRO: Não logado (staff) ---")
        flash("Acesso não autorizado.", "danger"); return redirect(url_for('login'))

    cur = None
    try:
        print("--- [Gerar Atestado] Abrindo cursor BD ---") # Log 2
        cur = mysql.connection.cursor()

        # Busca paciente e converte para dict
        print("--- [Gerar Atestado] Buscando paciente... ---") # Log 3
        cur.execute("SELECT id, nome FROM pacientes WHERE id = %s", (paciente_id,))
        paciente_tuple = cur.fetchone() # Pega como tupla
        if not paciente_tuple:
            print("--- [Gerar Atestado] ERRO: Paciente não encontrado ---")
            flash("Paciente não encontrado.", "danger"); return redirect(url_for('pacientes'))

        # *** INÍCIO DA CONVERSÃO MANUAL ***
        paciente_cols = [col[0] for col in cur.description]
        paciente = dict(zip(paciente_cols, paciente_tuple))
        # *** FIM DA CONVERSÃO MANUAL ***

        nome_paciente = paciente['nome'] # Agora 'paciente' é um dict
        print(f"--- [Gerar Atestado] Paciente encontrado: {nome_paciente} ---") # Log 4

        data_atual_obj = datetime.datetime.now()
        data_atual_str = data_atual_obj.strftime("%d de %B de %Y")

        # --- Geração do PDF ---
        print("--- [Gerar Atestado] Iniciando geração do PDF... ---") # Log 5
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        # ... (código de desenho do atestado - mantenha o seu) ...
        width, height = letter; margin = inch; line_height = 16
        c.setFont("Helvetica-Bold", 14); c.drawCentredString(width / 2.0, height - margin, "ATESTADO MÉDICO")
        c.setFont("Helvetica", 12); y_pos = height - margin - 4 * line_height
        texto = f"Atesto que Sr(a). {nome_paciente} esteve sob cuidados médicos..." # Ajuste
        textobject = c.beginText(margin, y_pos); textobject.setFont("Helvetica", 12); textobject.setLeading(line_height)
        textobject.textLine(texto); c.drawText(textobject)
        c.drawString(margin, margin + 2*line_height, f"Cidade, {data_atual_str}.")
        c.drawString(margin, margin, "_________________________"); c.drawString(margin, margin - line_height, "[Nome/CRM Profissional]")
        c.save()
        print("--- [Gerar Atestado] PDF gerado no buffer. ---") # Log 6
        # --- Fim Geração PDF ---

        pdf_content = buffer.getvalue()

        # --- Salvar Arquivo e Registrar no Banco ---
        print("--- [Gerar Atestado] Preparando para salvar arquivo e registrar BD... ---") # Log 7
        timestamp_str = data_atual_obj.strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4().hex)[:8]
        nome_arquivo = f"atestado_{paciente_id}_{timestamp_str}_{unique_id}.pdf"
        caminho_completo = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
        caminho_relativo = 'documentos_storage'

        print(f"--- [Gerar Atestado] Tentando salvar em: {caminho_completo} ---") # Log 8
        with open(caminho_completo, 'wb') as f:
            f.write(pdf_content)
        print(f"--- [Gerar Atestado] Arquivo salvo com sucesso. ---") # Log 9

        print(f"--- [Gerar Atestado] Tentando inserir no BD... ---") # Log 10
        sql_insert = """
            INSERT INTO documentos_paciente (paciente_id, tipo_documento, data_geracao, nome_arquivo, caminho_relativo, descricao)
            VALUES (%s, %s, %s, %s, %s, %s)"""
        descricao_doc = f"Atestado gerado em {data_atual_obj.strftime('%d/%m/%Y')}"
        params_insert = (paciente_id, 'atestado', data_atual_obj, nome_arquivo, caminho_relativo, descricao_doc)
        cur.execute(sql_insert, params_insert)
        mysql.connection.commit()
        print(f"--- [Gerar Atestado] Registro ID {cur.lastrowid} inserido no BD. ---") # Log 11
        # --- Fim Salvar/Registrar ---

        print("--- [Gerar Atestado] Enviando arquivo para download... ---") # Log 12
        buffer.seek(0)
        return send_file(
            buffer, mimetype='application/pdf',
            download_name=f'atestado_{nome_paciente.replace(" ", "_")}.pdf',
            as_attachment=True
        )

    except Exception as e:
        print("\n" + "="*10 + f" !!! ERRO ROTA /gerar_atestado/{paciente_id} !!! " + "="*10) # Log Erro 1
        print(f"--- [Gerar Atestado] Exceção capturada: {e} ---") # Log Erro 2
        traceback.print_exc() # Log Erro 3 (Traceback completo)
        print("="*30)
        flash("Erro ao gerar ou salvar o atestado.", "danger")
        return redirect(url_for('detalhes_paciente', paciente_id=paciente_id) if 'paciente_id' in locals() else url_for('pacientes'))
    finally:
        if cur:
            cur.close()
            print(f"--- [Gerar Atestado] Cursor fechado para paciente {paciente_id}. ---") # Log Final



# --- Rota para Gerar Receita Médica (COM LOGS E CONVERSÃO CORRIGIDA) ---
@app.route('/paciente/<int:paciente_id>/gerar_receita')
def gerar_receita(paciente_id):
    print(f"\n--- [Gerar Receita] Iniciando para paciente ID: {paciente_id} ---") # Log R1
    # Verifica se o STAFF está logado (quem gera a receita)
    if not session.get('logado'):
        print("--- [Gerar Receita] ERRO: Não logado (staff) ---")
        flash("Acesso não autorizado.", "danger"); return redirect(url_for('login'))

    cur = None
    try:
        print("--- [Gerar Receita] Abrindo cursor BD ---") # Log R2
        cur = mysql.connection.cursor()

        # Busca paciente e converte para dict
        print("--- [Gerar Receita] Buscando paciente... ---") # Log R3
        # Seleciona apenas as colunas necessárias (id, nome)
        cur.execute("SELECT id, nome FROM pacientes WHERE id = %s", (paciente_id,))
        paciente_tuple = cur.fetchone() # Pega como tupla
        if not paciente_tuple:
            print("--- [Gerar Receita] ERRO: Paciente não encontrado ---")
            flash("Paciente não encontrado.", "danger"); return redirect(url_for('pacientes'))

        # *** INÍCIO DA CONVERSÃO MANUAL ***
        paciente_cols = [col[0] for col in cur.description]
        paciente = dict(zip(paciente_cols, paciente_tuple))
        # *** FIM DA CONVERSÃO MANUAL ***

        nome_paciente = paciente['nome'] # Agora 'paciente' é um dict
        print(f"--- [Gerar Receita] Paciente encontrado: {nome_paciente} ---") # Log R4

        data_atual_obj = datetime.datetime.now()
        data_atual_str = data_atual_obj.strftime("%d/%m/%Y")

        # --- Geração do PDF ---
        print("--- [Gerar Receita] Iniciando geração do PDF... ---") # Log R5
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        # ... (código de desenho da receita - mantenha o seu) ...
        width, height = letter; margin = inch; line_height = 14
        c.setFont("Helvetica-Bold", 12); c.drawString(margin, height - margin, "[Nome Clínica]");
        c.setFont("Helvetica-Bold", 14); c.drawCentredString(width / 2.0, height - margin - 4*line_height, "RECEITUÁRIO")
        c.setFont("Helvetica", 11); y_pos = height - margin - 6*line_height
        c.drawString(margin, y_pos, f"Paciente: {nome_paciente}")
        y_pos -= 2*line_height; c.setFont("Helvetica-Bold", 11); c.drawString(margin, y_pos, "Prescrição:")
        y_pos -= line_height * 1.5; c.setFont("Helvetica", 11)
        c.drawString(margin, y_pos, "1. _________________________")
        c.drawString(margin, margin + 2*line_height, f"Data: {data_atual_str}")
        c.drawString(margin, margin, "_________________________"); c.drawString(margin, margin - line_height, "[Nome/CRM Profissional]")
        c.save()
        print("--- [Gerar Receita] PDF gerado no buffer. ---") # Log R6
        # --- Fim Geração PDF ---

        pdf_content = buffer.getvalue()

        # --- Salvar Arquivo e Registrar no Banco ---
        print("--- [Gerar Receita] Preparando para salvar arquivo e registrar BD... ---") # Log R7
        timestamp_str = data_atual_obj.strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4().hex)[:8]
        nome_arquivo = f"receita_{paciente_id}_{timestamp_str}_{unique_id}.pdf"
        caminho_completo = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
        caminho_relativo = 'documentos_storage'

        print(f"--- [Gerar Receita] Tentando salvar em: {caminho_completo} ---") # Log R8
        with open(caminho_completo, 'wb') as f:
            f.write(pdf_content)
        print(f"--- [Gerar Receita] Arquivo salvo com sucesso. ---") # Log R9

        print(f"--- [Gerar Receita] Tentando inserir no BD... ---") # Log R10
        sql_insert = """
            INSERT INTO documentos_paciente (paciente_id, tipo_documento, data_geracao, nome_arquivo, caminho_relativo, descricao)
            VALUES (%s, %s, %s, %s, %s, %s)"""
        descricao_doc = f"Receita gerada em {data_atual_obj.strftime('%d/%m/%Y')}"
        params_insert = (paciente_id, 'receita', data_atual_obj, nome_arquivo, caminho_relativo, descricao_doc)
        cur.execute(sql_insert, params_insert)
        mysql.connection.commit()
        print(f"--- [Gerar Receita] Registro ID {cur.lastrowid} inserido no BD. ---") # Log R11
        # --- Fim Salvar/Registrar ---

        print("--- [Gerar Receita] Enviando arquivo para download... ---") # Log R12
        buffer.seek(0)
        return send_file(
            buffer, mimetype='application/pdf',
            download_name=f'receita_{nome_paciente.replace(" ", "_")}.pdf',
            as_attachment=True
        )

    except Exception as e:
        print("\n" + "="*10 + f" !!! ERRO ROTA /gerar_receita/{paciente_id} !!! " + "="*10) # Log Erro R1
        print(f"--- [Gerar Receita] Exceção capturada: {e} ---") # Log Erro R2
        traceback.print_exc() # Log Erro R3
        print("="*30)
        flash("Erro ao gerar ou salvar a receita.", "danger")
        # Tenta voltar para detalhes
        return redirect(url_for('detalhes_paciente', paciente_id=paciente_id) if 'paciente_id' in locals() else url_for('pacientes'))
    finally:
        if cur:
            cur.close()
            print(f"--- [Gerar Receita] Cursor fechado para paciente {paciente_id}. ---") # Log Final R


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        cur = None
        try:
            cur = mysql.connection.cursor()
            cur.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cur.fetchone()

            if user:
                flash('Nome de usuário já existe.', 'danger')
                return render_template('register.html')

            hashed_password = generate_password_hash(password)
            cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, hashed_password))
            mysql.connection.commit()
            flash('Cadastro feito com sucesso! Faça login.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash(f"Erro durante o registro: {e}", "danger")
            return render_template('register.html')
        finally:
            if cur:
                cur.close()
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        cur = None
        try:
            cur = mysql.connection.cursor()
            cur.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cur.fetchone()

            if user and check_password_hash(user[2], password):
                session.permanent = True
                session['logado'] = True
                session['usuario'] = username
                flash('Login realizado com sucesso!', 'success')
                return redirect(url_for('home'))
            else:
                flash('Usuário ou senha inválidos.', 'danger')
        except Exception as e:
            flash(f"Erro durante o login: {e}", "danger")
        finally:
            if cur:
                cur.close()
    return render_template('login.html')

@app.route('/')
def home():
    if not session.get('logado'):
        return redirect(url_for('login'))

    nome_usuario = session.get('usuario', 'Visitante')
    cur = None
    # Dicionário para guardar os dados do dashboard
    dashboard_data = {
        'total_pacientes': 0,
        'consultas_hoje': 0,
        'total_agendamentos': 0,
        'agendamentos_hoje_lista': [] # NOVA LISTA
    }

    try:
        cur = mysql.connection.cursor() # Pode ser configurado para retornar dicts: mysql.connection.cursor(MySQLdb.cursors.DictCursor)

        # 1. Contar Total de Pacientes
        cur.execute("SELECT COUNT(*) FROM pacientes")
        result = cur.fetchone()
        if result:
            dashboard_data['total_pacientes'] = result[0]

        # 2. Contar Consultas Agendadas para Hoje
        cur.execute("SELECT COUNT(*) FROM agendamentos WHERE data = CURDATE()")
        result = cur.fetchone()
        if result:
            dashboard_data['consultas_hoje'] = result[0]

        # 3. Contar Total de Agendamentos
        cur.execute("SELECT COUNT(*) FROM agendamentos")
        result = cur.fetchone()
        if result:
            dashboard_data['total_agendamentos'] = result[0]

        # 4. Buscar Lista de Agendamentos de Hoje (NOVO)
        # Seleciona nome do paciente, serviço e hora formatada (HH:MM)
        # Junta agendamentos com pacientes
        # Filtra pela data atual (CURDATE())
        # Ordena pela hora
        # Limita a 5 resultados (ajuste conforme necessário)
        cur.execute("""
            SELECT p.id AS paciente_id, p.nome, a.servico, TIME_FORMAT(a.hora, '%H:%i') AS hora_formatada
            FROM agendamentos a
            JOIN pacientes p ON a.paciente_id = p.id
            WHERE a.data = CURDATE()
            ORDER BY a.hora ASC
            LIMIT 5
        """)
        # Pega os nomes das colunas para criar dicionários
        columns = [col[0] for col in cur.description]
        agendamentos_hoje = [dict(zip(columns, row)) for row in cur.fetchall()]
        dashboard_data['agendamentos_hoje_lista'] = agendamentos_hoje

    except Exception as e:
        print(f"Erro ao buscar dados do dashboard: {e}")
        traceback.print_exc()
        flash("Não foi possível carregar os dados do dashboard.", "warning")

    finally:
        if cur:
           cur.close()

    # Passa o dicionário 'dashboard_data' para o template
    return render_template('index.html', nome=nome_usuario, dashboard=dashboard_data)


@app.route('/logout')
def logout():
    session.clear()
    flash('Sessão encerrada.', 'info')
    return redirect(url_for('login'))

# --- Rotas de Pacientes ---

@app.route('/cadastrar_paciente', methods=['GET', 'POST'])
def cadastrar_paciente():
    if not session.get('logado'):
        return redirect(url_for('login'))
    if request.method == 'POST':
        nome = request.form['nome']
        cpf = request.form['cpf']
        telefone = request.form['telefone']
        email = request.form['email']
        data_nascimento = request.form['data_nascimento'] or None # Aceita data vazia
        cur = None
        try:
            cur = mysql.connection.cursor()
            cur.execute("INSERT INTO pacientes (nome, cpf, telefone, email, data_nascimento) VALUES (%s, %s, %s, %s, %s)",
                        (nome, cpf, telefone, email, data_nascimento))
            mysql.connection.commit()
            flash('Paciente cadastrado com sucesso!', 'success')
            # Redireciona para a lista após cadastrar
            return redirect(url_for('pacientes'))
        except Exception as e:
            mysql.connection.rollback()
            flash(f'Erro ao cadastrar paciente: {str(e)}', 'danger')
            # Retorna para o formulário com os dados preenchidos (se possível)
            return render_template('cadastrar_paciente.html', form_data=request.form)
        finally:
            if cur:
                cur.close()
    return render_template('cadastrar_paciente.html')

@app.route('/pacientes')
def pacientes():
    if not session.get('logado'):
        return redirect(url_for('login'))

    busca = request.args.get('busca', '')
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = 10 # Aumentado para 10
    offset = (pagina - 1) * por_pagina
    cur = None
    try:
        cur = mysql.connection.cursor()
        query_base = "SELECT * FROM pacientes "
        count_query_base = "SELECT COUNT(*) FROM pacientes "
        params = []
        where_clause = ""

        if busca:
            where_clause = "WHERE nome LIKE %s "
            params.append('%' + busca + '%')

        # Contagem total para paginação futura
        # cur.execute(count_query_base + where_clause, params)
        # total_pacientes = cur.fetchone()[0]
        # total_paginas = (total_pacientes + por_pagina - 1) // por_pagina

        query = query_base + where_clause + "ORDER BY nome ASC LIMIT %s OFFSET %s" # Ordenado por nome
        params.extend([por_pagina, offset])
        cur.execute(query, params)
        pacientes_data = cur.fetchall()

        return render_template('pacientes.html', pacientes=pacientes_data, busca=busca, pagina=pagina) #, total_paginas=total_paginas)
    except Exception as e:
        flash(f"Erro ao buscar pacientes: {e}", "danger")
        return render_template('pacientes.html', pacientes=[], busca=busca, pagina=pagina)
    finally:
        if cur:
            cur.close()

# CORRIGIDO: Removido &lt; e &gt;
@app.route('/editar_paciente/<int:id>', methods=['GET', 'POST'])
def editar_paciente(id):
    if not session.get('logado'):
        return redirect(url_for('login'))
    cur = None
    try:
        cur = mysql.connection.cursor()
        if request.method == 'POST':
            nome = request.form['nome']
            cpf = request.form['cpf']
            telefone = request.form['telefone']
            email = request.form['email']
            data_nascimento = request.form['data_nascimento'] or None

            cur.execute("""
                UPDATE pacientes
                SET nome = %s, cpf = %s, telefone = %s, email = %s, data_nascimento = %s
                WHERE id = %s
            """, (nome, cpf, telefone, email, data_nascimento, id))
            mysql.connection.commit()
            flash('Paciente atualizado com sucesso!', 'success')
            return redirect(url_for('pacientes'))
        else: # Método GET
            cur.execute("SELECT * FROM pacientes WHERE id = %s", (id,))
            paciente = cur.fetchone()
            if not paciente:
                flash('Paciente não encontrado.', 'danger')
                return redirect(url_for('pacientes'))
            # Formata a data para YYYY-MM-DD para o input type="date"
            paciente_dict = list(paciente)
            if paciente_dict[5]: # Se data_nascimento não for None
                paciente_dict[5] = paciente_dict[5].strftime('%Y-%m-%d')

            return render_template('editar_paciente.html', paciente=paciente_dict)
    except Exception as e:
        mysql.connection.rollback()
        flash(f"Erro ao editar paciente: {e}", "danger")
        return redirect(url_for('pacientes'))
    finally:
        if cur:
            cur.close()

# CORRIGIDO: Removido &lt; e &gt;
@app.route('/excluir_paciente/<int:id>')
def excluir_paciente(id):
    if not session.get('logado'):
        return redirect(url_for('login'))
    cur = None
    try:
        # Adicionar verificação se existem dependências (agendamentos, financeiro, odontograma) antes de excluir?
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM pacientes WHERE id = %s", (id,))
        mysql.connection.commit()
        flash('Paciente excluído com sucesso!', 'success')
    except Exception as e:
        mysql.connection.rollback()
        flash(f'Erro ao excluir paciente: {str(e)}', 'danger')
    finally:
        if cur:
            cur.close()
    return redirect(url_for('pacientes'))

# --- Rotas de Agendamento e Financeiro (Simplificado) ---
# --- Rotas de Agendamento e Financeiro ---

@app.route('/cadastrar_agendamento', methods=['GET', 'POST'])
def cadastrar_agendamento():
    if not session.get('logado'):
        return redirect(url_for('login'))

    cur = None
    try:
        cur = mysql.connection.cursor()

        if request.method == 'POST':
            paciente_id = request.form.get('paciente_id')
            servico = request.form.get('servico')
            data = request.form.get('data')
            hora = request.form.get('hora')
            observacoes = request.form.get('observacoes', '') # Pega observações, default vazio

            # Validação básica (pode ser mais robusta)
            if not all([paciente_id, servico, data, hora]):
                flash('Preencha todos os campos obrigatórios (Paciente, Serviço, Data, Hora).', 'warning')
            else:
                cur.execute("""
                    INSERT INTO agendamentos (paciente_id, servico, data, hora, observacoes, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (paciente_id, servico, data, hora, observacoes, 'Agendado')) # Adiciona um status padrão
                mysql.connection.commit()
                flash('Agendamento cadastrado com sucesso!', 'success')
                # Limpa o formulário redirecionando para a mesma página (GET)
                return redirect(url_for('cadastrar_agendamento'))

        # Lógica para GET (executa sempre, e após POST se não redirecionar antes)
        cur.execute("SELECT id, nome FROM pacientes ORDER BY nome ASC") # Ordena pacientes por nome
        pacientes_lista = cur.fetchall()
        return render_template('cadastrar_agendamento.html', pacientes=pacientes_lista)

    except Exception as e:
        if mysql.connection: mysql.connection.rollback() # Rollback em caso de erro no POST
        print(f"Erro em /cadastrar_agendamento: {e}")
        traceback.print_exc()
        flash(f'Erro ao processar agendamento: {str(e)}', 'danger')
        # Tenta recarregar a página mesmo com erro, buscando pacientes novamente se possível
        pacientes_lista = []
        if cur: # Tenta buscar pacientes se o cursor ainda for válido (pode falhar)
             try:
                 cur.execute("SELECT id, nome FROM pacientes ORDER BY nome ASC")
                 pacientes_lista = cur.fetchall()
             except Exception as fetch_err:
                 print(f"Erro ao buscar pacientes após erro inicial: {fetch_err}")
        # Passa os dados do formulário de volta em caso de erro no POST
        form_data = request.form if request.method == 'POST' else {}
        return render_template('cadastrar_agendamento.html', pacientes=pacientes_lista, form_data=form_data)
    finally:
        if cur:
            cur.close()


# Remova 'POST' dos métodos, pois o form será enviado via JS para a API
@app.route('/financeiro', methods=['GET'])
def financeiro():
    if not session.get('logado'):
        return redirect(url_for('login'))

    # Não precisa mais buscar lançamentos, pacientes ou agendamentos aqui.
    # O JavaScript vai buscar via API.
    # Apenas renderiza o template base.
    return render_template('financeiro.html')

    # Remova todo o bloco try/except/finally que buscava dados e tratava POST.

@app.route('/api/financeiro/lancamentos', methods=['GET'])
def api_get_lancamentos():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT f.*, p.nome as paciente_nome
            FROM financeiro f
            LEFT JOIN pacientes p ON f.paciente_id = p.id
            ORDER BY f.data_vencimento DESC
        """)

        lancamentos = [] # Inicializa como lista vazia
        if cur.rowcount > 0:
             columns = [col[0] for col in cur.description]
             # Fetchall e processa linha por linha para melhor depuração se necessário
             rows = cur.fetchall()
             for row in rows:
                 lancamento_dict = dict(zip(columns, row))
                 # --- Processamento de Tipos ---
                 for key, value in lancamento_dict.items():
                     if isinstance(value, decimal.Decimal):
                         # Converte Decimal para float (ou string: str(value))
                         lancamento_dict[key] = float(value)
                     elif isinstance(value, (datetime.date, datetime.datetime)):
                         # Converte Date/Datetime para string ISO, SE NÃO FOR NONE
                         lancamento_dict[key] = value.isoformat() if value else None
                     # Adicione outras conversões se necessário (ex: booleanos)
                 lancamentos.append(lancamento_dict)
             # --- Fim do Processamento ---

        # Retorna a lista (pode estar vazia) como JSON
        return jsonify(lancamentos)

    except Exception as e:
        # Log detalhado do erro no console do servidor
        print("="*30)
        print(f"ERRO em GET /api/financeiro/lancamentos:")
        traceback.print_exc() # Imprime o traceback completo
        print("="*30)
        # Retorna uma mensagem de erro genérica para o cliente
        return jsonify({"erro": f"Erro interno ao buscar lançamentos. Verifique os logs do servidor."}), 500
    finally:
        if cur:
            cur.close()

# Não se esqueça dos imports no topo do arquivo!
# import traceback
# import decimal
# import datetime
# from flask import jsonify


# --- IMPORTANTE: Adicione também as outras rotas da API ---

# Exemplo para listar pacientes (se já não existir)
@app.route('/api/pacientes/listar', methods=['GET'])
def api_get_pacientes():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    # ... (lógica para buscar id e nome dos pacientes) ...
    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, nome FROM pacientes ORDER BY nome ASC")
        pacientes_lista = []
        if cur.rowcount > 0:
            columns = [col[0] for col in cur.description]
            pacientes_lista = [dict(zip(columns, row)) for row in cur.fetchall()]
        return jsonify(pacientes_lista)
    except Exception as e:
        print(f"Erro em /api/pacientes/listar: {e}")
        return jsonify({"erro": f"Erro ao buscar pacientes: {str(e)}"}), 500
    finally:
        if cur: cur.close()


# Exemplo para criar lançamento (POST) - Adaptado do seu código original
@app.route('/api/financeiro/lancamentos', methods=['POST'])
def api_create_lancamento():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    data = request.get_json() # Recebe dados JSON do JavaScript
    if not data:
        return jsonify({"erro": "Requisição sem dados JSON"}), 400

    paciente_id = data.get('paciente_id')
    agendamento_id = data.get('agendamento_id') or None
    descricao = data.get('descricao')
    valor_str = data.get('valor') # Valor virá como número ou string do JS
    status = data.get('status')
    data_vencimento = data.get('data_vencimento')
    data_pagamento = data.get('data_pagamento') or None

    # Validação (adapte conforme necessário)
    if not all([paciente_id, descricao, valor_str, status, data_vencimento]):
         return jsonify({"erro": "Campos obrigatórios faltando"}), 400

    try:
        valor_float = float(valor_str) # JS deve enviar número
    except (ValueError, TypeError):
        return jsonify({"erro": "Valor financeiro inválido"}), 400

    # Lógica de banco de dados (similar ao seu POST original)
    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO financeiro (paciente_id, agendamento_id, descricao, valor, status, data_vencimento, data_pagamento)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (paciente_id, agendamento_id, descricao, valor_float, status, data_vencimento, data_pagamento))
        mysql.connection.commit()
        novo_id = cur.lastrowid # Pega o ID do registro inserido

        # Retorna o objeto criado (ou apenas sucesso)
        # É bom buscar o registro recém-criado para retornar completo
        cur.execute("SELECT f.*, p.nome as paciente_nome FROM financeiro f LEFT JOIN pacientes p ON f.paciente_id = p.id WHERE f.id = %s", (novo_id,))
        if cur.rowcount > 0:
            columns = [col[0] for col in cur.description]
            novo_lancamento = dict(zip(columns, cur.fetchone()))
            # Formatar Decimal/Date antes de retornar
            for key, value in novo_lancamento.items():
                 if isinstance(value, decimal.Decimal): novo_lancamento[key] = float(value)
                 elif isinstance(value, (datetime.date, datetime.datetime)): novo_lancamento[key] = value.isoformat()
            return jsonify(novo_lancamento), 201 # 201 Created
        else:
            return jsonify({"sucesso": True, "id": novo_id}), 201

    except Exception as e:
        if mysql.connection: mysql.connection.rollback()
        print(f"Erro em POST /api/financeiro/lancamentos: {e}")
        return jsonify({"erro": f"Erro ao salvar lançamento: {str(e)}"}), 500
    finally:
        if cur: cur.close()


# --- CRIE AS ROTAS PARA PUT, DELETE e PUT /status de forma similar ---
# PUT /api/financeiro/lancamentos/<int:id> (recebe JSON, atualiza no banco)
# DELETE /api/financeiro/lancamentos/<int:id> (exclui do banco)
# PUT /api/financeiro/lancamentos/<int:id>/status (recebe JSON {status, data_pagamento}, atualiza)

# Exemplo rápido para DELETE
@app.route('/api/financeiro/lancamentos/<int:id>', methods=['DELETE'])
def api_delete_lancamento(id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM financeiro WHERE id = %s", (id,))
        mysql.connection.commit()
        if cur.rowcount > 0:
            return jsonify({"sucesso": True}), 200 # Ou 204 No Content sem corpo
        else:
            return jsonify({"erro": "Lançamento não encontrado"}), 404
    except Exception as e:
        if mysql.connection: mysql.connection.rollback()
        print(f"Erro em DELETE /api/financeiro/lancamentos/{id}: {e}")
        return jsonify({"erro": f"Erro ao excluir lançamento: {str(e)}"}), 500
    finally:
        if cur: cur.close()

# Exemplo rápido para PUT /status
@app.route('/api/financeiro/lancamentos/<int:id>/status', methods=['PUT'])
def api_update_lancamento_status(id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({"erro": "Dados inválidos (status obrigatório)"}), 400

    novo_status = data.get('status')
    data_pagamento = data.get('data_pagamento') # Pode ser null

    if novo_status not in ['pago', 'pendente']:
        return jsonify({"erro": "Status inválido"}), 400

    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE financeiro
            SET status = %s, data_pagamento = %s
            WHERE id = %s
        """, (novo_status, data_pagamento, id))
        mysql.connection.commit()

        if cur.rowcount > 0:
             # Opcional: buscar e retornar o registro atualizado
             return jsonify({"sucesso": True}), 200
        else:
             return jsonify({"erro": "Lançamento não encontrado"}), 404

    except Exception as e:
        if mysql.connection: mysql.connection.rollback()
        print(f"Erro em PUT /api/financeiro/lancamentos/{id}/status: {e}")
        return jsonify({"erro": f"Erro ao atualizar status: {str(e)}"}), 500
    finally:
        if cur: cur.close()

# --- Fim das Rotas de Agendamento e Financeiro ---

# --- Rotas do Odontograma ---

# CORRIGIDO: Removido &lt; e &gt;
@app.route('/odontograma/<int:paciente_id>')
def odontograma_paciente(paciente_id):
    if not session.get('logado'):
        return redirect(url_for('login'))
    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT id, nome FROM pacientes WHERE id = %s", (paciente_id,))
        paciente = cur.fetchone()
        if not paciente:
            flash('Paciente não encontrado.', 'danger')
            return redirect(url_for('pacientes'))
        return render_template('odontograma.html', paciente_id=paciente_id, nome_paciente=paciente[1])
    except Exception as e:
        flash(f"Erro ao carregar odontograma: {e}", "danger")
        return redirect(url_for('pacientes'))
    finally:
        if cur:
            cur.close()

# --- API Endpoints para Odontograma ---

# GET: Buscar tratamentos de um paciente (ADICIONADO 'concluido')
@app.route('/api/odontograma/<int:paciente_id>/tratamentos', methods=['GET'])
def get_tratamentos_paciente(paciente_id):
    # ... (verificação de login) ...
    cur = None
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, dente_numero, tipo_tratamento, data_tratamento, observacoes, proxima_sessao, concluido
            FROM odontograma_tratamentos
            WHERE paciente_id = %s
            ORDER BY data_criacao ASC
        """, (paciente_id,))
        columns = [col[0] for col in cur.description]
        tratamentos = [dict(zip(columns, row)) for row in cur.fetchall()]

        # Formatar datas e converter booleano (MySQL pode retornar 0/1)
        for t in tratamentos:
            if t.get('data_tratamento'):
                t['data_tratamento'] = t['data_tratamento'].strftime('%Y-%m-%d')
            if t.get('proxima_sessao'):
                t['proxima_sessao'] = t['proxima_sessao'].strftime('%Y-%m-%d')
            # Garante que 'concluido' seja um booleano no JSON
            t['concluido'] = bool(t.get('concluido', False))
        return jsonify(tratamentos)
    except Exception as e:
        print(f"Erro API GET /tratamentos (paciente {paciente_id}): {e}")
        traceback.print_exc()
        return jsonify({"erro": "Erro interno ao buscar tratamentos"}), 500
    finally:
        if cur:
            cur.close()

# POST: Adicionar um novo tratamento (ADICIONADO 'concluido')
# POST: Adicionar um novo tratamento E criar lançamento financeiro se houver valor
@app.route('/api/odontograma/<int:paciente_id>/tratamentos', methods=['POST'])
def add_tratamento_paciente(paciente_id):
    print("\n--- [API Odonto POST] Iniciando requisição ---") # Log 1
    if not session.get('logado'):
        print("--- [API Odonto POST] ERRO: Não autorizado ---")
        return jsonify({"erro": "Não autorizado"}), 401

    # Verifica paciente
    cur_check = None
    try:
        cur_check = mysql.connection.cursor()
        cur_check.execute("SELECT id FROM pacientes WHERE id = %s", (paciente_id,))
        if not cur_check.fetchone():
            print(f"--- [API Odonto POST] ERRO: Paciente {paciente_id} não encontrado ---")
            return jsonify({"erro": "Paciente não encontrado"}), 404
    except Exception as e_check:
        print(f"--- [API Odonto POST] ERRO ao verificar paciente {paciente_id}: {e_check} ---")
        traceback.print_exc()
        return jsonify({"erro": "Erro ao verificar paciente"}), 500
    finally:
        if cur_check: cur_check.close()

    # Processa dados
    dados = request.json
    if not dados:
        print("--- [API Odonto POST] ERRO: Requisição sem JSON ---")
        return jsonify({"erro": "Requisição sem corpo JSON"}), 400
    print(f"--- [API Odonto POST] Dados recebidos: {dados} ---") # Log 2

    # Extrai dados
    dente_numero = dados.get('denteNumero'); tipo_tratamento = dados.get('tipo')
    data_tratamento = dados.get('data'); observacoes = dados.get('observacoes')
    proxima_sessao = dados.get('proximaSessao') or None; valor_tratamento_str = dados.get('valor')
    concluido = bool(dados.get('concluido', False))

    # Valida obrigatórios
    required = ['denteNumero', 'tipo', 'data']
    missing = [f for f in required if not dados.get(f)]
    if missing:
        print(f"--- [API Odonto POST] ERRO: Campos obrigatórios faltando: {missing} ---")
        return jsonify({"erro": f"Campos obrigatórios: {', '.join(missing)}"}), 400

    # Valida e converte valor
    valor_tratamento = None
    if valor_tratamento_str is not None and valor_tratamento_str != '':
        try:
            valor_tratamento = float(valor_tratamento_str)
            if valor_tratamento < 0:
                print("--- [API Odonto POST] ERRO: Valor negativo ---")
                return jsonify({"erro": "Valor negativo"}), 400
        except (ValueError, TypeError):
            print("--- [API Odonto POST] ERRO: Valor inválido ---")
            return jsonify({"erro": "Valor inválido"}), 400
    print(f"--- [API Odonto POST] Valor processado: {valor_tratamento} ---") # Log 3

    # Valida datas
    try:
        if data_tratamento: datetime.datetime.strptime(data_tratamento, '%Y-%m-%d')
        if proxima_sessao: datetime.datetime.strptime(proxima_sessao, '%Y-%m-%d')
    except ValueError:
         print("--- [API Odonto POST] ERRO: Formato de data inválido ---")
         return jsonify({"erro": "Formato data inválido"}), 400
    print("--- [API Odonto POST] Datas validadas ---") # Log 4

    # Transação BD
    cur = None
    try:
        cur = mysql.connection.cursor()
        print("--- [API Odonto POST] Iniciando transação BD ---") # Log 5

        # 1. INSERT Odontograma
        sql_trat = """INSERT INTO odontograma_tratamentos (paciente_id, dente_numero, tipo_tratamento, data_tratamento,
                      observacoes, proxima_sessao, valor, concluido) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"""
        params_trat = (paciente_id, dente_numero, tipo_tratamento, data_tratamento, observacoes,
                       proxima_sessao, valor_tratamento, concluido)
        print(f"--- [API Odonto POST] Executando SQL Tratamento: {sql_trat} com params {params_trat} ---") # Log 6
        cur.execute(sql_trat, params_trat)
        novo_tratamento_id = cur.lastrowid
        print(f"--- [API Odonto POST] Tratamento ID {novo_tratamento_id} inserido (rowcount: {cur.rowcount}). ---") # Log 7

        # 2. INSERT Financeiro (Condicional)
        if valor_tratamento is not None and valor_tratamento > 0:
            desc_fin = f"Trat.: {tipo_tratamento} (Dente {dente_numero})"
            sql_fin = """INSERT INTO financeiro (paciente_id, tratamento_id, descricao, valor, status, data_vencimento, data_pagamento)
                         VALUES (%s, %s, %s, %s, %s, %s, %s)"""
            params_fin = (paciente_id, novo_tratamento_id, desc_fin, valor_tratamento, 'pendente', data_tratamento, None)
            print(f"--- [API Odonto POST] Executando SQL Financeiro: {sql_fin} com params {params_fin} ---") # Log 8
            cur.execute(sql_fin, params_fin)
            print(f"--- [API Odonto POST] Financeiro inserido (rowcount: {cur.rowcount}). ---") # Log 9
        else:
            print(f"--- [API Odonto POST] Valor ({valor_tratamento}) não requer financeiro. ---") # Log 8/9 Alternativo

        # 3. COMMIT
        print("--- [API Odonto POST] Tentando realizar commit... ---") # Log 10
        mysql.connection.commit()
        print("--- [API Odonto POST] Commit realizado com sucesso. ---") # Log 11

        # 4. Rebuscar e retornar
        print(f"--- [API Odonto POST] Rebuscando tratamento ID {novo_tratamento_id}... ---") # Log 12
        cur.execute("SELECT * FROM odontograma_tratamentos WHERE id = %s", (novo_tratamento_id,))
        novo_tratamento_dict = format_for_json(cur.fetchone())
        if novo_tratamento_dict:
            print("--- [API Odonto POST] Tratamento rebuscado. Retornando JSON de sucesso. ---") # Log 13
            return jsonify(novo_tratamento_dict), 201
        else:
            print("--- [API Odonto POST] ERRO: Falha ao rebuscar tratamento após insert/commit. ---") # Log 13 Alternativo
            return jsonify({"sucesso": True, "id": novo_tratamento_id, "msg": "Salvo, erro ao rebuscar."}), 201

    except Exception as e:
        print("\n" + "="*10 + f" !!! ERRO DURANTE TRANSAÇÃO !!! " + "="*10) # Log Erro 1
        print(f"--- [API Odonto POST] Erro na transação: {e} ---") # Log Erro 2
        traceback.print_exc() # Log Erro 3 (Traceback completo)
        if mysql.connection:
            print("--- [API Odonto POST] Realizando Rollback... ---") # Log Erro 4
            try:
                mysql.connection.rollback()
                print("--- [API Odonto POST] Rollback realizado. ---") # Log Erro 5
            except Exception as rb_err:
                print(f"--- [API Odonto POST] ERRO AO REALIZAR ROLLBACK: {rb_err} ---") # Log Erro 6
        # Retorna JSON de erro, NÃO HTML
        return jsonify({"erro": f"Erro interno ao salvar: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
            print("--- [API Odonto POST] Cursor da transação fechado. ---") # Log Final


@app.route('/api/odontograma/tratamentos/<int:tratamento_id>', methods=['DELETE'])
def delete_tratamento(tratamento_id):
    print(f"\n--- [API Odonto DELETE] Iniciando requisição para ID: {tratamento_id} ---") # Log D1
    if not session.get('logado'):
        print("--- [API Odonto DELETE] ERRO: Não autorizado ---")
        return jsonify({"erro": "Não autorizado"}), 401
    cur = None
    try:
        cur = mysql.connection.cursor()
        print("--- [API Odonto DELETE] Iniciando transação BD ---") # Log D2

        # Opcional: Excluir financeiro associado
        sql_fin_del = "DELETE FROM financeiro WHERE tratamento_id = %s"
        params_fin_del = (tratamento_id,)
        print(f"--- [API Odonto DELETE] Executando SQL Delete Financeiro: {sql_fin_del} com params {params_fin_del} ---") # Log D3
        cur.execute(sql_fin_del, params_fin_del)
        print(f"--- [API Odonto DELETE] Delete Financeiro executado (rowcount: {cur.rowcount}). ---") # Log D4

        # Excluir tratamento principal
        sql_trat_del = "DELETE FROM odontograma_tratamentos WHERE id = %s"
        params_trat_del = (tratamento_id,)
        print(f"--- [API Odonto DELETE] Executando SQL Delete Tratamento: {sql_trat_del} com params {params_trat_del} ---") # Log D5
        cur.execute(sql_trat_del, params_trat_del)
        trat_rowcount = cur.rowcount # Guarda o rowcount da exclusão principal
        print(f"--- [API Odonto DELETE] Delete Tratamento executado (rowcount: {trat_rowcount}). ---") # Log D6

        if trat_rowcount == 0:
             print("--- [API Odonto DELETE] ERRO: Tratamento não encontrado para excluir. Realizando Rollback... ---") # Log D7
             mysql.connection.rollback()
             return jsonify({"erro": "Tratamento não encontrado"}), 404

        # COMMIT
        print("--- [API Odonto DELETE] Tentando realizar commit... ---") # Log D8
        mysql.connection.commit()
        print("--- [API Odonto DELETE] Commit realizado com sucesso. Retornando 204. ---") # Log D9
        return '', 204 # Sucesso

    except Exception as e:
        print("\n" + "="*10 + f" !!! ERRO DURANTE DELETE !!! " + "="*10) # Log Erro D1
        print(f"--- [API Odonto DELETE] Erro na transação: {e} ---") # Log Erro D2
        traceback.print_exc() # Log Erro D3
        if mysql.connection:
            print("--- [API Odonto DELETE] Realizando Rollback... ---") # Log Erro D4
            try:
                mysql.connection.rollback()
                print("--- [API Odonto DELETE] Rollback realizado. ---") # Log Erro D5
            except Exception as rb_err:
                print(f"--- [API Odonto DELETE] ERRO AO REALIZAR ROLLBACK: {rb_err} ---") # Log Erro D6
        # Retorna JSON de erro, NÃO HTML
        return jsonify({"erro": f"Erro interno ao excluir: {str(e)}"}), 500
    finally:
        if cur:
            cur.close()
            print("--- [API Odonto DELETE] Cursor da transação fechado. ---") # Log Final D

# PUT: Atualizar o status de um tratamento (NOVA ROTA)
@app.route('/api/odontograma/tratamentos/<int:tratamento_id>/status', methods=['PUT'])
def update_tratamento_status(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    cur = None
    try:
        dados = request.json
        if dados is None or 'concluido' not in dados:
            return jsonify({"erro": "Status 'concluido' (booleano) é obrigatório no corpo da requisição."}), 400

        novo_status = bool(dados.get('concluido'))

        cur = mysql.connection.cursor()

        # Verifica se o tratamento existe
        cur.execute("SELECT id FROM odontograma_tratamentos WHERE id = %s", (tratamento_id,))
        if not cur.fetchone():
            return jsonify({"erro": "Tratamento não encontrado"}), 404

        # Atualiza o status
        cur.execute("""
            UPDATE odontograma_tratamentos
            SET concluido = %s
            WHERE id = %s
        """, (novo_status, tratamento_id))
        mysql.connection.commit()

        return jsonify({"id": tratamento_id, "concluido": novo_status, "mensagem": "Status do tratamento atualizado com sucesso!"}), 200

    except Exception as e:
        if mysql.connection: mysql.connection.rollback()
        print(f"Erro API PUT /tratamentos/{tratamento_id}/status: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao atualizar status: {str(e)}"}), 500
    finally:
        if cur: cur.close()


# --- Fim dos Endpoints da API ---

# MOVIDO PARA CÁ!
@app.route('/agendamentos', methods=['GET'])
def agendamentos():
    if not session.get('logado'): return redirect(url_for('login'))
    filtro_paciente = request.args.get('paciente', ''); filtro_data = request.args.get('data', '')
    filtro_status = request.args.get('status', '')
    cur = None; agendamentos_data = []
    try:
        cur = mysql.connection.cursor()
        # Query base - ADICIONADO p.id AS paciente_id
        query = """
            SELECT a.id, p.nome, a.servico, a.data,
                   TIME_FORMAT(a.hora, '%%H:%%i') AS hora_formatada,
                   a.status, a.observacoes,
                   p.id AS paciente_id  -- <<< ADICIONADO ESTA LINHA
            FROM agendamentos a
            JOIN pacientes p ON a.paciente_id = p.id
        """
        valores = []; where_clauses = []
        if filtro_paciente: where_clauses.append("p.nome LIKE %s"); valores.append('%' + filtro_paciente + '%')
        if filtro_data: where_clauses.append("a.data = %s"); valores.append(filtro_data)
        if filtro_status: where_clauses.append("a.status = %s"); valores.append(filtro_status)
        if where_clauses: query += " WHERE " + " AND ".join(where_clauses)
        query += " ORDER BY a.data DESC, a.hora ASC"

        # print("Query Agendamentos:", query) # Para debug
        # print("Valores:", valores)          # Para debug

        cur.execute(query, valores)
        columns = [col[0] for col in cur.description]
        agendamentos_data = [dict(zip(columns, row)) for row in cur.fetchall()]
        for ag in agendamentos_data:
            if ag.get('data'): ag['data_formatada'] = ag['data'].strftime('%d/%m/%Y')
            else: ag['data_formatada'] = 'N/A'
            # Verifica se hora_formatada é None (caso a hora no DB seja NULL)
            if ag.get('hora_formatada') is None:
                ag['hora_formatada'] = 'N/A' # Ou outra string padrão

    except Exception as e:
        print(f"Erro ao buscar agendamentos: {e}"); traceback.print_exc()
        flash("Erro ao carregar lista de agendamentos.", "danger")
    finally:
        if cur: cur.close()

    # print("Dados enviados para agendamentos.html:", agendamentos_data) # Debug
    return render_template('agendamentos.html',
                           agendamentos_lista=agendamentos_data,
                           filtros=request.args)


@app.route('/exportar_excel')
def exportar_excel():
    # Adicione verificação de login se necessário
    if not session.get('logado'):
        flash("Faça login para exportar.", "warning")
        return redirect(url_for('login'))

    cur = None
    try:
        cur = mysql.connection.cursor()
        # Adapte a query para buscar os dados que você quer exportar
        cur.execute("""
            SELECT a.data, TIME_FORMAT(a.hora, '%H:%i'), a.status, a.servico, p.nome
            FROM agendamentos a
            JOIN pacientes p ON a.paciente_id = p.id
            ORDER BY a.data, a.hora
        """)
        dados = cur.fetchall()

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True}) # Use in_memory
        worksheet = workbook.add_worksheet()

        # Cabeçalhos
        headers = ['Data', 'Hora', 'Status', 'Serviço', 'Paciente']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)

        # Dados
        for row_idx, row in enumerate(dados, start=1):
            for col_idx, valor in enumerate(row):
                # Converte datas/horas para string se necessário
                worksheet.write(row_idx, col_idx, str(valor))

        workbook.close()
        output.seek(0)

        return send_file(output,
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         download_name='agendamentos.xlsx',
                         as_attachment=True)
    except Exception as e:
        print(f"Erro ao exportar Excel: {e}")
        traceback.print_exc()
        flash("Erro ao gerar arquivo Excel.", "danger")
        # Redireciona de volta para a página de onde veio (ex: agendamentos)
        # Use request.referrer ou uma rota específica
        return redirect(url_for('agendamentos')) # Ou outra rota apropriada
    finally:
        if cur:
            cur.close()


@app.route('/exportar_pdf')
def exportar_pdf():
    # Adicione verificação de login se necessário
    if not session.get('logado'):
        flash("Faça login para exportar.", "warning")
        return redirect(url_for('login'))

    cur = None
    try:
        cur = mysql.connection.cursor()
        # Adapte a query para buscar os dados que você quer exportar
        cur.execute("""
            SELECT a.data, TIME_FORMAT(a.hora, '%H:%i'), a.status, a.servico, p.nome
            FROM agendamentos a
            JOIN pacientes p ON a.paciente_id = p.id
            ORDER BY a.data, a.hora
        """)
        dados_db = cur.fetchall()

        buffer = io.BytesIO()
        # Cria o documento PDF
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                                leftMargin=0.75*inch, rightMargin=0.75*inch,
                                topMargin=1*inch, bottomMargin=1*inch)
        styles = getSampleStyleSheet()
        story = []

        # Título
        story.append(Paragraph("Relatório de Agendamentos", styles['h1']))
        story.append(Spacer(1, 0.2*inch))

        # Prepara dados para a tabela
        # Cabeçalho
        header = ['Data', 'Hora', 'Status', 'Serviço', 'Paciente']
        # Converte dados do banco para lista de listas de strings
        data_table = [header] + [[str(item) for item in row] for row in dados_db]

        # Cria a tabela
        table = Table(data_table, colWidths=[1.2*inch, 0.8*inch, 1*inch, 2.5*inch, 2*inch]) # Ajuste as larguras

        # Estilo da tabela
        style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
            ('ALIGN', (4,1), (4,-1), 'LEFT'), # Alinha nome do paciente à esquerda
        ])
        table.setStyle(style)

        story.append(table)
        doc.build(story) # Constrói o PDF

        buffer.seek(0)
        return send_file(buffer,
                         mimetype='application/pdf',
                         download_name='agendamentos.pdf',
                         as_attachment=True)
    except Exception as e:
        print(f"Erro ao exportar PDF: {e}")
        traceback.print_exc()
        flash("Erro ao gerar arquivo PDF.", "danger")
        # Redireciona de volta para a página de onde veio
        return redirect(url_for('agendamentos')) # Ou outra rota apropriada
    finally:
        if cur:
            cur.close()

# --- Rota para Detalhes do Paciente ---
@app.route('/paciente/<int:paciente_id>')
def detalhes_paciente(paciente_id):
    print(f"\n--- [Detalhes Paciente {paciente_id}] Iniciando Rota ---")
    if not session.get('logado'):
        print(f"--- [Detalhes Paciente {paciente_id}] ERRO: Não logado ---")
        return redirect(url_for('login'))

    cur = None
    try:
        print(f"--- [Detalhes Paciente {paciente_id}] Abrindo cursor BD ---")
        cur = mysql.connection.cursor()
        print(f"--- [Detalhes Paciente {paciente_id}] Tipo do cursor: {type(cur)} ---")

        # 1. Buscar paciente e converter para dict
        print(f"--- [Detalhes Paciente {paciente_id}] Buscando dados do paciente... ---")
        sql_paciente = "SELECT * FROM pacientes WHERE id = %s"
        cur.execute(sql_paciente, (paciente_id,))
        paciente_tuple = cur.fetchone()
        print(f"--- [Detalhes Paciente {paciente_id}] Tipo retornado por fetchone: {type(paciente_tuple)} ---")
        if not paciente_tuple:
            print(f"--- [Detalhes Paciente {paciente_id}] ERRO: Paciente não encontrado ---")
            flash('Paciente não encontrado.', 'danger'); return redirect(url_for('pacientes'))
        paciente_cols = [col[0] for col in cur.description]
        paciente = dict(zip(paciente_cols, paciente_tuple))
        print(f"--- [Detalhes Paciente {paciente_id}] Paciente encontrado: {paciente.get('nome')}. Formatando... ---")
        paciente_fmt = format_for_json(paciente.copy())
        print(f"--- [Detalhes Paciente {paciente_id}] Paciente formatado. ---")

        # 2. Buscar tratamentos e converter para lista de dicts
        print(f"--- [Detalhes Paciente {paciente_id}] Buscando tratamentos... ---")
        sql_tratamentos = """
            SELECT id, dente_numero, tipo_tratamento, data_tratamento, observacoes, valor, concluido
            FROM odontograma_tratamentos WHERE paciente_id = %s
            ORDER BY data_tratamento DESC -- , data_criacao DESC -- Verifique se data_criacao existe
        """
        cur.execute(sql_tratamentos, (paciente_id,))
        tratamentos_cols = [col[0] for col in cur.description] # Pega nomes das colunas
        tratamentos_tuples = cur.fetchall() # Pega tuplas
        # Converte lista de tuplas para lista de dicionários
        tratamentos_raw_dicts = [dict(zip(tratamentos_cols, row)) for row in tratamentos_tuples]
        print(f"--- [Detalhes Paciente {paciente_id}] {len(tratamentos_raw_dicts)} tratamentos encontrados. Formatando... ---")
        tratamentos = format_for_json(tratamentos_raw_dicts) # Formata a lista de dicionários
        print(f"--- [Detalhes Paciente {paciente_id}] Tratamentos formatados. ---")

        # 3. Buscar financeiro e converter para lista de dicts
        print(f"--- [Detalhes Paciente {paciente_id}] Buscando financeiro... ---")
        sql_financeiro = """
            SELECT id, descricao, valor, status, data_vencimento, data_pagamento, tratamento_id
            FROM financeiro WHERE paciente_id = %s ORDER BY data_vencimento DESC
        """
        cur.execute(sql_financeiro, (paciente_id,))
        financeiro_cols = [col[0] for col in cur.description] # Pega nomes das colunas
        financeiro_tuples = cur.fetchall() # Pega tuplas
        # Converte lista de tuplas para lista de dicionários
        financeiro_raw_dicts = [dict(zip(financeiro_cols, row)) for row in financeiro_tuples]
        print(f"--- [Detalhes Paciente {paciente_id}] {len(financeiro_raw_dicts)} lançamentos financeiros encontrados. Formatando... ---")
        financeiro_lista = format_for_json(financeiro_raw_dicts) # Formata a lista de dicionários
        print(f"--- [Detalhes Paciente {paciente_id}] Financeiro formatado. ---")

        # 4. Buscar agendamentos futuros e converter para lista de dicts
        print(f"--- [Detalhes Paciente {paciente_id}] Buscando agendamentos futuros... ---")
        sql_agendamentos = """
            SELECT id, servico, data, TIME_FORMAT(hora, '%%H:%%i') as hora_f, status
            FROM agendamentos WHERE paciente_id = %s AND data >= CURDATE()
            ORDER BY data ASC, hora ASC
        """
        cur.execute(sql_agendamentos, (paciente_id,))
        agendamentos_cols = [col[0] for col in cur.description] # Pega nomes das colunas
        agendamentos_tuples = cur.fetchall() # Pega tuplas
        # Converte lista de tuplas para lista de dicionários
        agendamentos_raw_dicts = [dict(zip(agendamentos_cols, row)) for row in agendamentos_tuples]
        print(f"--- [Detalhes Paciente {paciente_id}] {len(agendamentos_raw_dicts)} agendamentos futuros encontrados. Formatando... ---")
        agendamentos_futuros = format_for_json(agendamentos_raw_dicts) # Formata a lista de dicionários
        print(f"--- [Detalhes Paciente {paciente_id}] Agendamentos futuros formatados. ---")

        # LOG CRUCIAL: Imprime a estrutura final de 'tratamentos'
        print(f"--- [Detalhes Paciente {paciente_id}] DADOS FINAIS PARA TEMPLATE ---")
        print("Paciente:", paciente_fmt)
        print("Tratamentos:", tratamentos) # <<< VERIFIQUE A SAÍDA DESTE PRINT
        print("Financeiro:", financeiro_lista)
        print("Agendamentos:", agendamentos_futuros)
        print(f"--- [Detalhes Paciente {paciente_id}] Renderizando template... ---") # Log 15

        return render_template('detalhes_paciente.html', paciente=paciente_fmt, tratamentos=tratamentos,
                               financeiro_lista=financeiro_lista, agendamentos_futuros=agendamentos_futuros)

    except Exception as e:
        # Log detalhado do erro
        print("\n" + "="*10 + f" !!! ERRO ROTA /paciente/{paciente_id} !!! " + "="*10)
        print(f"--- [Detalhes Paciente {paciente_id}] Exceção capturada: {e} ---")
        traceback.print_exc()
        print("="*30)
        flash('Erro ao carregar detalhes do paciente.', 'danger')
        return redirect(url_for('pacientes'))
    finally:
        if cur:
            cur.close()
            print(f"--- [Detalhes Paciente {paciente_id}] Cursor fechado. ---")






# ... (outras rotas)

@app.route('/editar_agendamento/<int:id>', methods=['GET', 'POST'])
def editar_agendamento(id):
    if not session.get('logado'):
        return redirect(url_for('login'))

    cur = None
    try:
        cur = mysql.connection.cursor()

        if request.method == 'POST':
            # Pega dados do formulário
            paciente_id = request.form.get('paciente_id')
            servico = request.form.get('servico')
            data = request.form.get('data')
            hora = request.form.get('hora')
            status = request.form.get('status') # Pega o novo status
            observacoes = request.form.get('observacoes', '')

            # Validação básica
            if not all([paciente_id, servico, data, hora, status]):
                flash('Preencha todos os campos obrigatórios.', 'warning')
                # Recarrega a página com os dados atuais (precisa buscar novamente)
                # Para simplificar, vamos apenas redirecionar de volta para a lista em caso de erro aqui
                # Uma solução melhor seria passar os dados do form de volta
                return redirect(url_for('editar_agendamento', id=id))
            else:
                # Atualiza o agendamento no banco
                cur.execute("""
                    UPDATE agendamentos
                    SET paciente_id = %s, servico = %s, data = %s, hora = %s, status = %s, observacoes = %s
                    WHERE id = %s
                """, (paciente_id, servico, data, hora, status, observacoes, id))
                mysql.connection.commit()
                flash('Agendamento atualizado com sucesso!', 'success')
                return redirect(url_for('agendamentos')) # Volta para a lista

        # --- Lógica para GET ---
        # Busca o agendamento específico
        cur.execute("""
            SELECT a.id, a.paciente_id, a.servico, a.data, a.hora, a.status, a.observacoes, p.nome as nome_paciente
            FROM agendamentos a
            JOIN pacientes p ON a.paciente_id = p.id
            WHERE a.id = %s
        """, (id,))
        agendamento_tuple = cur.fetchone()

        if not agendamento_tuple:
            flash('Agendamento não encontrado.', 'danger')
            return redirect(url_for('agendamentos'))

        # Converte para dicionário
        agendamento_cols = [col[0] for col in cur.description]
        agendamento = dict(zip(agendamento_cols, agendamento_tuple))

        # Formata data e hora para os inputs do formulário
        if agendamento.get('data'):
            agendamento['data_form'] = agendamento['data'].strftime('%Y-%m-%d')
        if agendamento.get('hora'):
             # Verifica se hora é timedelta ou time e formata
             if isinstance(agendamento['hora'], timedelta):
                 # Converte timedelta para string HH:MM
                 total_seconds = int(agendamento['hora'].total_seconds())
                 hours, remainder = divmod(total_seconds, 3600)
                 minutes, seconds = divmod(remainder, 60)
                 agendamento['hora_form'] = f"{hours:02}:{minutes:02}"
             elif isinstance(agendamento['hora'], datetime.time): # Se for objeto time
                 agendamento['hora_form'] = agendamento['hora'].strftime('%H:%M')
             else: # Fallback se for string ou outro tipo
                 agendamento['hora_form'] = str(agendamento['hora'])


        # Busca todos os pacientes para o dropdown
        cur.execute("SELECT id, nome FROM pacientes ORDER BY nome ASC")
        pacientes_lista = cur.fetchall()

        # Lista de status possíveis
        status_possiveis = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu'] # Adicione outros se usar

        return render_template('editar_agendamento.html',
                               agendamento=agendamento,
                               pacientes=pacientes_lista,
                               status_lista=status_possiveis)

    except Exception as e:
        if request.method == 'POST' and mysql.connection:
            mysql.connection.rollback()
        print(f"Erro em /editar_agendamento/{id}: {e}")
        traceback.print_exc()
        flash(f'Erro ao processar edição do agendamento: {str(e)}', 'danger')
        return redirect(url_for('agendamentos'))
    finally:
        if cur:
            cur.close()

# --- Fim da rota editar_agendamento ---


# Rota genérica para atualizar status (mais flexível)
@app.route('/agendamento/<int:id>/status', methods=['POST'])
def atualizar_status_agendamento(id):
    if not session.get('logado'):
        # Poderia retornar um erro JSON se chamado por JS, mas aqui redireciona
        flash("Acesso não autorizado.", "danger")
        return redirect(url_for('login'))

    novo_status = request.form.get('novo_status') # Espera 'novo_status' do formulário
    status_validos = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu'] # Lista de status permitidos

    if not novo_status or novo_status not in status_validos:
        flash("Status inválido fornecido.", "warning")
        return redirect(request.referrer or url_for('agendamentos')) # Volta para onde veio

    cur = None
    try:
        cur = mysql.connection.cursor()
        # Verifica se agendamento existe antes de atualizar
        cur.execute("SELECT id FROM agendamentos WHERE id = %s", (id,))
        if not cur.fetchone():
            flash("Agendamento não encontrado.", "danger")
            return redirect(url_for('agendamentos'))

        # Atualiza o status
        cur.execute("UPDATE agendamentos SET status = %s WHERE id = %s", (novo_status, id))
        mysql.connection.commit()
        flash(f"Status do agendamento atualizado para '{novo_status}'.", "success")

    except Exception as e:
        if mysql.connection: mysql.connection.rollback()
        print(f"Erro ao atualizar status do agendamento {id}: {e}")
        traceback.print_exc()
        flash("Erro ao atualizar status do agendamento.", "danger")
    finally:
        if cur:
            cur.close()

    return redirect(request.referrer or url_for('agendamentos')) # Volta para a página anterior

# --- Fim das rotas de status ---


# --- ROTAS DO PORTAL DO PACIENTE ---

@app.route('/portal/login', methods=['GET', 'POST'])
def portal_login():
    """Página e lógica de login para o paciente (usando CPF como senha)."""
    if request.method == 'POST':
        cpf_input = request.form.get('cpf')
        password_input = request.form.get('password') # O que foi digitado no campo senha
        cur = None

        if not cpf_input or not password_input:
            flash('CPF e Senha (repita o CPF) são obrigatórios.', 'warning')
            return redirect(url_for('portal_login'))

        # Limpa o CPF digitado no campo CPF
        cpf_limpo = ''.join(filter(str.isdigit, cpf_input))
        # Limpa o que foi digitado no campo Senha (espera-se que seja o CPF)
        senha_limpa = ''.join(filter(str.isdigit, password_input))

        if not cpf_limpo: # Verifica se o CPF é válido após limpar
             flash('CPF inválido.', 'danger')
             return redirect(url_for('portal_login'))

        try:
            cur = mysql.connection.cursor()
            print(f"--- [Portal Login] Tipo do cursor: {type(cur)} ---") # Log para verificar cursor

            # --- QUERY (Mesma de antes) ---
            sql_query = """
                SELECT id, nome, cpf
                FROM pacientes
                WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = %s
            """
            cur.execute(sql_query, (cpf_limpo,))
            paciente_tuple = cur.fetchone() # Pega como tupla (ou dict)
            print(f"--- [Portal Login] Tipo retornado por fetchone: {type(paciente_tuple)} ---") # Log tipo retornado

            # --- LÓGICA DE VERIFICAÇÃO COM CONVERSÃO ---
            if paciente_tuple is None:
                # CASO 1: Paciente NÃO encontrado pelo CPF
                print(f"--- [Portal Login] Paciente com CPF limpo {cpf_limpo} não encontrado. ---")
                flash('CPF ou Senha inválidos.', 'danger')
                return redirect(url_for('portal_login'))
            else:
                # CASO 2: Paciente ENCONTRADO, converte para dict e verifica a "senha"
                # *** INÍCIO DA CONVERSÃO MANUAL ***
                paciente_cols = [col[0] for col in cur.description]
                paciente = dict(zip(paciente_cols, paciente_tuple))
                # *** FIM DA CONVERSÃO MANUAL ***

                print(f"--- [Portal Login] Paciente encontrado: ID {paciente['id']}. Verificando senha... ---") # Agora 'paciente' é um dict
                if cpf_limpo == senha_limpa:
                    # CASO 2.1: Senha (CPF) CORRETA - Login bem-sucedido
                    print(f"--- [Portal Login] Senha correta para paciente ID {paciente['id']}. Criando sessão... ---")
                    session.permanent = True
                    session['paciente_logado'] = True
                    session['paciente_id'] = paciente['id'] # Acesso seguro
                    session['paciente_nome'] = paciente['nome'] # Acesso seguro
                    flash(f"Bem-vindo(a), {paciente['nome']}!", 'success')
                    return redirect(url_for('portal_home'))
                else:
                    # CASO 2.2: Senha (CPF) INCORRETA
                    print(f"--- [Portal Login] Senha incorreta para paciente ID {paciente['id']}. ---")
                    flash('CPF ou Senha inválidos.', 'danger')
                    return redirect(url_for('portal_login'))
            # --- FIM DA LÓGICA DE VERIFICAÇÃO ---

        except Exception as e:
            flash(f"Erro durante o login: {e}", "danger")
            traceback.print_exc()
            return redirect(url_for('portal_login'))
        finally:
            if cur:
                cur.close()
                print("--- [Portal Login] Cursor fechado. ---")

    return render_template('portal_login.html')



# Crie esta rota se ainda não existir, para onde o login redireciona
# --- Rota /portal/home (Exemplo Básico) ---
# Crie esta rota se ainda não existir, para onde o login redireciona
@app.route('/portal/home')
def portal_home():
    # Verifica se o paciente está logado
    if not session.get('paciente_logado'):
        flash("Faça login para acessar o portal.", "warning")
        return redirect(url_for('portal_login'))

    # Pega o ID do paciente da sessão
    paciente_id = session.get('paciente_id')
    if not paciente_id:
        # Se não encontrar o ID na sessão, desloga por segurança
        flash("Sua sessão expirou ou é inválida. Faça login novamente.", "warning")
        session.pop('paciente_logado', None)
        session.pop('paciente_id', None)
        session.pop('paciente_nome', None)
        return redirect(url_for('portal_login'))

    paciente_nome = session.get('paciente_nome', 'Paciente')
    cur = None
    tratamentos = []
    financeiro_lista = []
    agendamentos_futuros = []

    try:
        print(f"--- [Portal Home] Buscando dados para paciente ID: {paciente_id} ---")
        cur = mysql.connection.cursor() # Assume DictCursor ou faremos conversão

        # 1. Buscar tratamentos (odontograma_tratamentos)
        print("--- [Portal Home] Buscando tratamentos... ---")
        sql_tratamentos = """
            SELECT id, dente_numero, tipo_tratamento, data_tratamento, observacoes, valor, concluido
            FROM odontograma_tratamentos WHERE paciente_id = %s
            ORDER BY data_tratamento DESC, data_criacao DESC
        """
        cur.execute(sql_tratamentos, (paciente_id,))
        tratamentos_cols = [col[0] for col in cur.description]
        tratamentos_tuples = cur.fetchall()
        tratamentos_raw_dicts = [dict(zip(tratamentos_cols, row)) for row in tratamentos_tuples]
        tratamentos = format_for_json(tratamentos_raw_dicts)
        print(f"--- [Portal Home] {len(tratamentos)} tratamentos encontrados. ---")

        # 2. Buscar financeiro
        print("--- [Portal Home] Buscando financeiro... ---")
        sql_financeiro = """
            SELECT id, descricao, valor, status, data_vencimento, data_pagamento, tratamento_id
            FROM financeiro WHERE paciente_id = %s ORDER BY data_vencimento DESC
        """
        cur.execute(sql_financeiro, (paciente_id,))
        financeiro_cols = [col[0] for col in cur.description]
        financeiro_tuples = cur.fetchall()
        financeiro_raw_dicts = [dict(zip(financeiro_cols, row)) for row in financeiro_tuples]
        financeiro_lista = format_for_json(financeiro_raw_dicts)
        print(f"--- [Portal Home] {len(financeiro_lista)} lançamentos financeiros encontrados. ---")

        # 3. Buscar agendamentos futuros
        print("--- [Portal Home] Buscando agendamentos futuros... ---")
        sql_agendamentos = """
            SELECT id, servico, data, TIME_FORMAT(hora, '%%H:%%i') as hora_f, status
            FROM agendamentos WHERE paciente_id = %s AND data >= CURDATE()
            ORDER BY data ASC, hora ASC
        """
        cur.execute(sql_agendamentos, (paciente_id,))
        agendamentos_cols = [col[0] for col in cur.description]
        agendamentos_tuples = cur.fetchall()
        agendamentos_raw_dicts = [dict(zip(agendamentos_cols, row)) for row in agendamentos_tuples]
        agendamentos_futuros = format_for_json(agendamentos_raw_dicts)
        print(f"--- [Portal Home] {len(agendamentos_futuros)} agendamentos futuros encontrados. ---")


        # 4. Buscar Documentos <<< NOVA BUSCA
        print("--- [Portal Home] Buscando documentos... ---")
        sql_documentos = """
            SELECT id, tipo_documento, data_geracao, nome_arquivo, descricao
            FROM documentos_paciente
            WHERE paciente_id = %s
            ORDER BY data_geracao DESC
        """
        cur.execute(sql_documentos, (paciente_id,))
        documentos_cols = [col[0] for col in cur.description]
        documentos_tuples = cur.fetchall()
        documentos_raw_dicts = [dict(zip(documentos_cols, row)) for row in documentos_tuples]
        documentos_lista = format_for_json(documentos_raw_dicts) # Formata data_geracao
        print(f"--- [Portal Home] {len(documentos_lista)} documentos encontrados. ---")

    except Exception as e:
        print(f"--- [Portal Home] ERRO ao buscar dados para paciente {paciente_id}: {e} ---")
        traceback.print_exc()
        flash("Erro ao carregar suas informações.", "danger")
        # Não redireciona, apenas mostra a página com erro (ou dados vazios)
    finally:
        if cur:
            cur.close()
            print(f"--- [Portal Home] Cursor fechado para paciente {paciente_id}. ---")

    # Renderiza o template passando os dados buscados
    return render_template('portal_home.html',
                           nome_paciente=paciente_nome,
                           tratamentos=tratamentos,
                           financeiro_lista=financeiro_lista,
                           agendamentos_futuros=agendamentos_futuros,
                            documentos_lista=documentos_lista)


# --- Rota para Download de Documento do Paciente ---
@app.route('/portal/documento/<int:doc_id>/download')
def download_documento(doc_id):
    # 1. Verifica se o PACIENTE está logado
    if not session.get('paciente_logado'):
        flash("Faça login para baixar documentos.", "warning")
        return redirect(url_for('portal_login'))

    paciente_id = session.get('paciente_id')
    if not paciente_id:
        flash("Sessão inválida.", "warning")
        return redirect(url_for('portal_login'))

    cur = None
    try:
        cur = mysql.connection.cursor() # Assume DictCursor

        # 2. Busca o documento E VERIFICA SE PERTENCE AO PACIENTE LOGADO
        print(f"--- [Download Doc] Buscando doc ID {doc_id} para paciente ID {paciente_id} ---")
        cur.execute("""
            SELECT nome_arquivo, caminho_relativo
            FROM documentos_paciente
            WHERE id = %s AND paciente_id = %s
        """, (doc_id, paciente_id))
        documento = cur.fetchone()

        if not documento:
            print(f"--- [Download Doc] ERRO: Documento {doc_id} não encontrado ou não pertence ao paciente {paciente_id} ---")
            flash("Documento não encontrado ou acesso não permitido.", "danger")
            return redirect(url_for('portal_home')) # Volta para a home do portal

        # 3. Envia o arquivo usando send_from_directory (mais seguro)
        nome_arquivo = documento['nome_arquivo']
        # Usa o caminho base da aplicação + caminho relativo salvo no BD
        diretorio_base = app.config['UPLOAD_FOLDER']

        print(f"--- [Download Doc] Enviando arquivo: {nome_arquivo} do diretório: {diretorio_base} ---")
        return send_from_directory(
            directory=diretorio_base,
            path=nome_arquivo, # Nome do arquivo a ser enviado
            as_attachment=True # Força o download com o nome original
        )

    except Exception as e:
        print(f"Erro ao baixar documento {doc_id} para paciente {paciente_id}: {e}"); traceback.print_exc()
        flash("Erro ao tentar baixar o documento.", "danger")
        return redirect(url_for('portal_home'))
    finally:
        if cur: cur.close()



# --- FIM DAS ROTAS DO PORTAL DO PACIENTE ---

@app.route('/portal/logout')
def portal_logout():
    """Faz o logout do paciente limpando as chaves da sessão."""
    # Remove chaves específicas da sessão do paciente
    session.pop('paciente_logado', None)
    session.pop('paciente_id', None)
    session.pop('paciente_nome', None)
    flash('Você saiu do portal.', 'info')
    return redirect(url_for('portal_login')) # Redireciona para o login do portal

# --- FIM DAS ROTAS DO PORTAL DO PACIENTE (INICIAL) ---

# --- INTEGRAÇÃO MERCADO PAGO ---
@app.route('/api/checkout/mercadopago/preference', methods=['POST'])
def create_mercadopago_preference():
    try:
        mp_access_token = os.getenv('MP_ACCESS_TOKEN')
        if not mp_access_token:
            return jsonify({"error": "MP_ACCESS_TOKEN não configurado no servidor"}), 500

        body = request.get_json(silent=True) or {}
        title = body.get('title', 'Sisdental - Assinatura do Plano')
        quantity = int(body.get('quantity', 1))
        unit_price = float(body.get('unit_price', 0.0))
        currency_id = body.get('currency_id', 'BRL')
        external_reference = body.get('external_reference')

        origin = body.get('origin') or request.host_url.rstrip('/')
        success_url = body.get('back_urls', {}).get('success') or f"{origin}/cadastro/retorno"
        failure_url = body.get('back_urls', {}).get('failure') or f"{origin}/cadastro/retorno"
        pending_url = body.get('back_urls', {}).get('pending') or f"{origin}/cadastro/retorno"

        payload = {
            "items": [
                {
                    "title": title,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "currency_id": currency_id,
                }
            ],
            "back_urls": {
                "success": success_url,
                "failure": failure_url,
                "pending": pending_url,
            },
            "auto_return": "approved",
        }
        if external_reference:
            payload["external_reference"] = external_reference
        if isinstance(body.get('metadata'), dict):
            payload["metadata"] = body["metadata"]

        headers = {
            "Authorization": f"Bearer {mp_access_token}",
            "Content-Type": "application/json",
        }

        resp = requests.post(
            "https://api.mercadopago.com/checkout/preferences",
            json=payload,
            headers=headers,
            timeout=30,
        )
        try:
            data = resp.json()
        except Exception:
            data = {"error": "Resposta inválida do Mercado Pago", "text": resp.text}

        if resp.status_code >= 400:
            return jsonify({"error": "Falha ao criar preferência", "details": data}), resp.status_code

        return jsonify({
            "id": data.get("id"),
            "init_point": data.get("init_point"),
            "sandbox_init_point": data.get("sandbox_init_point"),
        })
    except Exception as e:
        return jsonify({"error": "Exceção ao criar preferência", "details": str(e)}), 500
# --- FIM INTEGRAÇÃO MERCADO PAGO ---

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5020, debug=True) # Mantenha debug=True durante o desenvolvimento
