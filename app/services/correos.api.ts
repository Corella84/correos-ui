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

interface CatalogoResponse {
  success: boolean;
  data: any[];
  fuente: string;
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

    if (result.success && result.data) {
      console.log(`✅ Provincias obtenidas (${result.fuente}): ${result.data.length}`);
      return result.data as Provincia[];
    }

    throw new Error(result.error || "Error desconocido");
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

    if (result.success && result.data) {
      console.log(`✅ Cantones obtenidos (${result.fuente}): ${result.data.length}`);
      return result.data as Canton[];
    }

    throw new Error(result.error || "Error desconocido");
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

    if (result.success && result.data) {
      console.log(`✅ Distritos obtenidos (${result.fuente}): ${result.data.length}`);
      return result.data as Distrito[];
    }

    throw new Error(result.error || "Error desconocido");
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
