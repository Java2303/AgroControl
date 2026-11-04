'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { API_URL, WEB_URL } from '@/lib/api-config'
import type { CertificadoSuelo } from '@/lib/types'
import { STATUS_CHIP, STATUS_LABEL } from '@/lib/sensor-theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const CALIFICACION_CHIP: Record<CertificadoSuelo['calificacion'], string> = {
  'Óptimo': STATUS_CHIP.optimo,
  'Requiere atención': STATUS_CHIP.alerta,
  'Crítico': STATUS_CHIP.critico,
}

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' })

/** Página pública: verifica un certificado de suelo por su código y lo muestra listo para imprimir. */
export default function VerificarPage() {
  return (
    <Suspense fallback={<p className="p-8 text-on-surface-variant">Cargando…</p>}>
      <Verificar />
    </Suspense>
  )
}

function Verificar() {
  const codigoUrl = useSearchParams().get('codigo')?.trim().toUpperCase() ?? ''
  const [codigo, setCodigo] = useState(codigoUrl)
  const [estado, setEstado] = useState<{ cargando: boolean; error: string | null; cert: CertificadoSuelo | null }>({ cargando: !!codigoUrl, error: null, cert: null })

  const consultar = async (c: string) => {
    setEstado({ cargando: true, error: null, cert: null })
    try {
      const r = await fetch(`${API_URL}/certificados/${encodeURIComponent(c)}`)
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.message || 'No se pudo verificar el certificado.')
      setEstado({ cargando: false, error: null, cert: body.data })
    } catch (err) {
      setEstado({ cargando: false, error: err instanceof Error ? err.message : 'No se pudo verificar el certificado.', cert: null })
    }
  }

  useEffect(() => {
    if (codigoUrl) consultar(codigoUrl)
  }, [codigoUrl])

  const cert = estado.cert
  return (
    <main className="min-h-screen bg-surface px-4 py-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        <form
          className="flex flex-col sm:flex-row gap-3 print:hidden"
          onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) consultar(codigo.trim().toUpperCase()) }}
        >
          <Input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Código de verificación (AC-XXXX-XXXX-XXXX)"
            className="font-mono bg-surface-lowest border-0 h-11 rounded-lg"
            aria-label="Código de verificación"
          />
          <Button type="submit" className="h-11 bg-[var(--tertiary)] text-[var(--on-tertiary-fixed)] hover:bg-[var(--tertiary-fixed-dim)] border-0">
            Verificar
          </Button>
          {cert && (
            <Button type="button" variant="outline" onClick={() => window.print()} className="h-11 bg-surface-lowest border-0">
              <span className="material-symbols-outlined text-base mr-1">print</span>Imprimir
            </Button>
          )}
        </form>

        {estado.cargando && <p className="text-on-surface-variant">Verificando el certificado…</p>}
        {estado.error && (
          <p className="text-[var(--error)] flex items-center gap-2" role="alert">
            <span className="material-symbols-outlined">gpp_bad</span>{estado.error}
          </p>
        )}

        {cert && (
          <article className="bg-surface-lowest rounded-xl shadow-ambient p-6 sm:p-10 space-y-6 text-on-surface print:shadow-none print:rounded-none print:p-0">
            <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[var(--outline-variant)] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Agro Control · Centro de Investigación Agrícola Tropical</p>
                <h1 className="text-2xl font-bold mt-1">Certificado de suelo</h1>
                <p className="text-sm text-[var(--success)] flex items-center gap-1 mt-2 print:hidden">
                  <span className="material-symbols-outlined text-base">verified</span>Certificado auténtico, registrado en el sistema
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-on-surface-variant">Código de verificación</p>
                <p className="font-mono text-lg font-bold">{cert.codigo}</p>
                <p className="text-xs text-on-surface-variant mt-1">Emitido el {fechaHora(cert.fechaEmision)}</p>
              </div>
            </header>

            <section className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Dato etiqueta="Parcela" valor={cert.parcela.nombre} />
              <Dato etiqueta="Ubicación" valor={cert.parcela.ubicacion || '—'} />
              <Dato etiqueta="Cultivo" valor={cert.parcela.cultivo || '—'} />
              <Dato etiqueta="Código del lote" valor={cert.lote.codigo} mono />
              <Dato etiqueta="Superficie del lote" valor={`${cert.lote.superficieHa.toFixed(2)} ha`} />
              <Dato
                etiqueta="Rendimiento (última cosecha)"
                valor={cert.rendimiento ? `${cert.rendimiento.cantidad} ${cert.rendimiento.unidad} (${new Date(cert.rendimiento.fecha).toLocaleDateString('es-BO', { timeZone: 'UTC' })})` : 'Sin cosecha registrada'}
              />
            </section>

            <section>
              <h2 className="font-semibold mb-1">Resultado analítico</h2>
              <p className="text-xs text-on-surface-variant mb-3">Lectura del {fechaHora(cert.lectura.fecha)} · Origen: {cert.origen}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-on-surface-variant border-b border-[var(--outline-variant)]">
                      <th className="py-2 pr-3 font-semibold">Variable</th>
                      <th className="py-2 pr-3 font-semibold">Valor</th>
                      <th className="py-2 font-semibold">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Fila variable="pH" valor={cert.lectura.ph.toFixed(1)} categoria={`${cert.interpretacion.ph} (tabla del CIAT)`} estado={cert.estados.ph} />
                    <Fila variable="Fósforo (P)" valor={`${cert.lectura.fosforo} mg/kg`} categoria={`${cert.interpretacion.fosforo} (tabla del CIAT)`} />
                    <Fila variable="Potasio (K)" valor={`${cert.lectura.potasio} mg/kg`} categoria={`${cert.interpretacion.potasio} (tabla del CIAT)`} />
                    <Fila variable="Nitrógeno (N)" valor={`${cert.lectura.nitrogeno} mg/kg`} estado={cert.estados.nitrogeno} />
                    <Fila variable="Humedad" valor={`${cert.lectura.humedad} %`} estado={cert.estados.humedad} />
                    <Fila variable="Temperatura" valor={`${cert.lectura.temperatura} °C`} estado={cert.estados.temperatura} />
                    <Fila variable="Conductividad eléctrica" valor={`${cert.lectura.conductividad} µS/cm`} />
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">Categoría</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-sm ${CALIFICACION_CHIP[cert.calificacion]}`}>{cert.calificacion}</span>
              </div>
              <div>
                <h2 className="font-semibold">Diagnóstico</h2>
                <p className="text-sm mt-1">{cert.diagnostico}</p>
              </div>
              <div>
                <h2 className="font-semibold">Recomendación</h2>
                <ul className="text-sm mt-1 space-y-1 list-disc pl-5">
                  {cert.recomendaciones.map((r) => <li key={r.regla}><span className="font-mono text-xs text-on-surface-variant">{r.regla}</span> {r.texto}</li>)}
                </ul>
              </div>
            </section>

            <footer className="border-t border-[var(--outline-variant)] pt-4 text-xs text-on-surface-variant space-y-1">
              <p>Emitido por: {cert.emitidoPor || '—'}</p>
              <p>
                Las lecturas del sensor son referenciales; la confirmación de un diagnóstico y el nitrógeno total corresponden
                al análisis de laboratorio (RN-10).
              </p>
              <p>
                Verifique este certificado en <span className="font-mono break-all">{`${WEB_URL}/verificar?codigo=${cert.codigo}`}</span>
              </p>
            </footer>
          </article>
        )}
      </div>
    </main>
  )
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{etiqueta}</p>
      <p className={`font-semibold ${mono ? 'font-mono' : ''}`}>{valor}</p>
    </div>
  )
}

function Fila({ variable, valor, categoria, estado }: { variable: string; valor: string; categoria?: string; estado?: CertificadoSuelo['estados']['ph'] }) {
  return (
    <tr className="border-b border-[var(--outline-variant)] last:border-0">
      <td className="py-2 pr-3">{variable}</td>
      <td className="py-2 pr-3 font-semibold">{valor}</td>
      <td className="py-2">
        {categoria && <span className="mr-2">{categoria}</span>}
        {estado && <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${STATUS_CHIP[estado]}`}>{STATUS_LABEL[estado]}</span>}
        {!categoria && !estado && <span className="text-on-surface-variant">—</span>}
      </td>
    </tr>
  )
}
