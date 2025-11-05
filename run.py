from sisdental import create_app
import os

# Carrega variáveis de ambiente do .env
def _load_env():
    try:
        env_path = os.path.join(os.path.dirname(__file__), '.env')
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
        pass

_load_env()

app = create_app()

if __name__ == '__main__':
    # Obtém a porta do ambiente ou usa 5020 como padrão
    port = int(os.environ.get("PORT", 5020))
    # Em produção, o debug deve ser False
    debug = os.environ.get("FLASK_DEBUG", "True").lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=debug)
