import { json, type ActionFunctionArgs } from "@remix-run/node";

// ============================================
// ENDPOINT /api/catalogo
// ============================================
// Llama al backend de Python que tiene la integración SOAP funcionando
// ============================================

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

interface CatalogoRequest {
  tipo: "provincias" | "cantones" | "distritos";
  provincia_codigo?: string;
  canton_codigo?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body: CatalogoRequest = await request.json();
    const { tipo, provincia_codigo, canton_codigo } = body;

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
      console.error(`❌ Error del backend Python: ${response.status} - ${errorText}`);
      throw new Error(`Backend error: ${response.status}`);
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
