# Archivos Creados/Modificados HOY - Para Aplicar en Cursor

**Fecha:** 18 de Enero 2026
**Objetivo:** Resolver CORS creando endpoints del servidor en Remix

---

## ✅ INSTRUCCIONES PARA CURSOR

1. **Restaura el proyecto** a como estaba cuando funcionaba (hoy a las 12)
2. **Copia estos 3 archivos** exactamente como están aquí
3. **NO modifiques** `entry.server.tsx`, `entry.client.tsx`, `package.json`, `vite.config.ts` ni `tsconfig.json`
4. **Corre** `npm run dev` y debería funcionar

---

## 📁 ARCHIVO 1: `/app/routes/api.catalogo.tsx`

**Descripción:** Endpoint del servidor que actúa como proxy a la API de Correos de Costa Rica. Resuelve el problema de CORS.

**Acción:** CREAR este archivo nuevo

```typescript
/**
 * Remix Resource Route: /api/catalogo
 *
 * Endpoint del lado del servidor para obtener datos geográficos de Correos de Costa Rica
 * Resuelve el problema de CORS actuando como proxy entre el navegador y la API externa
 */

import { json, type ActionFunctionArgs } from "@remix-run/node";

// ==========================================
// CONFIGURACIÓN Y CREDENCIALES
// ==========================================

const TOKEN_URL = "https://servicios.correos.go.cr:447/Token/authenticate";
const SOAP_URL = "https://amistadpro.correos.go.cr:444/wsAppCorreos.wsAppCorreos.svc";

interface AuthCredentials {
  usuario: string;
  clave: string;
  sistema: string;
}

const CORREOS_CREDENTIALS: AuthCredentials = {
  usuario: "ccrWS397761",
  clave: "hwoeDmZwyZ",
  sistema: "PYMEXPRESS",
};

// ==========================================
// CACHE DE TOKEN EN MEMORIA
// ==========================================

interface TokenResponse {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenResponse | null = null;

async function getAuthToken(): Promise<string> {
  const now = Date.now();

  // Usar token en cache si es válido (con 30 segundos de margen)
  if (tokenCache && tokenCache.expiresAt > now + 30000) {
    console.log("🔑 Usando token en cache");
    return tokenCache.token;
  }

  console.log("🔑 Solicitando nuevo token a Correos API");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(CORREOS_CREDENTIALS),
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const token = data.token || data.Token || data.access_token;

  if (!token) {
    throw new Error("El servidor de autenticación no devolvió un token válido");
  }

  // Guardar en cache con expiración de 5 minutos
  tokenCache = {
    token,
    expiresAt: now + 300000, // 5 minutos
  };

  console.log("✅ Token obtenido exitosamente");
  return token;
}

// ==========================================
// LLAMADAS SOAP
// ==========================================

async function callSOAP(action: string, params: Record<string, any>): Promise<any> {
  const token = await getAuthToken();

  // Construir parámetros XML
  let paramsXML = "";
  for (const [key, value] of Object.entries(params)) {
    paramsXML += `<${key}>${value}</${key}>`;
  }

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${action} xmlns="http://tempuri.org/">
      <token>${token}</token>
      ${paramsXML}
    </${action}>
  </soap:Body>
</soap:Envelope>`;

  console.log(`📡 Llamando a SOAP action: ${action}`);

  const response = await fetch(SOAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://tempuri.org/${action}`,
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    throw new Error(`Error en llamada SOAP: ${response.status} ${response.statusText}`);
  }

  const responseText = await response.text();
  console.log(`✅ Respuesta SOAP recibida para ${action}`);

  // Parsear XML a JSON (implementación básica)
  const resultMatch = responseText.match(/<([^>]+Result)>([\s\S]*?)<\/\1>/);
  if (!resultMatch) {
    throw new Error("No se pudo parsear la respuesta SOAP");
  }

  const resultXML = resultMatch[2];

  // Extraer datos según el tipo de llamada
  return parseSOAPResult(action, resultXML);
}

function parseSOAPResult(action: string, xml: string): any {
  // Parseo simple de XML a objetos JavaScript
  // En producción, usar una librería como xml2js o fast-xml-parser

  if (action === "ccrCodProvincia") {
    const provincias: Array<{ codigo: string; nombre: string }> = [];
    const matches = xml.matchAll(/<Codigo>(\d+)<\/Codigo>[\s\S]*?<Nombre>([^<]+)<\/Nombre>/g);

    for (const match of matches) {
      provincias.push({
        codigo: match[1],
        nombre: match[2],
      });
    }

    return provincias;
  }

  if (action === "ccrCodCanton") {
    const cantones: Array<{ codigo: string; nombre: string }> = [];
    const matches = xml.matchAll(/<Codigo>(\d+)<\/Codigo>[\s\S]*?<Nombre>([^<]+)<\/Nombre>/g);

    for (const match of matches) {
      cantones.push({
        codigo: match[1],
        nombre: match[2],
      });
    }

    return cantones;
  }

  if (action === "ccrCodDistrito") {
    const distritos: Array<{ codigo: string; nombre: string; codigoPostal: string }> = [];
    const matches = xml.matchAll(
      /<Codigo>(\d+)<\/Codigo>[\s\S]*?<Nombre>([^<]+)<\/Nombre>[\s\S]*?<CodigoPostal>(\d+)<\/CodigoPostal>/g
    );

    for (const match of matches) {
      distritos.push({
        codigo: match[1],
        nombre: match[2],
        codigoPostal: match[3],
      });
    }

    return distritos;
  }

  return [];
}

// ==========================================
// FUNCIONES DE NEGOCIO
// ==========================================

async function getProvincias() {
  console.log("📍 Obteniendo provincias...");
  return await callSOAP("ccrCodProvincia", {});
}

async function getCantones(codigoProvincia: string) {
  console.log(`📍 Obteniendo cantones para provincia ${codigoProvincia}...`);
  return await callSOAP("ccrCodCanton", { CodigoProvincia: codigoProvincia });
}

async function getDistritos(codigoProvincia: string, codigoCanton: string) {
  console.log(`📍 Obteniendo distritos para provincia ${codigoProvincia}, cantón ${codigoCanton}...`);
  return await callSOAP("ccrCodDistrito", {
    CodigoProvincia: codigoProvincia,
    CodigoCanton: codigoCanton,
  });
}

// ==========================================
// REMIX ACTION (ENDPOINT)
// ==========================================

export async function action({ request }: ActionFunctionArgs) {
  // Solo aceptar POST
  if (request.method !== "POST") {
    return json({ error: "Método no permitido" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { tipo, provincia_codigo, canton_codigo } = body;

    console.log(`📥 Request recibido: tipo=${tipo}, provincia=${provincia_codigo}, canton=${canton_codigo}`);

    // Validar tipo
    if (!tipo || !["provincias", "cantones", "distritos"].includes(tipo)) {
      return json(
        {
          status: "error",
          mensaje: "Tipo de catálogo inválido. Debe ser: provincias, cantones o distritos",
        },
        { status: 400 }
      );
    }

    // Procesar según tipo
    if (tipo === "provincias") {
      const provincias = await getProvincias();
      return json({
        status: "exito",
        data: provincias,
        total: provincias.length,
      });
    }

    if (tipo === "cantones") {
      if (!provincia_codigo) {
        return json(
          {
            status: "error",
            mensaje: "provincia_codigo es requerido para obtener cantones",
          },
          { status: 400 }
        );
      }

      const cantones = await getCantones(provincia_codigo);
      return json({
        status: "exito",
        data: cantones,
        total: cantones.length,
      });
    }

    if (tipo === "distritos") {
      if (!provincia_codigo || !canton_codigo) {
        return json(
          {
            status: "error",
            mensaje: "provincia_codigo y canton_codigo son requeridos para obtener distritos",
          },
          { status: 400 }
        );
      }

      const distritos = await getDistritos(provincia_codigo, canton_codigo);
      return json({
        status: "exito",
        data: distritos,
        total: distritos.length,
      });
    }

    return json({ status: "error", mensaje: "Tipo no implementado" }, { status: 400 });
  } catch (error) {
    console.error("❌ Error en /api/catalogo:", error);

    // Determinar si es error de servicio externo o error interno
    const isExternalError =
      error instanceof Error &&
      (error.message.includes("fetch") || error.message.includes("SOAP") || error.message.includes("token"));

    if (isExternalError) {
      return json(
        {
          status: "error_servicio_externo",
          mensaje: "No se pudo establecer comunicación con el servicio de Correos de Costa Rica.",
          detalle_error: error instanceof Error ? error.message : "Error desconocido",
        },
        { status: 503 }
      );
    }

    return json(
      {
        status: "error_interno",
        mensaje: "Ocurrió un error inesperado en el servidor.",
        detalle_error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
```

---

## 📁 ARCHIVO 2: `/app/services/correos.api.ts`

**Descripción:** Cliente del lado del navegador que ahora llama a endpoints locales de Remix en vez de la API externa. Esto resuelve CORS.

**Acción:** REEMPLAZAR completamente el archivo existente

```typescript
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
  status: string;
  data: any[];
  total: number;
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
    
    if (result.status === "exito") {
      console.log(`✅ Provincias obtenidas: ${result.total}`);
      return result.data as Provincia[];
    }

    throw new Error(result.mensaje || "Error desconocido");
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
    
    if (result.status === "exito") {
      console.log(`✅ Cantones obtenidos: ${result.total}`);
      return result.data as Canton[];
    }

    throw new Error(result.mensaje || "Error desconocido");
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
    
    if (result.status === "exito") {
      console.log(`✅ Distritos obtenidos: ${result.total}`);
      return result.data as Distrito[];
    }

    throw new Error(result.mensaje || "Error desconocido");
  } catch (error) {
    console.error("❌ Error obteniendo distritos:", error);
    return [];
  }
}
```

---

## 📁 ARCHIVO 3: `contrato-api-correos-v2-CORREGIDO.md`

**Descripción:** Documentación completa del contrato API corregido.

**Acción:** Este archivo YA EXISTE en el proyecto. No necesitás hacer nada, solo para tu referencia.

**Ubicación:** `/Users/juandiegocorellavega/Desktop/correos-ui/contrato-api-correos-v2-CORREGIDO.md`

---

## ✅ PASOS EN CURSOR

1. Abrí el proyecto en Cursor
2. Restaurá el proyecto a como estaba a las 12:00 (si tenés algún backup o commit)
3. Creá el archivo `/app/routes/api.catalogo.tsx` con el contenido de ARCHIVO 1
4. Reemplazá completamente `/app/services/correos.api.ts` con el contenido de ARCHIVO 2
5. Verificá que el archivo `contrato-api-correos-v2-CORREGIDO.md` exista
6. Corré `npm run dev` en la terminal de Cursor
7. Abrí http://localhost:5173/ en el navegador
8. Probá navegar a la pantalla de revisión de una orden
9. Abrí la consola del navegador (F12) y verificá que NO haya errores de CORS
10. Deberías ver mensajes como: "📍 Solicitando provincias al servidor local..." y "✅ Provincias obtenidas: 7"

---

## 🎯 RESULTADO ESPERADO

- ✅ Servidor corre sin errores
- ✅ Página carga correctamente
- ✅ NO hay errores de CORS en la consola
- ✅ Las provincias se cargan desde la API de Correos a través del proxy
- ✅ Al seleccionar provincia, se cargan los cantones
- ✅ Al seleccionar cantón, se cargan los distritos

---

## 📝 NOTAS IMPORTANTES

- NO modifiques `entry.server.tsx` ni `entry.client.tsx`
- NO modifiques `package.json` (dejá las versiones que ya tenías)
- NO modifiques `vite.config.ts` ni `tsconfig.json`
- El único cambio arquitectónico es: navegador → Remix local → API Correos
- Esto resuelve CORS porque el navegador llama a tu propio servidor, no a Correos directamente

---

**Creado por:** Claude
**Fecha:** 18 de Enero 2026, 7:30 AM
