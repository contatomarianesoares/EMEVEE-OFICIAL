import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Inbox from './pages/Inbox'
import GestoraDashboard from './pages/GestoraDashboard'
import CRM from './pages/CRM'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'

function RotaProtegida({ children, apenasGestora = false }) {
  const { usuario, autenticado } = useAuth()
  if (!autenticado) return <Navigate to="/login" replace />
  if (apenasGestora && usuario?.papel !== 'gestora') return <Navigate to="/inbox" replace />
  return children
}

export default function App() {
  const { usuario } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/inbox" element={
          <RotaProtegida><Inbox /></RotaProtegida>
        } />

        <Route path="/dashboard" element={
          <RotaProtegida apenasGestora><GestoraDashboard /></RotaProtegida>
        } />

        <Route path="/crm" element={
          <RotaProtegida><CRM /></RotaProtegida>
        } />

        <Route path="/relatorios" element={
          <RotaProtegida apenasGestora><Relatorios /></RotaProtegida>
        } />

        <Route path="/configuracoes" element={
          <RotaProtegida apenasGestora><Configuracoes /></RotaProtegida>
        } />

        {/* Redireciona raiz baseado no papel */}
        <Route path="/" element={
          usuario?.papel === 'gestora'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/inbox" replace />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
