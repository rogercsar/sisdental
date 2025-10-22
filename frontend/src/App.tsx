import { Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Pacientes from './pages/Pacientes'
import Agendamentos from './pages/Agendamentos'
import Dashboard from './pages/Dashboard'
import CadastrarPaciente from './pages/CadastrarPaciente'
import EditarPaciente from './pages/EditarPaciente'
import DetalhesPaciente from './pages/DetalhesPaciente'
import CadastrarAgendamento from './pages/CadastrarAgendamento'
import EditarAgendamento from './pages/EditarAgendamento'
import Odontograma from './pages/Odontograma'
import Financeiro from './pages/Financeiro'
import PortalLogin from './pages/PortalLogin'
import PortalHome from './pages/PortalHome'
import DocumentosPaciente from './pages/DocumentosPaciente'
import Layout from './components/Layout'
import { RequireAuth, RequirePortal } from './components/RouteGuards'
import ImportarDados from './pages/ImportarDados'
import Exportar from './pages/Exportar'
import Relatorios from './pages/Relatorios'
// Remover import do App.css

function App() {
  return (
    <Routes>
      {/* Rotas públicas (sem Layout) */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/portal/login" element={<PortalLogin />} />
  
      {/* Rotas da aplicação (com Layout) */}
      <Route path="/dashboard" element={<RequireAuth><Layout><Dashboard /></Layout></RequireAuth>} />
      {/* Pacientes */}
      <Route path="/pacientes" element={<RequireAuth><Layout><Pacientes /></Layout></RequireAuth>} />
      <Route path="/pacientes/cadastrar" element={<RequireAuth><Layout><CadastrarPaciente /></Layout></RequireAuth>} />
      <Route path="/pacientes/:id/editar" element={<RequireAuth><Layout><EditarPaciente /></Layout></RequireAuth>} />
      <Route path="/pacientes/:id/detalhes" element={<RequireAuth><Layout><DetalhesPaciente /></Layout></RequireAuth>} />
      <Route path="/pacientes/:id/documentos" element={<RequireAuth><Layout><DocumentosPaciente /></Layout></RequireAuth>} />
      <Route path="/odontograma/:pacienteId" element={<RequireAuth><Layout><Odontograma /></Layout></RequireAuth>} />
  
      {/* Agendamentos */}
      <Route path="/agendamentos" element={<RequireAuth><Layout><Agendamentos /></Layout></RequireAuth>} />
      <Route path="/agendamentos/cadastrar" element={<RequireAuth><Layout><CadastrarAgendamento /></Layout></RequireAuth>} />
      <Route path="/agendamentos/:id/editar" element={<RequireAuth><Layout><EditarAgendamento /></Layout></RequireAuth>} />
  
      {/* Financeiro */}
      <Route path="/financeiro" element={<RequireAuth><Layout><Financeiro /></Layout></RequireAuth>} />
      {/* Importar Dados */}
      <Route path="/importar" element={<RequireAuth><Layout><ImportarDados /></Layout></RequireAuth>} />
      {/* Exportar */}
      <Route path="/exportar" element={<RequireAuth><Layout><Exportar /></Layout></RequireAuth>} />
      {/* Relatórios */}
      <Route path="/relatorios" element={<RequireAuth><Layout><Relatorios /></Layout></RequireAuth>} />
      {/* Portal do Paciente */}
      <Route path="/portal/home" element={<RequirePortal><Layout><PortalHome /></Layout></RequirePortal>} />
    </Routes>
  )
}

export default App
