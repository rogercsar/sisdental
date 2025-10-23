import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

export default function CheckoutRetorno() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('Processando retorno do pagamento...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get('status') || params.get('collection_status')
    setStatus(statusParam)

    if (statusParam === 'approved') {
      const payloadStr = localStorage.getItem('pendingSignup')
      if (!payloadStr) {
        setError('Não encontramos os dados do cadastro para finalizar. Tente novamente.')
        setMessage('')
        return
      }
      const payload = JSON.parse(payloadStr) as {
        plano: 'basico' | 'profissional'
        nome: string
        email: string
        password: string
        clinica?: string
      }

      const sb = getSupabase()
      if (!sb) {
        setError('Supabase não configurado no frontend.')
        setMessage('')
        return
      }

      ;(async () => {
        try {
          const { data, error } = await sb.auth.signUp({
            email: payload.email,
            password: payload.password,
            options: {
              data: {
                plano: payload.plano,
                nome: payload.nome,
                clinica: payload.clinica ?? null,
                status_pagamento_plano: 'pago',
              },
            },
          })
          if (error) throw error

          localStorage.removeItem('pendingSignup')
          if (data?.session) {
            setMessage('Pagamento aprovado e cadastro concluído! Redirecionando...')
            setTimeout(() => navigate('/cadastro/obrigado'), 1500)
          } else {
            setMessage('Pagamento aprovado! Verifique seu e-mail para confirmar a conta.')
            setTimeout(() => navigate('/cadastro/obrigado'), 2000)
          }
        } catch (e: any) {
          setError(e.message ?? String(e))
          setMessage('')
        }
      })()
    } else if (statusParam === 'pending' || statusParam === 'in_process') {
      setMessage('Pagamento recebido, porém ainda pendente de aprovação. Você será notificado após confirmação.')
    } else {
      setError('Pagamento não aprovado ou cancelado. Você pode tentar novamente.')
      setMessage('')
    }
  }, [navigate])

  return (
    <div className="container py-5 min-vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 text-center">
              <i className={`fas ${status === 'approved' ? 'fa-check-circle text-success' : status === 'pending' ? 'fa-hourglass-half text-warning' : 'fa-times-circle text-danger'} fa-2x mb-2`}></i>
              <h4 className="mb-3">Retorno do Pagamento</h4>
              {message && <div className="alert alert-info">{message}</div>}
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="d-flex gap-2 justify-content-center">
                <Link className="btn btn-outline-primary" to="/cadastro">Voltar aos Planos</Link>
                <Link className="btn btn-primary" to="/login">Ir para Login</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}