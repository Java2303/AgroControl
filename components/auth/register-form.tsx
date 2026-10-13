'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { API_URL } from '@/lib/api-config'
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel'

// 💡 NOTA: Cambia 'localhost' por tu IP local (ej. 192.168.x.x) para pruebas en móvil
const API_BASE_URL = API_URL

// Política de contraseñas (misma regla que el backend): cualquier símbolo cuenta como carácter especial
const REQUISITOS_PASSWORD = [
  { texto: '8 caracteres o más', cumple: (p: string) => p.length >= 8 && p.length <= 72 },
  { texto: 'Una mayúscula', cumple: (p: string) => /[A-Z]/.test(p) },
  { texto: 'Una minúscula', cumple: (p: string) => /[a-z]/.test(p) },
  { texto: 'Un número', cumple: (p: string) => /\d/.test(p) },
  { texto: 'Un símbolo (. # @ ! - _ …)', cumple: (p: string) => /[^A-Za-z\d\s]/.test(p) },
]

export function RegisterForm() {
  const { navigate } = useApp()
  
  // 1. ESTADOS
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    ci: '',
    userType: '', 
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData | 'form', string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 2. EFECTOS (Ubicados aquí para asegurar orden constante de Hooks)
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  // 3. MANEJADORES DE LOGICA
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    const validationErrors: Partial<typeof errors> = {}
    
    if (!formData.name) validationErrors.name = 'El nombre completo es requerido'
    if (!formData.ci) validationErrors.ci = 'El CI / NIT es obligatorio'
    
    if (!formData.email) {
      validationErrors.email = 'El correo electrónico es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.email = 'Formato de correo inválido'
    }

    if (!formData.password) {
      validationErrors.password = 'La contraseña es requerida'
    } else if (!REQUISITOS_PASSWORD.every((r) => r.cumple(formData.password))) {
      validationErrors.password = 'La contraseña no cumple todos los requisitos'
    }

    if (formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    
    if (!formData.userType) validationErrors.userType = 'Seleccione su rol'

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    try {
      // 📡 Conexión con Backend Agro Control (Node.js/Express)
      const response = await fetch(`${API_BASE_URL}/auth/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: formData.name,
          email: formData.email,
          password: formData.password,
          telefono: formData.phone,
          ci_nit: formData.ci,
          // Mapeo de roles según la base de datos relacional PostgreSQL
          rol: formData.userType === 'tecnico' ? 'agronomo' : 'productor',
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error en el servidor');

      setSuccess(true)
    } catch (err: any) {
      const msg = err.message || 'Error de conexión';
      if (msg.toLowerCase().includes('correo')) {
        setErrors({ email: 'Este correo ya existe' });
      } else if (msg.toLowerCase().includes('ci')) {
        setErrors({ ci: 'Este CI / NIT ya existe' });
      } else {
        setErrors({ form: msg });
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 4. RENDERIZADO (UI/UX Agro Control)
  return (
    <div className="surface-dark min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-[var(--primary)]">
      <AuthBrandPanel />
      <div className="relative flex items-center justify-center p-4 lg:p-10">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%238dc63f' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <Card className="w-full max-w-md glass-dark border-0 shadow-elevated relative z-10 my-8 overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--tertiary)] to-[var(--tertiary-fixed-dim)] flex items-center justify-center shadow-elevated mb-4">
            <span className="material-symbols-outlined text-[var(--on-tertiary-fixed)] text-3xl">eco</span>
          </div>
          <CardTitle className="text-headline text-[var(--on-primary)]">Registro Institucional</CardTitle>
          <CardDescription className="text-[var(--tertiary)]/80 mt-1 font-medium italic">
            CIAT - Gestión de Suelos Bolivianos
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="mx-auto w-16 h-16 rounded-full bg-[var(--tertiary)]/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--tertiary)] text-3xl">verified</span>
              </div>
              <p className="text-[var(--on-primary)] font-semibold text-lg">¡Cuenta creada exitosamente!</p>
              <p className="text-[var(--on-primary)]/60 text-sm">Redirigiendo al acceso institucional...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Nombre Completo</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">person</span>
                    <Input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg pl-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                    />
                  </div>
                  {errors.name && <FieldError className="text-[var(--error)] mt-1">{errors.name}</FieldError>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">CI / NIT</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">badge</span>
                      <Input
                        type="text"
                        placeholder="1234567 SC"
                        value={formData.ci}
                        onChange={(e) => handleChange('ci', e.target.value)}
                        className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg pl-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                      />
                    </div>
                    {errors.ci && <FieldError className="text-[var(--error)] mt-1">{errors.ci}</FieldError>}
                  </Field>
                  <Field>
                    <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Teléfono</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">call</span>
                      <Input
                        type="tel"
                        placeholder="70000000"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg pl-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                      />
                    </div>
                  </Field>
                </div>

                <Field>
                  <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Correo Electrónico</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">mail</span>
                    <Input
                      type="email"
                      placeholder="usuario@ciat.bo"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg pl-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                    />
                  </div>
                  {errors.email && <FieldError className="text-[var(--error)] mt-1">{errors.email}</FieldError>}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Contraseña</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">lock</span>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg pl-10 pr-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
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
                  <Field>
                    <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Confirmar</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--on-primary)]/40 text-lg">verified_user</span>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg pl-10 focus:ring-2 focus:ring-[var(--tertiary)]/40"
                      />
                    </div>
                    {errors.confirmPassword && <FieldError className="text-[var(--error)] mt-1">{errors.confirmPassword}</FieldError>}
                  </Field>
                </div>

                {/* Requisitos de la contraseña, marcados en tiempo real */}
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 -mt-1">
                  {REQUISITOS_PASSWORD.map((r) => {
                    const ok = r.cumple(formData.password)
                    return (
                      <li
                        key={r.texto}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          ok ? 'text-[var(--tertiary)]' : errors.password ? 'text-[var(--error)]' : 'text-[var(--on-primary)]/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{ok ? 'check_circle' : 'radio_button_unchecked'}</span>
                        {r.texto}
                      </li>
                    )
                  })}
                </ul>
                {errors.password && <FieldError className="text-[var(--error)] -mt-2">{errors.password}</FieldError>}

                <Field>
                  <FieldLabel className="text-[var(--on-primary)]/80 text-sm font-medium">Rol Institucional</FieldLabel>
                  <Select value={formData.userType} onValueChange={(value) => handleChange('userType', value)}>
                    <SelectTrigger className="bg-[var(--on-primary)]/5 border-0 text-[var(--on-primary)] h-11 rounded-lg focus:ring-2 focus:ring-[var(--tertiary)]/40">
                      <SelectValue placeholder="Seleccione su función" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover opacity-100 z-50 shadow-elevated border-[var(--on-primary)]/10">
                      <SelectItem 
                        value="agricultor" 
                        className="focus:bg-[var(--tertiary)]/20 focus:text-[var(--primary)] font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">agriculture</span>
                          Productor Agrícola
                        </div>
                      </SelectItem>
                      <SelectItem 
                        value="tecnico" 
                        className="focus:bg-[var(--tertiary)]/20 focus:text-[var(--primary)] font-semibold"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">engineering</span>
                          Técnico Agrónomo (CIAT)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.userType && <FieldError className="text-[var(--error)] mt-1">{errors.userType}</FieldError>}
                </Field>
              </FieldGroup>

              {errors.form && <FieldError className="text-[var(--error)] text-center text-sm font-medium">{errors.form}</FieldError>}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[var(--tertiary)] hover:bg-[var(--tertiary-fixed-dim)] text-[var(--on-tertiary-fixed)] font-bold h-12 rounded-xl mt-4 transition-smooth shadow-elevated border-0"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Validando datos...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined">how_to_reg</span>
                    Finalizar Registro
                  </div>
                )}
              </Button>

              <div className="text-center pt-4 border-t border-[var(--on-primary)]/5">
                <p className="text-[var(--on-primary)]/60 text-sm">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('login')}
                    className="text-[var(--tertiary)] hover:text-[var(--tertiary-fixed)] font-bold transition-all"
                  >
                    Inicia sesión aquí
                  </button>
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}