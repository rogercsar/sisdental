from flask_wtf import FlaskForm
from wtforms import StringField, DateField, SubmitField, PasswordField
from wtforms.validators import DataRequired, Email, Optional

class PacienteForm(FlaskForm):
    """Formulário para cadastrar e editar pacientes."""
    nome = StringField('Nome Completo', validators=[DataRequired("O campo nome é obrigatório.")])
    cpf = StringField('CPF')
    telefone = StringField('Telefone')
    email = StringField('E-mail', validators=[Optional(), Email("Por favor, insira um e-mail válido.")])
    data_nascimento = DateField('Data de Nascimento', validators=[Optional()])
    submit = SubmitField('Salvar Paciente')

class RegisterForm(FlaskForm):
    """Formulário de registro de usuário."""
    username = StringField('Nome de Usuário', validators=[DataRequired(), Email()])
    password = PasswordField('Senha', validators=[DataRequired()])
    submit = SubmitField('Cadastrar')
