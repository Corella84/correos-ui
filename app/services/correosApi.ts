/**
 * Cliente Mock de API de Correos de Costa Rica
 * 
 * Simula las llamadas al backend sin hacer requests reales.
 * En producción, este archivo se reemplazará por llamadas HTTP reales.
 */

export interface SolicitudGuia {
  remitente: {
    nombre: string;
    direccion: string;
    telefono: string;
    codigo_postal: string;
  };
  destinatario: {
    nombre: string;
    direccion: string;
    telefono: string;
    codigo_postal: string;
    codigo_postal_zip?: string;
  };
  peso: number;
  monto_flete: number;
  observaciones?: string;
}

export interface RespuestaGuia {
  exito: boolean;
  numero_envio: string | null;
  codigo_respuesta?: string;
  mensaje_respuesta?: string;
  pdf_base64?: string;
  error?: string;
}

/**
 * Simula el delay de una llamada HTTP real
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Genera un número de guía mock con formato CRXXXXXXXXXCR
 */
function generarNumeroGuiaMock(): string {
  const numero = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, "0");
  return `CR${numero}CR`;
}

/**
 * Mock del endpoint POST /generar_guia
 * 
 * Simula la generación de una guía de Correos con delay y posibles errores.
 */
export async function generarGuia(
  solicitud: SolicitudGuia
): Promise<RespuestaGuia> {
  // Simular delay de red (1-2 segundos)
  await delay(1500 + Math.random() * 500);

  // Simular error aleatorio (10% de probabilidad)
  if (Math.random() < 0.1) {
    const errores = [
      "No se pudo conectar con el servicio de Correos. Por favor, intenta nuevamente.",
      "Error al validar los datos del envío. Verifica que todos los campos estén completos.",
      "El código postal ingresado no es válido.",
      "Error temporal del servicio. Por favor, intenta en unos minutos.",
    ];
    const errorAleatorio = errores[Math.floor(Math.random() * errores.length)];

    return {
      exito: false,
      numero_envio: null,
      error: errorAleatorio,
    };
  }

  // Simular éxito
  const numeroGuia = generarNumeroGuiaMock();
  const pdfUrlMock = `https://api.correos.cr/guides/${numeroGuia}.pdf`;

  return {
    exito: true,
    numero_envio: numeroGuia,
    codigo_respuesta: "00",
    mensaje_respuesta: "Guía generada exitosamente",
    pdf_base64: btoa(`PDF_MOCK_${numeroGuia}`), // Base64 mock del PDF
  };
}
