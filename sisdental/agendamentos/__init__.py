from flask import Blueprint

agendamentos_bp = Blueprint('agendamentos', __name__, url_prefix='/agendamentos')

from . import routes
