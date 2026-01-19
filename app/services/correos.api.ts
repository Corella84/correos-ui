/**
 * Servicio para integración con APIs de Correos de Costa Rica
 * 
 * VERSIÓN 2.0 - Cliente del lado del navegador
 * Ahora llama a endpoints locales de Remix que actúan como proxy
 * Esto resuelve el problema de CORS
 */

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
// FUNCIONES PÚBLICAS - Llaman a endpoints locales de Remix
// ==========================================

/**
 * Obtiene la lista de provincias de Costa Rica
 */
export async function getProvincias(): Promise<Provincia[]> {
  try {
    console.log("📍 Solicitando provincias al servidor local...");

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo: "provincias",
      }),
    });

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
    console.error("❌ Error obteniendo provincias:", error);

    // Fallback a datos estáticos solo si falla completamente
    return [
      { codigo: "1", nombre: "San José" },
      { codigo: "2", nombre: "Alajuela" },
      { codigo: "3", nombre: "Cartago" },
      { codigo: "4", nombre: "Heredia" },
      { codigo: "5", nombre: "Guanacaste" },
      { codigo: "6", nombre: "Puntarenas" },
      { codigo: "7", nombre: "Limón" },
    ];
  }
}

/**
 * Obtiene la lista de cantones para una provincia específica
 */
export async function getCantones(codigoProvincia: string): Promise<Canton[]> {
  try {
    console.log(`📍 Solicitando cantones para provincia ${codigoProvincia}...`);

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo: "cantones",
        provincia_codigo: codigoProvincia,
      }),
    });

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
    console.error("❌ Error obteniendo cantones:", error);
    return [];
  }
}

/**
 * Obtiene la lista de distritos para una provincia y cantón específicos
 */
export async function getDistritos(
  codigoProvincia: string,
  codigoCanton: string
): Promise<Distrito[]> {
  try {
    console.log(`📍 Solicitando distritos para provincia ${codigoProvincia}, cantón ${codigoCanton}...`);

    const response = await fetch("/api/catalogo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo: "distritos",
        provincia_codigo: codigoProvincia,
        canton_codigo: codigoCanton,
      }),
    });

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
    console.error("❌ Error obteniendo distritos:", error);
    return [];
  }
}
