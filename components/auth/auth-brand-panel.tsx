const FUNCIONES = [
  { icon: 'sensors', titulo: 'Monitoreo IoT continuo', texto: 'Humedad, temperatura, pH y NPK de cada lote.' },
  { icon: 'satellite_alt', titulo: 'Parcelas georreferenciadas', texto: 'Trazado sobre mapa satelital con validación de 50 ha.' },
  { icon: 'rule', titulo: 'Recomendaciones del CIAT', texto: 'Motor de reglas con umbrales agronómicos verificables.' },
]

/**
 * Panel institucional del login y registro (solo en pantallas grandes).
 * Ilustración vectorial de surcos y curvas de nivel: no depende de imágenes externas,
 * por lo que funciona igual en la web y dentro de la app Android.
 */
export function AuthBrandPanel() {
  return (
    <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-[#002147] via-[#00305f] to-[#005293] text-[var(--on-primary)]">
      {/* Ilustración: surcos en perspectiva y curvas de nivel */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="#8dc63f" strokeOpacity="0.16" strokeWidth="1.5">
          {Array.from({ length: 14 }, (_, i) => {
            const x = -300 + i * 110
            return <path key={i} d={`M620 640 Q ${620 + (x - 620) * 0.45} 780 ${x + 220} 900`} />
          })}
        </g>
        <g fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1">
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse key={i} cx="640" cy="170" rx={60 + i * 55} ry={40 + i * 38} transform="rotate(-18 640 170)" />
          ))}
        </g>
        <rect x="0" y="0" width="800" height="660" fill="url(#horizonte)" />
        <defs>
          <linearGradient id="horizonte" x1="0" y1="0" x2="0" y2="1">
            <stop offset="70%" stopColor="#002147" stopOpacity="0" />
            <stop offset="100%" stopColor="#8dc63f" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {/* Nodo sensor con ondas */}
        <g transform="translate(620 640)">
          <circle r="70" fill="none" stroke="#8dc63f" strokeOpacity="0.12" />
          <circle r="42" fill="none" stroke="#8dc63f" strokeOpacity="0.2" />
          <circle r="18" fill="none" stroke="#8dc63f" strokeOpacity="0.35" />
          <circle r="6" fill="#8dc63f" />
        </g>
      </svg>

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8dc63f]" />
          CIAT · Santa Cruz, Bolivia
        </span>
      </div>

      <div className="relative max-w-lg">
        <h2 className="text-display-md xl:text-display-lg text-white">
          Trazabilidad de suelos en <span className="text-[#8dc63f]">tiempo real</span>
        </h2>
        <p className="mt-5 text-lg text-white/70 leading-relaxed">
          Del sensor en campo a la recomendación agronómica: el historial químico de cada parcela, en un solo lugar.
        </p>

        <ul className="mt-10 space-y-5">
          {FUNCIONES.map((f) => (
            <li key={f.titulo} className="flex items-start gap-4">
              <span className="flex-none w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#8dc63f]">{f.icon}</span>
              </span>
              <div>
                <p className="font-semibold text-white">{f.titulo}</p>
                <p className="text-sm text-white/60 mt-0.5">{f.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/40">
        Centro de Investigación Agrícola Tropical · Sistema de gestión y trazabilidad de suelos
      </p>
    </aside>
  )
}
