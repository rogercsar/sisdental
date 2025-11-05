from flask import Blueprint

# Cria uma instância de Blueprint.
# O primeiro argumento é o nome do blueprint.
# O segundo é o nome do módulo ou pacote onde o blueprint está localizado.
# 'url_prefix' é opcional e adiciona um prefixo a todas as URLs do blueprint.
auth_bp = Blueprint('auth', __name__)

# Importa as rotas no final para evitar importações circulares
from . import routes
