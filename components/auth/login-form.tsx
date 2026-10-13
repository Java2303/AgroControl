'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { API_URL } from '@/lib/api-config'
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel'

export function LoginForm() {
  const { login, navigate } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor, ingrese sus credenciales')
      return
    }

    setIsLoading(true)

    try {
      // 📡 Conexión real con el Backend de Agro Control
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

    if (response.ok) {
      login({
        id: result.user.id,
        name: result.user.nombre, // Asegúrate de que coincida con lo que envía tu API
        email: email,
        ci_nit: result.user.ci_nit, // ⬅️ AGREGAR ESTA LÍNEA para resolver el error
        userType: result.user.rol,
        token: result.token
      })
        // Redirigimos al Dashboard principal
        navigate('dashboard') 
      } else {
        setError(result.message || 'Credenciales incorrectas')
      }
    } catch (err) {
      setError('No se pudo establecer conexión con el servidor del CIAT')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="surface-dark min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-[var(--primary)]">
      <AuthBrandPanel />
      <div className="relative flex items-center justify-center p-4 lg:p-10">
      {/* Fondo con patrón sutil */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238dc63f' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <Card className="w-full max-w-md glass-dark border-0 shadow-elevated relative z-10">
        <CardHeader className="text-center pt-10 pb-6">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-fixed-dim)] flex items-center justify-center shadow-elevated mb-6">
            <span className="material-symbols-outlined text-[var(--on-tertiary-fixed)] text-4xl">eco</span>
          </div>
          <CardTitle className="text-display-md text-[var(--on-primary)]">AGRO CONTROL</CardTitle>
          <CardDescription className="text-[var(--tertiary)]/80 text-base mt-2 font-medium">
            Acceso al Sistema de Monitoreo CIAT
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Correo Electrónico</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">mail</span>
                  <Input
                    type="email"
                    placeholder="usuario@ciat.bo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-12 rounded-lg pl-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Contraseña</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">lock</span>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-12 rounded-lg pl-10 pr-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-primary)]/40 hover:text-[var(--tertiary)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </Field>
            </FieldGroup>

            {error && <FieldError className="text-[var(--error)] text-center">{error}</FieldError>}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--tertiary)] hover:bg-[var(--tertiary-fixed-dim)] text-[var(--on-tertiary-fixed)] font-bold h-14 rounded-xl transition-smooth shadow-elevated border-0"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Validando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined">login</span>
                  Iniciar Sesión
                </div>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-[var(--on-primary)]/60 text-sm">
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => navigate('register')}
                  className="text-[var(--tertiary)] hover:text-[var(--tertiary-fixed)] font-bold underline-offset-4 hover:underline transition-all"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}