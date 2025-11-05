from flask import Blueprint
portal_bp = Blueprint('portal', __name__, url_prefix='/portal')
from . import routes
