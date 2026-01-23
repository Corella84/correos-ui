import { json, type ActionFunctionArgs } from "@remix-run/node";

// ============================================
// ENDPOINT /api/catalogo
// ============================================
// Llama al backend de Python que tiene la integración SOAP funcionando
// ============================================

// Usar BACKEND_URL primero (para servidor Remix), luego VITE_BACKEND_URL, luego localhost
// En Remix servidor, BACKEND_URL es más confiable que VITE_BACKEND_URL
const PYTHON_BACKEND_URL = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:8000";

interface CatalogoRequest {
  tipo: "provincias" | "cantones" | "distritos";
  provincia_codigo?: string;
  canton_codigo?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body: CatalogoRequest = await request.json();
    const { tipo, provincia_codigo, canton_codigo } = body;

    // Logging para debug: mostrar qué URL está usando
    console.log("🔧 Backend URL configurada:", PYTHON_BACKEND_URL);
    console.log("🔧 Variables disponibles:", {
      BACKEND_URL: process.env.BACKEND_URL ? "✅" : "❌",
      VITE_BACKEND_URL: process.env.VITE_BACKEND_URL ? "✅" : "❌"
    });
    console.log("📥 Request /api/catalogo:", { tipo, provincia_codigo, canton_codigo });
    console.log(`🔗 Llamando a backend Python: ${PYTHON_BACKEND_URL}/catalogo_geografico`);

    // Llamar al backend de Python
    const response = await fetch(`${PYTHON_BACKEND_URL}/catalogo_geografico`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo,
        provincia_codigo,
        canton_codigo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error del backend Python:`, {
        status: response.status,
        statusText: response.statusText,
        url: `${PYTHON_BACKEND_URL}/catalogo_geografico`,
        error: errorText
      });
      throw new Error(`Backend error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Datos recibidos del backend: ${data.data?.length || 0} items`);

    return json(data);

  } catch (error) {
    console.error("❌ Error crítico en /api/catalogo:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
