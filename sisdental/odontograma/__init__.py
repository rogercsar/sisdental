from flask import Blueprint
odontograma_bp = Blueprint('odontograma', __name__, url_prefix='/odontograma')
from . import routes
