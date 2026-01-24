import { json, type ActionFunctionArgs } from "@remix-run/node";

// ============================================
// ENDPOINT /api/catalogo
// ============================================
// Llama al backend de Python que tiene la integración SOAP funcionando
// ============================================

// Backend URL - desarrollo local
// Cuando se embeba en Shopify, cambiar a la URL de producción
const PYTHON_BACKEND_URL = "http://localhost:8000";

interface CatalogoRequest {
  tipo: "provincias" | "cantones" | "distritos" | "barrios";
  provincia_codigo?: string;
  canton_codigo?: string;
  distrito_codigo?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body: CatalogoRequest = await request.json();
    const { tipo, provincia_codigo, canton_codigo, distrito_codigo } = body;

    console.log("📥 /api/catalogo:", { tipo, provincia_codigo, canton_codigo, distrito_codigo });

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
        distrito_codigo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend error: ${response.status}`, errorText);
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

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
