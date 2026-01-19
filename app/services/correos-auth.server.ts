// ============================================
// Manejador de Autenticación con Correos API
// ============================================
// Maneja tokens con expiración de 5 minutos
// Implementa cache y renovación automática
// ============================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Cache del token en memoria
let tokenCache: CachedToken | null = null;

// Credenciales desde el PDF oficial
const CORREOS_CONFIG = {
  TOKEN_URL: "https://servicios.correos.go.cr:447/Token/authenticate",
  USERNAME: "ccrWS397761",
  PASSWORD: "hwoeDmZwyZ",
  SISTEMA: "PYMEXPRESS",
  USUARIO_ID: 397761,
  SERVICIO_ID: 73,
  CODIGO_CLIENTE: "397761",
} as const;

/**
 * Obtiene un token válido (desde cache o solicitando uno nuevo)
 * El token expira en 5 minutos según la documentación oficial
 */
export async function getValidToken(): Promise<string> {
  const now = Date.now();

  // Si tenemos token en cache y no ha expirado, usarlo
  if (tokenCache && tokenCache.expiresAt > now) {
    const remainingSeconds = Math.floor((tokenCache.expiresAt - now) / 1000);
    console.log(`🔑 Usando token en cache (expira en ${remainingSeconds}s)`);
    return tokenCache.token;
  }

  // Si no hay token válido, solicitar uno nuevo
  console.log("🔑 Solicitando nuevo token a Correos API");
  return await requestNewToken();
}

/**
 * Solicita un nuevo token al endpoint de autenticación
 */
async function requestNewToken(): Promise<string> {
  try {
    console.log("🔑 Renovando token de autenticación...");
    console.log(`📍 URL: ${CORREOS_CONFIG.TOKEN_URL}`);
    console.log(`👤 Username: ${CORREOS_CONFIG.USERNAME}`);

    const response = await fetch(CORREOS_CONFIG.TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        Username: CORREOS_CONFIG.USERNAME,
        Password: CORREOS_CONFIG.PASSWORD,
        Sistema: CORREOS_CONFIG.SISTEMA,
      }),
    });

    console.log(`📊 Status code: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP ${response.status}: ${errorText}`);
      throw new Error(
        `Error ${response.status} obteniendo token: ${response.statusText}. ${errorText}`
      );
    }

    const responseText = await response.text();
    console.log(`📥 Response (primeros 200 chars): ${responseText.substring(0, 200)}`);

    let token: string;
    let expiresIn = 300; // 5 minutos por defecto

    // Intentar parsear como JSON primero
    try {
      const data = JSON.parse(responseText);
      console.log("✅ Response parseada como JSON");

      // Buscar el token en diferentes campos posibles (como hace Python)
      if (data.token) {
        token = data.token;
      } else if (data.Token) {
        token = data.Token;
      } else if (data.access_token) {
        token = data.access_token;
      } else if (data.AccessToken) {
        token = data.AccessToken;
      } else if (data.result) {
        token = data.result;
      } else if (typeof data === 'object' && Object.keys(data).length === 1) {
        // Si solo hay un campo, usar su valor
        token = Object.values(data)[0] as string;
      } else {
        console.warn("⚠️ Formato JSON no reconocido, usando como string");
        token = JSON.stringify(data);
      }

      if (data.expires_in) {
        expiresIn = data.expires_in;
      }
    } catch {
      // Si no es JSON, es texto plano (el token directamente)
      console.log("⚠️ Response no es JSON, interpretando como texto plano");
      token = responseText.trim();
    }

    // Normalizar token: quitar comillas, Bearer prefix, etc (como hace Python)
    token = token
      .trim()
      .replace(/^["']|["']$/g, '')  // Quitar comillas al inicio/final
      .replace(/^Bearer\s+/i, '')    // Quitar prefijo Bearer
      .trim();

    if (!token || token === 'null' || token === 'None') {
      throw new Error(`Token vacío o inválido. Response: ${responseText}`);
    }

    // Cachear el token
    const expiresInMs = (expiresIn - 30) * 1000;
    tokenCache = {
      token: token,
      expiresAt: Date.now() + expiresInMs,
    };

    console.log(`✅ Token renovado exitosamente (expira en ${expiresIn}s)`);
    console.log(`🔑 Token (primeros 20 chars): ${token.substring(0, 20)}...`);

    return token;

  } catch (error) {
    console.error("❌ Error obteniendo token:", error);
    throw error;
  }
}

/**
 * Limpia el cache del token (útil para testing o cuando falla una llamada)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  console.log("🗑️ Cache de token limpiado");
}

/**
 * Exporta la configuración para uso en otros módulos
 */
export { CORREOS_CONFIG };
