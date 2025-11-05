from flask import Blueprint
documentos_bp = Blueprint('documentos', __name__, url_prefix='/documentos')
from . import routes
