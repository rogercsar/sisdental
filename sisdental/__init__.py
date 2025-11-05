import os
from flask import Flask
from flask_wtf.csrf import CSRFProtect
from supabase import create_client, Client
from datetime import timedelta

csrf = CSRFProtect()

# Variáveis globais para os clientes Supabase
_supabase_client: Client = None
_supabase_public: Client = None

def get_supabase() -> Client:
    """Retorna o cliente Supabase com a role de serviço."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase URL e Service Role Key devem ser configurados.")

    _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client

def get_supabase_public() -> Client:
    """Retorna o cliente Supabase público (anon key)."""
    global _supabase_public
    if _supabase_public is not None:
        return _supabase_public

    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError("Supabase URL e Anon Key devem ser configurados.")

    _supabase_public = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _supabase_public

def create_app():
    """Cria e configura uma instância da aplicação Flask."""
    app = Flask(__name__, instance_relative_config=True)

    # Configurações padrão
    app.config.from_mapping(
        SECRET_KEY='dev', # Mude para uma chave segura em produção
        PERMANENT_SESSION_LIFETIME=timedelta(days=1),
    )

    # Cria a pasta de instância se não existir
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Inicializa extensões
    csrf.init_app(app)

    # Registro de Blueprints
    from .auth import auth_bp
    app.register_blueprint(auth_bp)

    from .main import main_bp
    app.register_blueprint(main_bp)

    from .pacientes import pacientes_bp
    app.register_blueprint(pacientes_bp)

    from .agendamentos import agendamentos_bp
    app.register_blueprint(agendamentos_bp)

    from .financeiro import financeiro_bp
    app.register_blueprint(financeiro_bp)

    from .odontograma import odontograma_bp
    app.register_blueprint(odontograma_bp)

    from .portal import portal_bp
    app.register_blueprint(portal_bp)

    from .api import api_bp
    app.register_blueprint(api_bp)

    from .documentos import documentos_bp
    app.register_blueprint(documentos_bp)

    return app
