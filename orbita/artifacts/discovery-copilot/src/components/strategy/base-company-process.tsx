import { useState } from "react"
import { processSteps, ProcessStep } from "@/data/base-process"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  AlertTriangle, 
  Clock, 
  Activity, 
  CheckCircle2,
  Workflow,
  Search,
  BookOpen,
  Link as LinkIcon,
  HelpCircle,
  Lightbulb,
  FileText
} from "lucide-react"

export function BaseCompanyProcess() {
  const [selectedStep, setSelectedStep] = useState<ProcessStep>(processSteps[0])

  return (
    <Card className="bg-card shadow-sm border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-6">
        <div className="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Workflow size={20} className="text-primary" />
              <CardTitle className="text-xl font-bold tracking-tight">Proceso Base: Transporte y Liquidación</CardTitle>
            </div>
            <CardDescription className="text-sm max-w-3xl leading-relaxed">
              Descubrimiento guiado por evidencia para JTSA/Segitec. El objetivo de esta sección es identificar la raíz de las restricciones en cada paso del proceso que están forzando la facturación a fechas tardías.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge variant="outline" className="font-mono text-[10px] bg-background/50 border-muted text-muted-foreground whitespace-normal break-all">
                <FileText size={12} className="mr-1" /> ORIGEN: Proceso_Base_JTSA_1789151546429.jpg
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 whitespace-normal">
                <HelpCircle size={12} className="mr-1" /> CONFIRMACIÓN PENDIENTE: Orden, flechas originales e hitos INF/NV/MEL
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 md:text-right bg-background p-3 rounded-xl border shadow-sm">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left md:text-right">
              Métrica de Dolor (Cierre y Facturación)
            </div>
            <div className="flex flex-wrap items-center md:justify-end gap-4">
              <div>
                <div className="text-[10px] uppercase text-destructive font-bold mb-1">Reportado (Dolor)</div>
                <div className="font-mono font-bold text-destructive flex items-center gap-1">
                  &gt; Día 10 <span className="text-xs text-destructive/70 ml-1">del mes siguiente</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div>
                <div className="text-[10px] uppercase text-emerald-600 font-bold mb-1">Objetivo (Propuesto)</div>
                <div className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                  &le; Día 10 <span className="text-xs text-emerald-600/70 ml-1">del mes siguiente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x">
          
          {/* Left Column: Interactive Selector */}
          <div className="lg:col-span-1 p-6 bg-muted/10">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Search size={14} /> Fases de Ejecución
            </h4>
            
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-px bg-border/60 z-0"></div>
              <div className="space-y-3 relative z-10">
                {processSteps.map((step, index) => {
                  const isSelected = selectedStep.id === step.id;
                  const isLast = index === processSteps.length - 1;
                  
                  return (
                    <div key={step.id} className="relative">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedStep(step)}
                        className={`w-full text-left flex items-center gap-4 p-3 rounded-xl transition-all duration-200 border ${
                          isSelected 
                            ? "bg-primary text-primary-foreground border-primary shadow-md" 
                            : "bg-background hover:bg-muted border-border"
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full shrink-0 border-2 ${
                          isSelected ? "bg-primary-foreground border-primary-foreground" : "bg-background border-muted-foreground"
                        }`} />
                        <div className="flex-1">
                          <div className={`font-bold text-sm ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                            {step.label}
                          </div>
                          <div className={`text-[10px] uppercase tracking-wide mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {step.area}
                          </div>
                        </div>
                        {!isLast && !isSelected && (
                          <ArrowRight size={14} className="text-muted-foreground/40" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
              <strong>Nota de Transcripción:</strong> Las flechas en el diagrama de pizarra original apuntan en dirección contraria (de Factura hacia Solicitud cliente), lo que sugiere un análisis de dependencias inverso. El orden presentado aquí es la secuencia de ejecución cronológica interpretada.
            </div>
          </div>

          {/* Right Column: Step Details */}
          <div className="lg:col-span-2 p-6 xl:p-8 bg-background">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Activity size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-foreground">{selectedStep.label}</h3>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-secondary/50">
                    Área propuesta: {selectedStep.area}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              
              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500 flex items-center gap-2 mb-2">
                    <Lightbulb size={16} /> Hipótesis de Restricción (Cuello de Botella)
                  </h4>
                  <p className="text-sm leading-relaxed font-medium text-foreground/90">
                    {selectedStep.hypothesis}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border shadow-sm rounded-xl p-5">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Evidencia / criterio propuesto
                    </h4>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {selectedStep.evidence}
                    </p>
                  </div>
                  
                  <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-5">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive/80 flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-destructive" /> Impacto Aguas Abajo
                    </h4>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {selectedStep.impact}
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-2">
                    <BookOpen size={16} /> Intervención Propuesta ÓRBITA
                  </h4>
                  <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                    {selectedStep.intervention}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-primary/10 flex items-center gap-1.5">
                    <Clock size={12} /> Propuesta sujeta a revisión humana; no ejecuta ni aprueba operaciones.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
        
        {/* Cross-Cutting Footer */}
        <div className="bg-muted/40 p-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
              <LinkIcon size={14} /> Elementos Transversales (Cross-Cutting)
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-background shadow-sm border-muted-foreground/20 text-xs py-1">
                Contrato
              </Badge>
              <Badge variant="outline" className="bg-background shadow-sm border-muted-foreground/20 text-xs py-1">
                Excel de Rutas y Tarifas
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Estos elementos documentales aplican de forma continua a lo largo del proceso. Cualquier inconsistencia entre la operación en terreno y el contrato o matriz tarifaria desencadena reprocesos que extienden el tiempo total de ciclo.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
              <Activity size={14} /> Cadencia de Revisión Sugerida
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Propuesta por validar: revisar restricciones diariamente durante el mes; conciliar viajes y respaldos al cierre; revisar pendientes con el cliente entre los días 1 y 5 y escalar bloqueos entre los días 6 y 10 del mes siguiente.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Indicadores propuestos, aún sin medición: días de espera por etapa, antigüedad y monto pendiente de facturar, porcentaje de respaldos completos y fecha efectiva de cierre y facturación. Validar también MEL, competencia del conductor y validación del requerimiento con el equipo.
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1 shrink-0" />
                <span><strong className="text-foreground">Comercial:</strong> Revisión de adherencia a contratos y validación de feedback de clientes (KPI pendiente de definición).</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1 shrink-0" />
                <span><strong className="text-foreground">Operaciones:</strong> Disponibilidad RRHH/Equipo, control de carga y normativas SSOMA.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1 shrink-0" />
                <span><strong className="text-foreground">Auditoría Continua:</strong> Foco principal en descubrir restricciones (root-cause discovery) en lugar de presionar por emisión de facturas sin sustento.</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
