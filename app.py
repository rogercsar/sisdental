from flask import Flask, render_template, request, redirect, flash, url_for, session, jsonify # Adicionado jsonify
try:
    from flask_mysqldb import MySQL
except Exception:
    MySQL = None
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
from supabase import create_client, Client

# Carrega variáveis de ambiente do arquivo .env (se existir) sem dependências externas
def _load_env(path=None):
    try:
        env_path = path or os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        os.environ.setdefault(k, v)
    except Exception:
        # Evita falhar caso .env não exista ou haja erro de leitura
        pass

_load_env()

# Supabase client (Service Role para escritas no backend)
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
_supabase_client = None

def get_supabase():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        return _supabase_client
    except Exception:
        return None

# Cliente público para operações de Auth (login)
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
_supabase_public = None

def get_supabase_public():
    global _supabase_public
    if _supabase_public is not None:
        return _supabase_public
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None
    try:
        _supabase_public = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        return _supabase_public
    except Exception:
        return None

app = Flask(__name__)
app.secret_key = 'chave_top_secreta'
app.permanent_session_lifetime = timedelta(days=1)

# Configuração do MySQL
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Admin@147!'
app.config['MYSQL_DB'] = 'sisdental'
app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'documentos_storage') # Define o caminho completo
mysql = MySQL(app) if MySQL else None

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

    try:
        sb = get_supabase()
        if sb is None:
            print("--- [Gerar Atestado] ERRO: Supabase não configurado ---")
            flash("Configuração do Supabase ausente.", "danger"); return redirect(url_for('pacientes'))

        # Busca paciente via Supabase
        print("--- [Gerar Atestado] Buscando paciente (Supabase)... ---")
        res = sb.table('pacientes').select('id, nome').eq('id', paciente_id).limit(1).execute()
        rows = getattr(res, 'data', None) if res is not None else None
        if not rows:
            print("--- [Gerar Atestado] ERRO: Paciente não encontrado (Supabase) ---")
            flash("Paciente não encontrado.", "danger"); return redirect(url_for('pacientes'))

        paciente = rows[0]
        nome_paciente = paciente.get('nome') or ''
        print(f"--- [Gerar Atestado] Paciente encontrado: {nome_paciente} ---")

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

        print(f"--- [Gerar Atestado] Enviando para Supabase Storage e registrando metadados... ---")
        descricao_doc = f"Atestado gerado em {data_atual_obj.strftime('%d/%m/%Y')}"

        # Caminho no bucket 'documentos' obedecendo às policies (pacientes/<id>/...)
        supabase_path = f"pacientes/{paciente_id}/{nome_arquivo}"
        try:
            # Upload do PDF ao Storage
            upload_res = sb.storage.from_("documentos").upload(supabase_path, pdf_content, {
                "contentType": "application/pdf"
            })
            print(f"--- [Gerar Atestado] Upload Storage: {upload_res} ---")
        except Exception as e_up:
            print(f"--- [Gerar Atestado] ERRO no upload para Storage: {e_up} ---")

        try:
            # Registro de metadados no Supabase
            meta_res = sb.table('documentos_paciente').insert({
                'paciente_id': paciente_id,
                'tipo_documento': 'atestado',
                'data_geracao': data_atual_obj.isoformat(),
                'nome_arquivo': nome_arquivo,
                'storage_path': supabase_path,
                'descricao': descricao_doc
            }).execute()
            print(f"--- [Gerar Atestado] Metadados inseridos: {getattr(meta_res, 'data', None)} ---")
        except Exception as e_meta:
            print(f"--- [Gerar Atestado] ERRO ao inserir metadados: {e_meta} ---")
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

    try:
        sb = get_supabase()
        if sb is None:
            print("--- [Gerar Receita] ERRO: Supabase não configurado ---")
            flash("Configuração do Supabase ausente.", "danger"); return redirect(url_for('pacientes'))

        # Busca paciente via Supabase
        print("--- [Gerar Receita] Buscando paciente (Supabase)... ---")
        res = sb.table('pacientes').select('id, nome').eq('id', paciente_id).limit(1).execute()
        rows = getattr(res, 'data', None) if res is not None else None
        if not rows:
            print("--- [Gerar Receita] ERRO: Paciente não encontrado (Supabase) ---")
            flash("Paciente não encontrado.", "danger"); return redirect(url_for('pacientes'))

        paciente = rows[0]
        nome_paciente = paciente.get('nome') or ''
        print(f"--- [Gerar Receita] Paciente encontrado: {nome_paciente} ---")

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

        print(f"--- [Gerar Receita] Enviando para Supabase Storage e registrando metadados... ---")
        descricao_doc = f"Receita gerada em {data_atual_obj.strftime('%d/%m/%Y')}"

        # Caminho no bucket 'documentos' obedecendo às policies (pacientes/<id>/...)
        supabase_path = f"pacientes/{paciente_id}/{nome_arquivo}"
        try:
            # Upload do PDF ao Storage
            upload_res = sb.storage.from_("documentos").upload(supabase_path, pdf_content, {
                "contentType": "application/pdf"
            })
            print(f"--- [Gerar Receita] Upload Storage: {upload_res} ---")
        except Exception as e_up:
            print(f"--- [Gerar Receita] ERRO no upload para Storage: {e_up} ---")

        try:
            # Registro de metadados no Supabase
            meta_res = sb.table('documentos_paciente').insert({
                'paciente_id': paciente_id,
                'tipo_documento': 'receita',
                'data_geracao': data_atual_obj.isoformat(),
                'nome_arquivo': nome_arquivo,
                'storage_path': supabase_path,
                'descricao': descricao_doc
            }).execute()
            print(f"--- [Gerar Receita] Metadados inseridos: {getattr(meta_res, 'data', None)} ---")
        except Exception as e_meta:
            print(f"--- [Gerar Receita] ERRO ao inserir metadados: {e_meta} ---")
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
        email = request.form['username']
        password = request.form['password']
        try:
            sb = get_supabase()
            if sb is None:
                flash('Configuração do Supabase ausente.', 'danger')
                return render_template('register.html')
            # Cria usuário no Supabase Auth (via Service Role Admin)
            try:
                res = sb.auth.admin.create_user({
                    'email': email,
                    'password': password,
                    'email_confirm': True
                })
                user = getattr(res, 'user', None)
                user_id = user.id if user else None
            except Exception as e_admin:
                flash(f'Erro ao criar usuário: {e_admin}', 'danger')
                return render_template('register.html')
            # Cria/atualiza profile com role staff
            if user_id:
                try:
                    sb.table('profiles').upsert({
                        'id': user_id,
                        'role': 'staff',
                        'full_name': email
                    }).execute()
                except Exception:
                    pass
            flash('Cadastro feito com sucesso! Faça login.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash(f"Erro durante o registro: {e}", "danger")
            return render_template('register.html')
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['username']
        password = request.form['password']
        try:
            pub = get_supabase_public()
            sb = get_supabase()
            if pub is None or sb is None:
                flash('Configuração do Supabase ausente.', 'danger')
                return render_template('login.html')
            # Faz login via Supabase Auth (cliente público)
            try:
                auth_res = pub.auth.sign_in_with_password({
                    'email': email,
                    'password': password
                })
                user = getattr(auth_res, 'user', None)
                user_id = user.id if user else None
            except Exception as e_auth:
                flash('Usuário ou senha inválidos.', 'danger')
                return render_template('login.html')
            # Busca perfil para role
            role = None; full_name = None
            try:
                prof_res = sb.table('profiles').select('id, role, full_name').eq('id', user_id).limit(1).execute()
                prof_rows = getattr(prof_res, 'data', None) or []
                if prof_rows:
                    role = prof_rows[0].get('role'); full_name = prof_rows[0].get('full_name')
            except Exception:
                pass
            session.permanent = True
            session['logado'] = True
            session['usuario'] = full_name or email
            session['usuario_id'] = user_id
            session['usuario_role'] = role
            flash('Login realizado com sucesso!', 'success')
            return redirect(url_for('home'))
        except Exception as e:
            flash(f"Erro durante o login: {e}", "danger")
    return render_template('login.html')

@app.route('/')
def home():
    if not session.get('logado'):
        return redirect(url_for('login'))

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
        data_nascimento = request.form['data_nascimento'] or None
        sb = get_supabase()
        try:
            payload = {
                'nome': nome,
                'cpf': cpf or None,
                'telefone': telefone or None,
                'email': email or None,
                'data_nascimento': data_nascimento
            }
            sb.table('pacientes').insert(payload).execute()
            flash('Paciente cadastrado com sucesso!', 'success')
            return redirect(url_for('pacientes'))
        except Exception as e:
            flash(f'Erro ao cadastrar paciente: {str(e)}', 'danger')
            return render_template('cadastrar_paciente.html', form_data=request.form)
    return render_template('cadastrar_paciente.html')

@app.route('/pacientes')
def pacientes():
    if not session.get('logado'):
        return redirect(url_for('login'))

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
        # Converter para tuplas no formato esperado pelo template
        pacientes_data = []
        for r in rows:
            dn = r.get('data_nascimento')
            if isinstance(dn, str) and dn:
                try:
                    dn_obj = datetime.datetime.strptime(dn, '%Y-%m-%d').date()
                except Exception:
                    dn_obj = None
            else:
                dn_obj = dn
            pacientes_data.append((r.get('id'), r.get('nome'), r.get('cpf'), r.get('telefone'), r.get('email'), dn_obj))
        return render_template('pacientes.html', pacientes=pacientes_data, busca=busca, pagina=pagina)
    except Exception as e:
        flash(f"Erro ao buscar pacientes: {e}", "danger")
        return render_template('pacientes.html', pacientes=[], busca=busca, pagina=pagina)

# CORRIGIDO: Removido &lt; e &gt;
@app.route('/editar_paciente/<int:id>', methods=['GET', 'POST'])
def editar_paciente(id):
    if not session.get('logado'):
        return redirect(url_for('login'))
    sb = get_supabase()
    try:
        if request.method == 'POST':
            nome = request.form['nome']
            cpf = request.form['cpf']
            telefone = request.form['telefone']
            email = request.form['email']
            data_nascimento = request.form['data_nascimento'] or None

            sb.table('pacientes').update({
                'nome': nome,
                'cpf': cpf,
                'telefone': telefone,
                'email': email,
                'data_nascimento': data_nascimento
            }).eq('id', id).execute()
            flash('Paciente atualizado com sucesso!', 'success')
            return redirect(url_for('pacientes'))
        else: # Método GET
            res = sb.table('pacientes').select('*').eq('id', id).limit(1).execute()
            rows = getattr(res, 'data', None) or []
            if not rows:
                flash('Paciente não encontrado.', 'danger')
                return redirect(url_for('pacientes'))
            r = rows[0]
            dn = r.get('data_nascimento')
            if isinstance(dn, str) and dn:
                dn_fmt = dn
            else:
                dn_fmt = dn.strftime('%Y-%m-%d') if dn else None
            paciente_dict = [r.get('id'), r.get('nome'), r.get('cpf'), r.get('telefone'), r.get('email'), dn_fmt]
            return render_template('editar_paciente.html', paciente=paciente_dict)
    except Exception as e:
        flash(f"Erro ao editar paciente: {e}", "danger")
        return redirect(url_for('pacientes'))

# CORRIGIDO: Removido &lt; e &gt;
@app.route('/excluir_paciente/<int:id>')
def excluir_paciente(id):
    if not session.get('logado'):
        return redirect(url_for('login'))
    try:
        sb = get_supabase()
        sb.table('pacientes').delete().eq('id', id).execute()
        flash('Paciente excluído com sucesso!', 'success')
    except Exception as e:
        flash(f'Erro ao excluir paciente: {str(e)}', 'danger')
    return redirect(url_for('pacientes'))

# --- Rotas de Agendamento e Financeiro (Simplificado) ---
# --- Rotas de Agendamento e Financeiro ---

@app.route('/cadastrar_agendamento', methods=['GET', 'POST'])
def cadastrar_agendamento():
    if not session.get('logado'):
        return redirect(url_for('login'))

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
                return redirect(url_for('cadastrar_agendamento'))

        # GET: carregar pacientes
        res_p = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
        rows_p = getattr(res_p, 'data', None) or []
        pacientes_lista = [(r.get('id'), r.get('nome')) for r in rows_p]
        return render_template('cadastrar_agendamento.html', pacientes=pacientes_lista)

    except Exception as e:
        print(f"Erro em /cadastrar_agendamento: {e}"); traceback.print_exc()
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

@app.route('/agendamentos', methods=['GET'])
def agendamentos():
    if not session.get('logado'):
        return redirect(url_for('login'))

    filtros = {
        'paciente': request.args.get('paciente', ''),
        'data': request.args.get('data', ''),
        'status': request.args.get('status', '')
    }

    sb = get_supabase()
    try:
        # Se houver filtro por nome do paciente, obtenha os IDs correspondentes
        allowed_ids = None
        if filtros.get('paciente'):
            pres = sb.table('pacientes').select('id, nome').ilike('nome', f"%{filtros['paciente']}%").execute()
            prows = getattr(pres, 'data', None) or []
            allowed_ids = [p.get('id') for p in prows]
            if not allowed_ids:
                # Nenhum paciente encontrado para o nome filtrado
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

        # Enriquecer com nomes dos pacientes
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
            e_hoje = False
            e_amanha = False
            if isinstance(dstr, str) and dstr:
                try:
                    dobj = datetime.datetime.strptime(dstr, '%Y-%m-%d').date()
                    data_fmt = dobj.strftime('%d/%m/%Y')
                    e_hoje = (dobj == hoje)
                    e_amanha = (dobj == amanha)
                except Exception:
                    pass
            hora_raw = a.get('hora') or ''
            hora_fmt = (hora_raw or '')[:5]
            ag_list.append({
                'id': a.get('id'),
                'paciente_id': a.get('paciente_id'),
                'nome': nomes_por_id.get(a.get('paciente_id')) or 'Paciente',
                'servico': a.get('servico'),
                'data_formatada': data_fmt,
                'hora_formatada': hora_fmt,
                'status': a.get('status') or 'Agendado',
                'observacoes': a.get('observacoes') or '',
                'e_hoje': e_hoje,
                'e_amanha': e_amanha,
            })

        return render_template('agendamentos.html', filtros=filtros, agendamentos_lista=ag_list)
    except Exception as e:
        print(f"Erro ao carregar agendamentos: {e}")
        traceback.print_exc()
        flash('Erro ao carregar agendamentos.', 'danger')
        return render_template('agendamentos.html', filtros=filtros, agendamentos_lista=[])

@app.route('/api/financeiro/lancamentos', methods=['GET'])
def api_get_lancamentos():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    sb = get_supabase()
    try:
        # Filtros opcionais
        paciente_id = request.args.get('paciente_id', type=int)
        status = request.args.get('status', type=str)

        q = sb.table('financeiro').select('*').order('data_vencimento', desc=True)
        if paciente_id is not None:
            q = q.eq('paciente_id', paciente_id)
        if status:
            q = q.eq('status', status)
        res = q.execute()
        lancamentos = getattr(res, 'data', None) or []

        # Enriquecer com nome do paciente sem join direto
        ids = {item.get('paciente_id') for item in lancamentos if item.get('paciente_id') is not None}
        nomes_por_id = {}
        if ids:
            pres = sb.table('pacientes').select('id, nome').in_('id', list(ids)).execute()
            prows = getattr(pres, 'data', None) or []
            nomes_por_id = {p.get('id'): p.get('nome') for p in prows}
        for item in lancamentos:
            pid = item.get('paciente_id')
            item['paciente_nome'] = nomes_por_id.get(pid)

        return jsonify(format_for_json(lancamentos))

    except Exception as e:
        print("="*30)
        print("ERRO em GET /api/financeiro/lancamentos:")
        traceback.print_exc()
        print("="*30)
        return jsonify({"erro": "Erro interno ao buscar lançamentos. Verifique os logs do servidor."}), 500

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
    sb = get_supabase()
    try:
        res = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
        pacientes_lista = getattr(res, 'data', None) or []
        return jsonify(format_for_json(pacientes_lista))
    except Exception as e:
        print(f"Erro em /api/pacientes/listar: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao buscar pacientes: {str(e)}"}), 500


# Exemplo para criar lançamento (POST) - Adaptado do seu código original
@app.route('/api/financeiro/lancamentos', methods=['POST'])
def api_create_lancamento():
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    data = request.get_json()  # Recebe dados JSON do JavaScript
    if not data:
        return jsonify({"erro": "Requisição sem dados JSON"}), 400

    paciente_id = data.get('paciente_id')
    agendamento_id = data.get('agendamento_id') or None
    descricao = data.get('descricao')
    valor_str = data.get('valor')  # Valor virá como número ou string do JS
    status = data.get('status')
    data_vencimento = data.get('data_vencimento')
    data_pagamento = data.get('data_pagamento') or None

    # Validação (adapte conforme necessário)
    if not all([paciente_id, descricao, valor_str, status, data_vencimento]):
         return jsonify({"erro": "Campos obrigatórios faltando"}), 400

    try:
        valor_float = float(valor_str)  # JS deve enviar número
    except (ValueError, TypeError):
        return jsonify({"erro": "Valor financeiro inválido"}), 400

    sb = get_supabase()
    try:
        payload = {
            'paciente_id': int(paciente_id),
            'agendamento_id': agendamento_id,
            'descricao': descricao,
            'valor': valor_float,
            'status': status,
            'data_vencimento': data_vencimento,
            'data_pagamento': data_pagamento
        }
        ins = sb.table('financeiro').insert(payload).select('*').execute()
        rows = getattr(ins, 'data', None) or []
        if rows:
            novo_lancamento = rows[0]
            # Adicionar paciente_nome
            pid = novo_lancamento.get('paciente_id')
            nome = None
            if pid is not None:
                pres = sb.table('pacientes').select('id, nome').eq('id', pid).limit(1).execute()
                prows = getattr(pres, 'data', None) or []
                if prows:
                    nome = prows[0].get('nome')
            novo_lancamento['paciente_nome'] = nome
            return jsonify(format_for_json(novo_lancamento)), 201  # 201 Created
        else:
            return jsonify({"sucesso": True}), 201

    except Exception as e:
        print(f"Erro em POST /api/financeiro/lancamentos: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao salvar lançamento: {str(e)}"}), 500


# --- CRIE AS ROTAS PARA PUT, DELETE e PUT /status de forma similar ---
# PUT /api/financeiro/lancamentos/<int:id> (recebe JSON, atualiza no banco)
# DELETE /api/financeiro/lancamentos/<int:id> (exclui do banco)
# PUT /api/financeiro/lancamentos/<int:id>/status (recebe JSON {status, data_pagamento}, atualiza)

# Exemplo rápido para DELETE
@app.route('/api/financeiro/lancamentos/<int:id>', methods=['DELETE'])
def api_delete_lancamento(id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        ex = sb.table('financeiro').select('id').eq('id', id).limit(1).execute()
        exists = getattr(ex, 'data', None) or []
        if not exists:
            return jsonify({"erro": "Lançamento não encontrado"}), 404
        sb.table('financeiro').delete().eq('id', id).execute()
        return jsonify({"sucesso": True}), 200  # Ou 204 No Content sem corpo
    except Exception as e:
        print(f"Erro em DELETE /api/financeiro/lancamentos/{id}: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao excluir lançamento: {str(e)}"}), 500

# Exemplo rápido para PUT /status
@app.route('/api/financeiro/lancamentos/<int:id>/status', methods=['PUT'])
def api_update_lancamento_status(id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({"erro": "Dados inválidos (status obrigatório)"}), 400

    novo_status = data.get('status')
    data_pagamento = data.get('data_pagamento')  # Pode ser null

    if novo_status not in ['pago', 'pendente']:
        return jsonify({"erro": "Status inválido"}), 400

    sb = get_supabase()
    try:
        sb.table('financeiro').update({
            'status': novo_status,
            'data_pagamento': data_pagamento
        }).eq('id', id).execute()

        # Opcional: buscar e confirmar o registro atualizado
        chk = sb.table('financeiro').select('id').eq('id', id).limit(1).execute()
        ok = getattr(chk, 'data', None) or []
        if ok:
            return jsonify({"sucesso": True}), 200
        else:
            return jsonify({"erro": "Lançamento não encontrado"}), 404

    except Exception as e:
        print(f"Erro em PUT /api/financeiro/lancamentos/{id}/status: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao atualizar status: {str(e)}"}), 500

# --- Fim das Rotas de Agendamento e Financeiro ---

# --- Rotas do Odontograma ---

# CORRIGIDO: Removido &lt; e &gt;
@app.route('/odontograma/<int:paciente_id>')
def odontograma_paciente(paciente_id):
    if not session.get('logado'):
        return redirect(url_for('login'))
    try:
        sb = get_supabase()
        res = sb.table('pacientes').select('id, nome').eq('id', paciente_id).limit(1).execute()
        rows = getattr(res, 'data', None) or []
        if not rows:
            flash('Paciente não encontrado.', 'danger')
            return redirect(url_for('pacientes'))
        nome_paciente = rows[0].get('nome') or 'Paciente'
        # Pré-carregar tratamentos do odontograma
        tres = sb.table('odontograma_tratamentos').select('id, dente_numero, tipo_tratamento, data_tratamento, observacoes, proxima_sessao, valor, concluido').eq('paciente_id', paciente_id).order('data_criacao', ascending=True).execute()
        tratamentos = getattr(tres, 'data', None) or []
        for t in tratamentos:
            if t.get('data_tratamento'):
                t['data_tratamento'] = str(t['data_tratamento'])[:10]
            if t.get('proxima_sessao'):
                t['proxima_sessao'] = str(t['proxima_sessao'])[:10]
            t['concluido'] = bool(t.get('concluido', False))

        # Pré-carregar últimos 5 lançamentos financeiros do paciente
        fres = sb.table('financeiro').select('id, descricao, valor, status, data_vencimento, data_pagamento, tratamento_id').eq('paciente_id', paciente_id).order('data_vencimento', desc=True).limit(5).execute()
        financeiros = getattr(fres, 'data', None) or []
        for f in financeiros:
            if f.get('data_vencimento'):
                f['data_vencimento'] = str(f['data_vencimento'])[:10]
            if f.get('data_pagamento'):
                f['data_pagamento'] = str(f['data_pagamento'])[:10]

        # Pré-carregar próximos agendamentos do paciente (até 5)
        today_str = date.today().isoformat()
        ares = sb.table('agendamentos').select('id, servico, data, hora, observacoes, status').eq('paciente_id', paciente_id).gte('data', today_str).order('data', ascending=True).order('hora', ascending=True).limit(5).execute()
        agendamentos = getattr(ares, 'data', None) or []
        for a in agendamentos:
            if a.get('data'):
                a['data'] = str(a['data'])[:10]
            if a.get('hora'):
                a['hora'] = str(a['hora'])[:8]

        return render_template('odontograma.html', paciente_id=paciente_id, nome_paciente=nome_paciente, tratamentos_iniciais=tratamentos, financeiro_recentes=financeiros, agendamentos_proximos=agendamentos)
    except Exception as e:
        print(f"Erro ao carregar odontograma para paciente {paciente_id}: {e}")
        traceback.print_exc()
        flash('Erro ao carregar odontograma.', 'danger')
        return redirect(url_for('pacientes'))

# --- API Endpoints para Odontograma ---

# GET: Buscar tratamentos de um paciente (ADICIONADO 'concluido')
@app.route('/api/odontograma/<int:paciente_id>/tratamentos', methods=['GET'])
def get_tratamentos_paciente(paciente_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        res = sb.table('odontograma_tratamentos').select('id, dente_numero, tipo_tratamento, data_tratamento, observacoes, proxima_sessao, valor, concluido').eq('paciente_id', paciente_id).order('data_criacao', ascending=True).execute()
        tratamentos = getattr(res, 'data', None) or []
        # Formatar datas para YYYY-MM-DD e garantir booleano
        for t in tratamentos:
            if t.get('data_tratamento'):
                t['data_tratamento'] = str(t['data_tratamento'])[:10]
            if t.get('proxima_sessao'):
                t['proxima_sessao'] = str(t['proxima_sessao'])[:10]
            t['concluido'] = bool(t.get('concluido', False))
        return jsonify(format_for_json(tratamentos))
    except Exception as e:
        print(f"Erro API GET /tratamentos (paciente {paciente_id}): {e}")
        traceback.print_exc()
        return jsonify({"erro": "Erro interno ao buscar tratamentos"}), 500

# POST: Adicionar um novo tratamento (ADICIONADO 'concluido')
# POST: Adicionar um novo tratamento E criar lançamento financeiro se houver valor
@app.route('/api/odontograma/<int:paciente_id>/tratamentos', methods=['POST'])
def add_tratamento_paciente(paciente_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401

    sb = get_supabase()

    # Verifica paciente
    try:
        pres = sb.table('pacientes').select('id').eq('id', paciente_id).limit(1).execute()
        if not (getattr(pres, 'data', None) or []):
            return jsonify({"erro": "Paciente não encontrado"}), 404
    except Exception as e_check:
        print(f"Erro Supabase ao verificar paciente {paciente_id}: {e_check}")
        traceback.print_exc()
        return jsonify({"erro": "Erro ao verificar paciente"}), 500

    dados = request.json
    if not dados:
        return jsonify({"erro": "Requisição sem corpo JSON"}), 400

    dente_numero = dados.get('denteNumero')
    tipo_tratamento = dados.get('tipo')
    data_tratamento = dados.get('data')
    observacoes = dados.get('observacoes')
    proxima_sessao = dados.get('proximaSessao') or None
    valor_tratamento_str = dados.get('valor')
    concluido = bool(dados.get('concluido', False))

    required = ['denteNumero', 'tipo', 'data']
    missing = [f for f in required if not dados.get(f)]
    if missing:
        return jsonify({"erro": f"Campos obrigatórios: {', '.join(missing)}"}), 400

    valor_tratamento = None
    if valor_tratamento_str is not None and valor_tratamento_str != '':
        try:
            valor_tratamento = float(valor_tratamento_str)
            if valor_tratamento < 0:
                return jsonify({"erro": "Valor negativo"}), 400
        except (ValueError, TypeError):
            return jsonify({"erro": "Valor inválido"}), 400

    try:
        if data_tratamento:
            datetime.datetime.strptime(data_tratamento, '%Y-%m-%d')
        if proxima_sessao:
            datetime.datetime.strptime(proxima_sessao, '%Y-%m-%d')
    except ValueError:
        return jsonify({"erro": "Formato data inválido"}), 400

    try:
        insert_payload = {
            'paciente_id': paciente_id,
            'dente_numero': dente_numero,
            'tipo_tratamento': tipo_tratamento,
            'data_tratamento': data_tratamento,
            'observacoes': observacoes,
            'proxima_sessao': proxima_sessao,
            'valor': valor_tratamento,
            'concluido': concluido
        }
        res = sb.table('odontograma_tratamentos').insert(insert_payload).select('*').execute()
        rows = getattr(res, 'data', None) or []
        if not rows:
            return jsonify({"erro": "Falha ao salvar tratamento"}), 500
        novo_trat = rows[0]
        novo_trat_id = novo_trat.get('id')

        if valor_tratamento is not None and valor_tratamento > 0 and novo_trat_id:
            desc_fin = f"Trat.: {tipo_tratamento} (Dente {dente_numero})"
            fin_payload = {
                'paciente_id': paciente_id,
                'tratamento_id': novo_trat_id,
                'descricao': desc_fin,
                'valor': valor_tratamento,
                'status': 'pendente',
                'data_vencimento': data_tratamento,
                'data_pagamento': None
            }
            sb.table('financeiro').insert(fin_payload).execute()

        return jsonify(format_for_json(novo_trat)), 201
    except Exception as e:
        print(f"Erro Supabase ao salvar tratamento: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao salvar: {str(e)}"}), 500

@app.route('/api/odontograma/tratamentos/<int:tratamento_id>', methods=['DELETE'])
def delete_tratamento(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    sb = get_supabase()
    try:
        sel = sb.table('odontograma_tratamentos').select('id').eq('id', tratamento_id).limit(1).execute()
        if not (getattr(sel, 'data', None) or []):
            return jsonify({"erro": "Tratamento não encontrado"}), 404

        sb.table('financeiro').delete().eq('tratamento_id', tratamento_id).execute()
        sb.table('odontograma_tratamentos').delete().eq('id', tratamento_id).execute()
        return '', 204
    except Exception as e:
        print(f"Erro Supabase durante exclusão do tratamento {tratamento_id}: {e}")
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao excluir: {str(e)}"}), 500

@app.route('/api/odontograma/tratamentos/<int:tratamento_id>/status', methods=['PUT'])
def update_tratamento_status(tratamento_id):
    if not session.get('logado'):
        return jsonify({"erro": "Não autorizado"}), 401
    try:
        dados = request.json
        if dados is None or 'concluido' not in dados:
            return jsonify({"erro": "Status 'concluido' (booleano) é obrigatório no corpo da requisição."}), 400
        novo_status = bool(dados.get('concluido'))
        sb = get_supabase()
        sel = sb.table('odontograma_tratamentos').select('id').eq('id', tratamento_id).limit(1).execute()
        if not (getattr(sel, 'data', None) or []):
            return jsonify({"erro": "Tratamento não encontrado"}), 404
        sb.table('odontograma_tratamentos').update({'concluido': novo_status}).eq('id', tratamento_id).execute()
        return jsonify({"id": tratamento_id, "concluido": novo_status, "mensagem": "Status do tratamento atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar status do tratamento {tratamento_id}: {e}")
        traceback.print_exc()
        return jsonify({"erro": "Erro ao atualizar status do tratamento"}), 500

@app.route('/paciente/<int:paciente_id>')
def detalhes_paciente(paciente_id):
    if not session.get('logado'):
        return redirect(url_for('login'))

    sb = get_supabase()
    try:
        pres = sb.table('pacientes').select('*').eq('id', paciente_id).limit(1).execute()
        prows = getattr(pres, 'data', None) or []
        if not prows:
            flash('Paciente não encontrado.', 'danger')
            return redirect(url_for('pacientes'))
        paciente_fmt = format_for_json(prows[0])

        tres = sb.table('odontograma_tratamentos') \
            .select('id, dente_numero, tipo_tratamento, data_tratamento, observacoes, valor, concluido, proxima_sessao') \
            .eq('paciente_id', paciente_id) \
            .order('data_tratamento', ascending=False) \
            .order('data_criacao', ascending=False) \
            .execute()
        tratamentos_raw = getattr(tres, 'data', None) or []
        tratamentos = format_for_json(tratamentos_raw)

        fres = sb.table('financeiro') \
            .select('id, descricao, valor, status, data_vencimento, data_pagamento, tratamento_id') \
            .eq('paciente_id', paciente_id) \
            .order('data_vencimento', ascending=False) \
            .execute()
        financeiro_raw = getattr(fres, 'data', None) or []
        financeiro_lista = format_for_json(financeiro_raw)

        hoje = date.today().isoformat()
        ares = sb.table('agendamentos') \
            .select('id, servico, data, hora, status') \
            .eq('paciente_id', paciente_id) \
            .gte('data', hoje) \
            .order('data', ascending=True) \
            .order('hora', ascending=True) \
            .execute()
        ag_raw = getattr(ares, 'data', None) or []
        agendamentos_futuros = []
        for a in ag_raw:
            hora_raw = a.get('hora')
            a['hora_f'] = (hora_raw or '')[:5]
            agendamentos_futuros.append(a)
        agendamentos_futuros = format_for_json(agendamentos_futuros)

        return render_template('detalhes_paciente.html',
                               paciente=paciente_fmt,
                               tratamentos=tratamentos,
                               financeiro_lista=financeiro_lista,
                               agendamentos_futuros=agendamentos_futuros)
    except Exception as e:
        print(f"Erro ao carregar detalhes do paciente {paciente_id}: {e}")
        traceback.print_exc()
        flash('Erro ao carregar detalhes do paciente.', 'danger')
        return redirect(url_for('pacientes'))

@app.route('/editar_agendamento/<int:id>', methods=['GET', 'POST'])
def editar_agendamento(id):
    if not session.get('logado'):
        return redirect(url_for('login'))

    sb = get_supabase()
    try:
        if request.method == 'POST':
            # Pega dados do formulário
            paciente_id = request.form.get('paciente_id')
            servico = request.form.get('servico')
            data = request.form.get('data')
            hora = request.form.get('hora')
            status = request.form.get('status')  # Pega o novo status
            observacoes = request.form.get('observacoes', '')

            # Validação básica
            if not all([paciente_id, servico, data, hora, status]):
                flash('Preencha todos os campos obrigatórios.', 'warning')
                return redirect(url_for('editar_agendamento', id=id))
            else:
                # Normaliza hora para HH:MM:SS
                hora_db = (hora or '').strip()
                if hora_db and len(hora_db) == 5:
                    hora_db = f"{hora_db}:00"

                update_payload = {
                    'paciente_id': int(paciente_id),
                    'servico': servico,
                    'data': data,
                    'hora': hora_db,
                    'status': status,
                    'observacoes': observacoes
                }
                sb.table('agendamentos').update(update_payload).eq('id', id).execute()
                flash('Agendamento atualizado com sucesso!', 'success')
                return redirect(url_for('agendamentos'))  # Volta para a lista

        # --- Lógica para GET ---
        res = sb.table('agendamentos').select('id, paciente_id, servico, data, hora, status, observacoes').eq('id', id).limit(1).execute()
        rows = getattr(res, 'data', None) or []
        if not rows:
            flash('Agendamento não encontrado.', 'danger')
            return redirect(url_for('agendamentos'))
        agendamento = rows[0]

        # Busca nome do paciente
        nome_paciente = None
        pid_val = agendamento.get('paciente_id')
        if pid_val is not None:
            pres = sb.table('pacientes').select('id, nome').eq('id', pid_val).limit(1).execute()
            prows = getattr(pres, 'data', None) or []
            if prows:
                nome_paciente = prows[0].get('nome')
        agendamento['nome_paciente'] = nome_paciente

        # Formata data e hora para os inputs do formulário
        if agendamento.get('data'):
            agendamento['data_form'] = str(agendamento['data'])[:10]
        if agendamento.get('hora'):
            agendamento['hora_form'] = str(agendamento['hora'])[:5]
        else:
            agendamento['hora_form'] = ''

        # Busca todos os pacientes para o dropdown (como tuplas id, nome)
        plist_res = sb.table('pacientes').select('id, nome').order('nome', ascending=True).execute()
        prows = getattr(plist_res, 'data', None) or []
        pacientes_lista = [(p.get('id'), p.get('nome')) for p in prows]

        # Lista de status possíveis
        status_possiveis = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']

        return render_template('editar_agendamento.html',
                               agendamento=agendamento,
                               pacientes=pacientes_lista,
                               status_lista=status_possiveis)

    except Exception as e:
        print(f"Erro em /editar_agendamento/{id}: {e}")
        traceback.print_exc()
        flash(f'Erro ao processar edição do agendamento: {str(e)}', 'danger')
        return redirect(url_for('agendamentos'))

# --- Fim da rota editar_agendamento ---


# Rota genérica para atualizar status (mais flexível)
@app.route('/agendamento/<int:id>/status', methods=['POST'])
def atualizar_status_agendamento(id):
    if not session.get('logado'):
        flash("Acesso não autorizado.", "danger")
        return redirect(url_for('login'))

    novo_status = request.form.get('novo_status')
    status_validos = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']

    if not novo_status or novo_status not in status_validos:
        flash("Status inválido fornecido.", "warning")
        return redirect(request.referrer or url_for('agendamentos'))

    sb = get_supabase()
    try:
        sel = sb.table('agendamentos').select('id').eq('id', id).limit(1).execute()
        if not (getattr(sel, 'data', None) or []):
            flash("Agendamento não encontrado.", "danger")
            return redirect(url_for('agendamentos'))

        sb.table('agendamentos').update({'status': novo_status}).eq('id', id).execute()
        flash(f"Status do agendamento atualizado para '{novo_status}'.", "success")
    except Exception as e:
        print(f"Erro ao atualizar status do agendamento {id}: {e}")
        traceback.print_exc()
        flash("Erro ao atualizar status do agendamento.", "danger")

    return redirect(request.referrer or url_for('agendamentos'))

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
    documentos_lista = []

    try:
        print(f"--- [Portal Home] Buscando dados para paciente ID: {paciente_id} ---")
        sb = get_supabase()

        # 1. Buscar tratamentos (odontograma_tratamentos)
        print("--- [Portal Home] Buscando tratamentos... ---")
        t_res = sb.table('odontograma_tratamentos') \
            .select('id, dente_numero, tipo_tratamento, data_tratamento, observacoes, valor, concluido, data_criacao') \
            .eq('paciente_id', paciente_id) \
            .order('data_tratamento', desc=True) \
            .order('data_criacao', desc=True) \
            .execute()
        t_rows = getattr(t_res, 'data', None) or []
        tratamentos = format_for_json(t_rows)
        print(f"--- [Portal Home] {len(tratamentos)} tratamentos encontrados. ---")

        # 2. Buscar financeiro
        print("--- [Portal Home] Buscando financeiro... ---")
        f_res = sb.table('financeiro') \
            .select('id, descricao, valor, status, data_vencimento, data_pagamento, tratamento_id') \
            .eq('paciente_id', paciente_id) \
            .order('data_vencimento', desc=True) \
            .execute()
        f_rows = getattr(f_res, 'data', None) or []
        financeiro_lista = format_for_json(f_rows)
        print(f"--- [Portal Home] {len(financeiro_lista)} lançamentos financeiros encontrados. ---")

        # 3. Buscar agendamentos futuros
        print("--- [Portal Home] Buscando agendamentos futuros... ---")
        today_iso = date.today().isoformat()
        a_res = sb.table('agendamentos') \
            .select('id, servico, data, hora, status') \
            .eq('paciente_id', paciente_id) \
            .gte('data', today_iso) \
            .order('data', ascending=True) \
            .order('hora', ascending=True) \
            .execute()
        a_rows = getattr(a_res, 'data', None) or []
        agendamentos_futuros = []
        for a in a_rows:
            item = dict(a)
            hora_raw = str(item.get('hora') or '')
            item['hora_f'] = hora_raw[:5] if hora_raw else None
            agendamentos_futuros.append(item)
        print(f"--- [Portal Home] {len(agendamentos_futuros)} agendamentos futuros encontrados. ---")


        # 4. Buscar Documentos <<< NOVA BUSCA
        print("--- [Portal Home] Buscando documentos... ---")
        d_res = sb.table('documentos_paciente') \
            .select('id, tipo_documento, data_geracao, nome_arquivo, storage_path, descricao') \
            .eq('paciente_id', paciente_id) \
            .order('data_geracao', desc=True) \
            .execute()
        d_rows = getattr(d_res, 'data', None) or []
        documentos_lista = format_for_json(d_rows)
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

    try:
        sb = get_supabase()
        print(f"--- [Download Doc] Buscando doc ID {doc_id} para paciente ID {paciente_id} ---")
        res = sb.table('documentos_paciente').select('nome_arquivo, storage_path').eq('id', doc_id).eq('paciente_id', paciente_id).limit(1).execute()
        docs = getattr(res, 'data', None) or []
        documento = docs[0] if docs else None
        if not documento:
            print(f"--- [Download Doc] ERRO: Documento {doc_id} não encontrado ou não pertence ao paciente {paciente_id} ---")
            flash("Documento não encontrado ou acesso não permitido.", "danger")
            return redirect(url_for('portal_home'))

        nome_arquivo = documento.get('nome_arquivo')
        storage_path = documento.get('storage_path')
        if not storage_path:
            print(f"--- [Download Doc] ERRO: Documento {doc_id} sem storage_path definido ---")
            flash("Documento indisponível no armazenamento.", "danger")
            return redirect(url_for('portal_home'))

        # 3. Gerar URL assinada no Storage (5 min) e redirecionar
        try:
            signed = sb.storage.from_('documentos').create_signed_url(storage_path, 300)
            signed_url = None
            if isinstance(signed, dict):
                signed_url = signed.get('signed_url') or signed.get('url') or signed.get('signedURL')
            if signed_url:
                print(f"--- [Download Doc] URL assinada gerada: {signed_url} ---")
                return redirect(signed_url)
        except Exception as e:
            print(f"--- [Download Doc] Falha ao gerar URL assinada: {e} ---")

        # 4. Fallback: baixar bytes e enviar via Flask
        try:
            data = sb.storage.from_('documentos').download(storage_path)
            if isinstance(data, bytes):
                return send_file(io.BytesIO(data), as_attachment=True, download_name=nome_arquivo)
            # Alguns clientes retornam dict com 'data'
            buf = getattr(data, 'data', None)
            if buf:
                return send_file(io.BytesIO(buf), as_attachment=True, download_name=nome_arquivo)
        except Exception as e:
            print(f"--- [Download Doc] Falha ao baixar do Storage: {e} ---")
            traceback.print_exc()
            flash("Falha ao baixar o documento.", "danger")
            return redirect(url_for('portal_home'))

    except Exception as e:
        print(f"--- [Download Doc] ERRO geral: {e} ---")
        traceback.print_exc()
        flash("Erro ao processar download.", "danger")
        return redirect(url_for('portal_home'))
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
