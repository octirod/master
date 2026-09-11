export interface ProcessStep {
  id: string;
  label: string;
  area: string;
  hypothesis: string;
  evidence: string;
  impact: string;
  intervention: string;
}

export const processSteps: ProcessStep[] = [
  {
    id: "solicitud",
    label: "Solicitud cliente",
    area: "Comercial / Operaciones",
    hypothesis: "Falta de formalidad o completitud en la solicitud inicial retrasa la planificación y ejecución del servicio.",
    evidence: "Registro formal del requerimiento validado y estructurado según las necesidades operativas.",
    impact: "Demora el inicio del ciclo completo, acortando el margen de tiempo para ejecutar y facturar dentro del mes correspondiente.",
    intervention: "Detección de solicitudes informales y validación preventiva de completitud de datos antes de derivar a planificación."
  },
  {
    id: "plan-viaje",
    label: "Plan viaje",
    area: "Operativo",
    hypothesis: "Asignación ineficiente de recursos o falta de validación de competencias, induciendo a errores posteriores.",
    evidence: "Plan de viaje estructurado con asignación confirmada (equipo y conductor) y rutas validadas.",
    impact: "Errores u omisiones en la asignación generan rechazos y reprogramaciones, impidiendo el flujo natural del servicio.",
    intervention: "Preparación de una lista de restricciones de RRHH, equipo, carga y SSOMA para revisión del plan por el responsable humano; sin asignación automática."
  },
  {
    id: "inf",
    label: "INF",
    area: "Operativo",
    hypothesis: "El significado de INF y su función deben confirmarse. Si representa un hito documental, información incompleta o tardía podría impedir su liberación.",
    evidence: "Primero confirmar qué representa INF, quién lo valida y qué evidencia permite avanzar; luego acordar el criterio de liberación.",
    impact: "Genera cuellos de botella críticos impidiendo que los viajes ejecutados pasen a validación y recolección de documentos.",
    intervention: "Monitoreo del estado de documentos INF y alertar sobre bloqueos en la cadena documental."
  },
  {
    id: "cierre-validacion",
    label: "Cierre viaje / validación",
    area: "Administración / Operativo",
    hypothesis: "Falta de validación oportuna de los viajes realizados, postergando la recopilación de todos los respaldos necesarios.",
    evidence: "Conformidad del servicio confirmada y recopilación completa de los documentos de respaldo (SSOMA, guías, etc.).",
    impact: "Viajes efectivamente ejecutados no pueden avanzar hacia la facturación sin la recolección estricta de documentos, retrasando todo el flujo.",
    intervention: "Conciliación asistida de viajes finalizados contra los documentos de respaldo exigidos por el contrato."
  },
  {
    id: "nv-oc",
    label: "N/V / O/C",
    area: "Comercial / Administración",
    hypothesis: "Demoras en la recepción de Órdenes de Compra o Notas de Venta, o discrepancias frecuentes con las tarifas acordadas.",
    evidence: "Orden de Compra (O/C) o Nota de Venta (N/V) formalmente recibida y conciliada con exactitud frente a la tarifa.",
    impact: "La inexistencia o discrepancia de O/C bloquea la emisión de la HES, frenando el reconocimiento del ingreso.",
    intervention: "Auditoría de consistencia entre el servicio validado y el documento de respaldo financiero, detectando diferencias tarifarias."
  },
  {
    id: "hes",
    label: "HES",
    area: "Administración / Cliente",
    hypothesis: "El cliente retrasa la aprobación del estado de pago (Hoja de Entrada de Servicio) por procesos burocráticos o disputas.",
    evidence: "HES aprobada sin observaciones por parte del cliente y liberada para facturación.",
    impact: "Impacto directo en la emisión; sin HES validada, el hito de facturación queda postergado, incrementando el retraso al mes siguiente.",
    intervention: "Seguimiento centralizado de HES pendientes de aprobación, proyectando el riesgo de impacto para el cierre contable."
  },
  {
    id: "factura",
    label: "Factura",
    area: "Administración",
    hypothesis: "Errores manuales o consolidación tardía en pasos previos fuerzan la emisión de la factura a periodos extendidos.",
    evidence: "Factura emitida, conciliada y enviada correctamente al cliente.",
    impact: "Genera cierre y facturación estructuralmente posterior al día 10 del mes siguiente, afectando severamente el flujo de caja.",
    intervention: "Validación final de pre-facturación para asegurar que todos los requisitos previos estén alineados y libres de errores."
  }
];
