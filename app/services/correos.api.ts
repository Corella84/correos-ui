/**
 * Servicio para integración con APIs de Correos de Costa Rica
 * 
 * VERSIÓN 2.1 - Con timeout y fallback local
 * Llama a endpoints locales de Remix que actúan como proxy
 * Timeout de 8s para evitar spinner infinito
 * Fallback a datos locales si falla API
 */

import { costaRica, getCantonesByProvincia, getDistritosByCanton } from "~/data/costaRica";

interface Provincia {
  codigo: string;
  nombre: string;
}

interface Canton {
  codigo: string;
  nombre: string;
}

interface Distrito {
  codigo: string;
  nombre: string;
  codigoPostal: string;
}

interface Barrio {
  codigo_barrio: string;
  codigo_sucursal: string;
  nombre: string;
}

// Respuesta según contrato v2
interface CatalogoResponse {
  status: "exito" | "error_servicio_externo";
  tipo?: string;
  datos?: any[];
  provincia_codigo?: string;
  canton_codigo?: string;
  mensaje?: string;
  detalle_error?: string;
  // Legacy fields for backwards compatibility
  success?: boolean;
  data?: any[];
  fuente?: string;
  error?: string;
}

// ==========================================
// CONFIG
// ==========================================
const API_TIMEOUT_MS = 8000;

// ==========================================
// FUNCIONES PÚBLICAS - Con timeout y fallback
// ==========================================

/**
 * Obtiene la lista de provincias de Costa Rica
 * Fuente: Backend → Fallback: datos locales
 */
export async function getProvincias(): Promise<Provincia[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log("📍 Solicitando provincias al servidor...");

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "provincias" }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: CatalogoResponse = await response.json();

    // Contrato v2: usar status/datos, fallback a success/data para compatibilidad
    const isSuccess = result.status === "exito" || result.success;
    const datos = result.datos || result.data;

    if (isSuccess && datos) {
      console.log(`✅ Provincias obtenidas: ${datos.length}`);
      return datos as Provincia[];
    }

    throw new Error(result.mensaje || result.error || "Error desconocido");
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Error obteniendo provincias, usando fallback local:", error);

    // Fallback a datos locales
    return costaRica.map(p => ({ codigo: p.codigo, nombre: p.nombre }));
  }
}

/**
 * Obtiene la lista de cantones para una provincia específica
 * Fuente: Backend → Fallback: datos locales
 */
export async function getCantones(codigoProvincia: string): Promise<Canton[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log(`📍 Solicitando cantones para provincia ${codigoProvincia}...`);

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "cantones",
        provincia_codigo: codigoProvincia,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: CatalogoResponse = await response.json();

    // Contrato v2: usar status/datos, fallback a success/data para compatibilidad
    const isSuccess = result.status === "exito" || result.success;
    const datos = result.datos || result.data;

    if (isSuccess && datos) {
      console.log(`✅ Cantones obtenidos: ${datos.length}`);
      return datos as Canton[];
    }

    throw new Error(result.mensaje || result.error || "Error desconocido");
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Error obteniendo cantones, usando fallback local:", error);

    // Fallback a datos locales
    return getCantonesByProvincia(codigoProvincia).map(c => ({
      codigo: c.codigo,
      nombre: c.nombre
    }));
  }
}

/**
 * Obtiene la lista de distritos para una provincia y cantón específicos
 * Fuente: Backend → Fallback: datos locales
 */
export async function getDistritos(
  codigoProvincia: string,
  codigoCanton: string
): Promise<Distrito[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log(`📍 Solicitando distritos para provincia ${codigoProvincia}, cantón ${codigoCanton}...`);

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "distritos",
        provincia_codigo: codigoProvincia,
        canton_codigo: codigoCanton,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: CatalogoResponse = await response.json();

    // Contrato v2: usar status/datos, fallback a success/data para compatibilidad
    const isSuccess = result.status === "exito" || result.success;
    const datos = result.datos || result.data;

    if (isSuccess && datos) {
      console.log(`✅ Distritos obtenidos: ${datos.length}`);
      return datos as Distrito[];
    }

    throw new Error(result.mensaje || result.error || "Error desconocido");
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Error obteniendo distritos, usando fallback local:", error);

    // Fallback a datos locales
    return getDistritosByCanton(codigoProvincia, codigoCanton).map(d => ({
      codigo: d.codigo,
      nombre: d.nombre,
      codigoPostal: d.codigoPostal
    }));
  }
}

/**
 * Obtiene la lista de barrios/sucursales para un distrito específico
 * Usado para "Entrega en Sucursal"
 * NO tiene fallback local - solo funciona con API
 */
export async function getBarrios(
  codigoProvincia: string,
  codigoCanton: string,
  codigoDistrito: string
): Promise<Barrio[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    console.log(`📍 Solicitando barrios/sucursales para provincia ${codigoProvincia}, cantón ${codigoCanton}, distrito ${codigoDistrito}...`);

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "barrios",
        provincia_codigo: codigoProvincia,
        canton_codigo: codigoCanton,
        distrito_codigo: codigoDistrito,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const result: CatalogoResponse = await response.json();

    const isSuccess = result.status === "exito" || result.success;
    const datos = result.datos || result.data;

    if (isSuccess && datos) {
      console.log(`✅ Barrios/sucursales obtenidos: ${datos.length}`);
      return datos as Barrio[];
    }

    throw new Error(result.mensaje || result.error || "Error desconocido");
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ Error obteniendo barrios/sucursales:", error);
    return []; // No hay fallback para barrios
  }
}
