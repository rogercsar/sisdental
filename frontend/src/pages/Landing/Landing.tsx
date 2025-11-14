import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Hero */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              Gestão moderna para sua clínica odontológica
            </h1>
            <p className="text-lg text-gray-600">
              Organize pacientes, agendas e finanças em um único lugar. Tenha
              relatórios claros, prontuários completos e integrações úteis
              para acelerar sua rotina.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/sign-up"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-white font-medium shadow hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Criar conta
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-full border border-blue-600 bg-white px-6 py-2.5 text-blue-600 font-medium shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Entrar
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              Teste grátis. Sem cartão de crédito.
            </p>
          </div>
          <div className="rounded-xl bg-white shadow-sm border p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 font-semibold">01</div>
                <div>
                  <p className="font-semibold text-gray-900">Agenda inteligente</p>
                  <p className="text-sm text-gray-600">Marque, confirme e gerencie consultas com facilidade.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">02</div>
                <div>
                  <p className="font-semibold text-gray-900">Prontuário completo</p>
                  <p className="text-sm text-gray-600">Histórico clínico, imagens e documentos do paciente.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold">03</div>
                <div>
                  <p className="font-semibold text-gray-900">Financeiro claro</p>
                  <p className="text-sm text-gray-600">Relatórios e recebimentos em tempo real.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="rounded-xl bg-white shadow-sm border p-6">
            <p className="font-semibold text-gray-900">Fácil de começar</p>
            <p className="text-sm text-gray-600">Configuração simples e importação de dados.
            </p>
          </div>
          <div className="rounded-xl bg-white shadow-sm border p-6">
            <p className="font-semibold text-gray-900">Seguro e confiável</p>
            <p className="text-sm text-gray-600">Autenticação e dados protegidos.
            </p>
          </div>
          <div className="rounded-xl bg-white shadow-sm border p-6">
            <p className="font-semibold text-gray-900">Suporte amigável</p>
            <p className="text-sm text-gray-600">Estamos prontos para ajudar quando precisar.
            </p>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="px-6 pb-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-600">
          <div>
            © {new Date().getFullYear()} SIS Dental — Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6">
            <a href="mailto:contato@sisdental.app" className="text-blue-600 hover:text-blue-700">Contato</a>
            <a href="mailto:suporte@sisdental.app" className="text-blue-600 hover:text-blue-700">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}