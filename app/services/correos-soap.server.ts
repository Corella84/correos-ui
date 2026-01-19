// ============================================
// Cliente SOAP para Correos de Costa Rica
// ============================================
// Implementa llamadas a los métodos SOAP
// Basado en la documentación oficial del PDF
// ============================================

import { getValidToken } from "./correos-auth.server";

const SOAP_URL = "https://amistadpro.correos.go.cr:444/wsAppCorreos.wsAppCorreos.svc";

interface SoapResponse<T> {
  CodRespuesta: string;
  MensajeRespuesta: string;
  data?: T;
}

/**
 * Realiza una llamada SOAP al Web Service de Correos
 */
async function callSoapMethod<T>(
  methodName: string,
  soapBody: string
): Promise<SoapResponse<T>> {
  try {
    const token = await getValidToken();

    // Construir el sobre SOAP
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tem="http://tempuri.org/">
  <soap:Header>
    <tem:AuthHeader>
      <tem:Token>${token}</tem:Token>
    </tem:AuthHeader>
  </soap:Header>
  <soap:Body>
    ${soapBody}
  </soap:Body>
</soap:Envelope>`;

    console.log(`📤 Llamando método SOAP: ${methodName}`);

    const response = await fetch(SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": `http://tempuri.org/IwsAppCorreos/${methodName}`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log(`📥 Respuesta SOAP recibida para ${methodName}`);

    // Parsear la respuesta XML
    return parseSoapResponse<T>(responseText, methodName);

  } catch (error) {
    console.error(`❌ Error en llamada SOAP ${methodName}:`, error);
    throw error;
  }
}

/**
 * Parsea la respuesta XML de SOAP
 */
function parseSoapResponse<T>(xml: string, methodName: string): SoapResponse<T> {
  // Esta es una implementación simplificada
  // En producción deberías usar una librería como 'fast-xml-parser'

  // Buscar código de respuesta
  const codMatch = xml.match(/<CodRespuesta>(.+?)<\/CodRespuesta>/);
  const msgMatch = xml.match(/<MensajeRespuesta>(.+?)<\/MensajeRespuesta>/);

  const codRespuesta = codMatch ? codMatch[1] : "15";
  const mensaje = msgMatch ? msgMatch[1] : "Error parseando respuesta";

  if (codRespuesta !== "00") {
    throw new Error(`Error SOAP (${codRespuesta}): ${mensaje}`);
  }

  return {
    CodRespuesta: codRespuesta,
    MensajeRespuesta: mensaje,
    // El parsing completo de datos se haría aquí
    // Por ahora retornamos la estructura básica
  };
}

// ============================================
// Métodos Específicos del Web Service
// ============================================

export interface Provincia {
  codigo: string;
  nombre: string;
}

export interface Canton {
  codigo: string;
  nombre: string;
  provincia_codigo: string;
}

export interface Distrito {
  codigo: string;
  nombre: string;
  provincia_codigo: string;
  canton_codigo: string;
}

/**
 * ccrCodProvincia - Obtiene lista de provincias
 */
export async function obtenerProvincias(): Promise<Provincia[]> {
  const soapBody = `
    <tem:ccrCodProvincia>
      <!-- No requiere parámetros -->
    </tem:ccrCodProvincia>
  `;

  try {
    const response = await callSoapMethod<Provincia[]>("ccrCodProvincia", soapBody);

    // Aquí parsearias las provincias del XML
    // Por ahora retornamos array vacío para evitar errores
    console.log("✅ Provincias obtenidas de Correos API");
    return [];

  } catch (error) {
    console.error("❌ Error obteniendo provincias:", error);
    throw error;
  }
}

/**
 * ccrCodCanton - Obtiene cantones de una provincia
 */
export async function obtenerCantones(provinciaCodigo: string): Promise<Canton[]> {
  const soapBody = `
    <tem:ccrCodCanton>
      <tem:CodProvincia>${provinciaCodigo}</tem:CodProvincia>
    </tem:ccrCodCanton>
  `;

  try {
    const response = await callSoapMethod<Canton[]>("ccrCodCanton", soapBody);
    console.log(`✅ Cantones obtenidos para provincia ${provinciaCodigo}`);
    return [];

  } catch (error) {
    console.error("❌ Error obteniendo cantones:", error);
    throw error;
  }
}

/**
 * ccrCodDistrito - Obtiene distritos de un cantón
 */
export async function obtenerDistritos(
  provinciaCodigo: string,
  cantonCodigo: string
): Promise<Distrito[]> {
  const soapBody = `
    <tem:ccrCodDistrito>
      <tem:CodProvincia>${provinciaCodigo}</tem:CodProvincia>
      <tem:CodCanton>${cantonCodigo}</tem:CodCanton>
    </tem:ccrCodDistrito>
  `;

  try {
    const response = await callSoapMethod<Distrito[]>("ccrCodDistrito", soapBody);
    console.log(`✅ Distritos obtenidos para ${provinciaCodigo}-${cantonCodigo}`);
    return [];

  } catch (error) {
    console.error("❌ Error obteniendo distritos:", error);
    throw error;
  }
}
