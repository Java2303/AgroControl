'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useApp } from '@/lib/app-context'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiFetch } from '@/lib/api-client'
import { ROL_LABEL, type User } from '@/lib/types'

type Rol = User['userType']

interface Usuario {
  id: string
  nombre: string
  correo: string
  rol: Rol
  activo: boolean
  fechaRegistro: string
  parcelas: number
}

const ROLES = Object.keys(ROL_LABEL) as Rol[]

/** UC-04: el administrador del CIAT consulta las cuentas, cambia su rol y las activa o desactiva. */
export function UsersView() {
  const { state } = useApp()
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ data: Usuario[] }>('/usuarios')
      .then((r) => setUsuarios(r.data))
      .catch((e) => { setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios.'); setUsuarios([]) })
  }, [])

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return (usuarios ?? []).filter((u) => !termino || [u.nombre, u.correo, ROL_LABEL[u.rol]].some((v) => v.toLowerCase().includes(termino)))
  }, [usuarios, busqueda])

  const actualizar = async (usuario: Usuario, cambios: Partial<Pick<Usuario, 'rol' | 'activo'>>) => {
    setGuardando(usuario.id)
    try {
      const r = await apiFetch<{ data: Usuario }>(`/usuarios/${usuario.id}`, { method: 'PATCH', body: JSON.stringify(cambios) })
      setUsuarios((lista) => (lista ?? []).map((u) => (u.id === usuario.id ? r.data : u)))
      toast.success('Usuario Actualizado', {
        description: cambios.rol ? `${usuario.nombre} ahora es ${ROL_LABEL[cambios.rol]}.`
          : cambios.activo ? `${usuario.nombre} puede volver a iniciar sesión.` : `${usuario.nombre} ya no puede iniciar sesión.`,
      })
    } catch (err) {
      toast.error('No se Pudo Actualizar', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setGuardando(null)
    }
  }

  const resumen = [
    { label: 'Cuentas', value: usuarios?.length ?? 0, icon: 'group' },
    { label: 'Activas', value: usuarios?.filter((u) => u.activo).length ?? 0, icon: 'check_circle' },
    { label: 'Agrónomos', value: usuarios?.filter((u) => u.rol === 'agronomo').length ?? 0, icon: 'agriculture' },
    { label: 'Productores', value: usuarios?.filter((u) => u.rol === 'productor').length ?? 0, icon: 'person' },
  ]

  return (
    <div className="space-y-8">
      <header className="pt-4">
        <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider mb-2">Administración</p>
        <h1 className="text-display-md text-on-surface">Usuarios y Roles</h1>
        <p className="text-on-surface-variant mt-2">
          Cambie el rol de una cuenta o desactívela. Una cuenta desactivada no puede iniciar sesión, pero sus parcelas y su bitácora se conservan.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {resumen.map((t) => (
          <Card key={t.label} className="bg-surface-lowest shadow-ambient border-0">
            <CardContent className="p-4 sm:p-5 flex items-center gap-3">
              <div className="w-11 h-11 flex-none rounded-lg flex items-center justify-center bg-surface-high">
                <span className="material-symbols-outlined text-[var(--primary-container)]">{t.icon}</span>
              </div>
              <div>
                {usuarios === null ? <Skeleton className="w-10 h-8" /> : <p className="text-display-md text-on-surface leading-none">{t.value}</p>}
                <p className="text-xs text-on-surface-variant font-medium mt-1">{t.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, correo o rol…"
          className="pl-10 bg-surface-lowest shadow-ambient border-0 h-10 rounded-full"
        />
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      <section className="space-y-3">
        {usuarios === null
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          : visibles.map((u) => {
            const propia = u.id === state.user?.id
            return (
              <Card key={u.id} className={`bg-surface-lowest shadow-ambient border-0 ${u.activo ? '' : 'opacity-60'}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface truncate">
                      {u.nombre}{propia && <span className="text-xs text-on-surface-variant font-normal"> (usted)</span>}
                    </p>
                    <p className="text-sm text-on-surface-variant truncate">{u.correo}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {u.parcelas} {u.parcelas === 1 ? 'parcela activa' : 'parcelas activas'} · registrado el{' '}
                      {new Date(u.fechaRegistro).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={u.rol} onValueChange={(rol) => actualizar(u, { rol: rol as Rol })} disabled={propia || guardando === u.id}>
                      <SelectTrigger className="w-52 bg-surface-high border-0" aria-label={`Rol de ${u.nombre}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{ROL_LABEL[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <Switch
                        checked={u.activo}
                        onCheckedChange={(activo) => actualizar(u, { activo })}
                        disabled={propia || guardando === u.id}
                        aria-label={`Cuenta de ${u.nombre} activa`}
                      />
                      {u.activo ? 'Activa' : 'Inactiva'}
                    </label>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        {usuarios !== null && visibles.length === 0 && !error && (
          <p className="text-sm text-on-surface-variant">No hay cuentas que coincidan con la búsqueda.</p>
        )}
      </section>
    </div>
  )
}
