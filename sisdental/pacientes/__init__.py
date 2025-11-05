from flask import Blueprint

pacientes_bp = Blueprint('pacientes', __name__, url_prefix='/pacientes')

from . import routes
