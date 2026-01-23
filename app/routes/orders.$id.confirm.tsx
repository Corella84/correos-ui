import { Page, Text, Card, Button, Banner, Spinner } from "@shopify/polaris";
import { useNavigate, useParams, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { getProvinciaByCodigo, getCantonesByProvincia, getDistritosByCanton } from "~/data/costaRica";

/**
 * CONTRATO DE DATOS - Confirmación Final
 * 
 * El backend debe proveer los datos consolidados antes de generar la guía:
 */
interface ConfirmData {
  orderId: string;
  remitente: {
    nombre: string;              // Nombre del remitente (fijo: Tribu Mates)
    direccion: string;            // Dirección completa del remitente
  };
  destinatario: {
    nombre: string;               // Nombre del cliente
    telefono: string;             // Teléfono de contacto
    email?: string;               // Email (opcional)
  };
  direccionEntrega: {
    provincia: string;             // Provincia
    canton: string;               // Cantón
    distrito: string;             // Distrito
    codigoPostal: string;         // Código postal validado
    senas: string;                // Señas finales
  };
  orderDetails?: {
    orderNumber: string;          // Número de orden de Shopify
    items?: string[];             // Items del pedido (opcional)
  };
}

/**
 * ESTADOS VISUALES:
 * - READY: Todos los datos están completos y listos para generar guía
 * - MISSING_DATA: Faltan datos críticos (no debería llegar aquí si la validación funciona)
 * 
 * RESPONSABILIDAD DEL BACKEND:
 * - Validar que todos los datos requeridos estén presentes
 * - Generar la guía al hacer POST a /api/orders/:id/generate-guide
 * - Retornar el número de guía generado o error
 */

export default function OrderConfirm() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const orderId = params.id || "";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leer datos de URL params (vienen de la pantalla de review)
  const codigoPostal = searchParams.get("codigoPostal") || "";
  const provinciaCodigo = searchParams.get("provincia") || "";
  const cantonCodigo = searchParams.get("canton") || "";
  const distritoCodigo = searchParams.get("distrito") || "";
  const senas = searchParams.get("senas") || "";
  const telefono = searchParams.get("telefono") || "";
  const clienteNombre = searchParams.get("clienteNombre") || "Cliente";
  const clienteTelefono = searchParams.get("clienteTelefono") || telefono;

  // Obtener nombres legibles desde el catálogo
  const provincia = getProvinciaByCodigo(provinciaCodigo);
  const provinciaNombre = provincia?.nombre || "";

  const canton = provincia?.cantones.find((c) => c.codigo === cantonCodigo);
  const cantonNombre = canton?.nombre || "";

  const distrito = canton?.distritos.find((d) => d.codigo === distritoCodigo);
  const distritoNombre = distrito?.nombre || "";

  // Datos consolidados para mostrar en la UI
  const confirmData: ConfirmData = {
    orderId,
    remitente: {
      nombre: "Tribu Mates",
      direccion: "Alajuela, Grecia, 800 este de la Universidad Latina",
    },
    destinatario: {
      nombre: clienteNombre,
      telefono: clienteTelefono,
    },
    direccionEntrega: {
      provincia: provinciaNombre,
      canton: cantonNombre,
      distrito: distritoNombre,
      codigoPostal: codigoPostal,
      senas: senas,
    },
    orderDetails: {
      orderNumber: `TM-${orderId}`,
    },
  };

  const handleGenerarGuia = async () => {
    // CORRECCIÓN 3: Validación final obligatoria (Bloqueo de seguridad)
    if (!provinciaCodigo || !cantonCodigo || !distritoCodigo) {
      setError("Faltan datos obligatorios (Provincia, Cantón o Distrito). Vuelve a revisar.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // FASE 5.2: Payload real construido desde datos del formulario
      const remitenteDireccion = "Alajuela, Grecia, 800 este de la Universidad Latina";
      const remitenteCodigoPostal = "20301";
      const destinatarioDireccion = `${senas}, ${distritoNombre}, ${cantonNombre}, ${provinciaNombre}`;

      const payload = {
        orden_id: `TM-${orderId}`,
        destinatario: {
          nombre_completo: clienteNombre,
          telefono: telefono,
          email: "",
        },
        direccion_original: "Dirección original de Shopify",
        direccion_corregida: {
          codigo_postal: codigoPostal,
          provincia_codigo: provinciaCodigo,
          provincia_nombre: provinciaNombre,
          canton_codigo: cantonCodigo,
          canton_nombre: cantonNombre,
          distrito_codigo: distritoCodigo,
          distrito_nombre: distritoNombre,
          senas_adicionales: senas,
        },
        peso: 500.0,
        monto_flete: 0.0,
      };

      // FIX HIGH #3: Timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Usar VITE_BACKEND_URL con fallback a localhost
      const BACKEND_URL = typeof window !== 'undefined'
        ? (import.meta.env?.VITE_BACKEND_URL || "http://localhost:8000")
        : (process.env.VITE_BACKEND_URL || "http://localhost:8000");

      try {
        const response = await fetch(`${BACKEND_URL}/generar_guia`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          // FIX BLOCKER #2: Detectar error 409 (duplicado)
          if (response.status === 409) {
            setError("Esta orden ya tiene una guía generada. Refrescando lista...");
            setTimeout(() => navigate("/orders"), 2000);
            return;
          }
          setError(data.detail?.error || data.error || "Error al generar la guía");
          setIsLoading(false);
          return;
        }

        // Verificar respuesta según contrato
        if (data.status === "exito" && data.guia?.tracking_number) {
          const resultData = {
            status: "SUCCESS" as const,
            numeroGuia: data.guia.tracking_number,
            fechaGeneracion: new Date().toISOString(),
            orderNumber: confirmData.orderDetails?.orderNumber || orderId,
            customerName: confirmData.destinatario.nombre,
          };

          navigate(
            `/orders/${orderId}/result?numero=${resultData.numeroGuia}&fecha=${encodeURIComponent(resultData.fechaGeneracion)}&orden=${resultData.orderNumber}&cliente=${encodeURIComponent(resultData.customerName)}`
          );
        } else {
          const errorMsg = data.mensaje || data.detalle_error || "Error desconocido al generar la guía";
          setError(`Error del servicio: ${errorMsg}`);
          setIsLoading(false);
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          setError("Timeout – intentá en 1 minuto");
        } else {
          throw fetchErr;
        }
        setIsLoading(false);
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        const BACKEND_URL = typeof window !== 'undefined'
          ? (import.meta.env?.VITE_BACKEND_URL || "http://localhost:8000")
          : (process.env.VITE_BACKEND_URL || "http://localhost:8000");
        setError(`No se pudo conectar con el backend. Verifica que esté corriendo en ${BACKEND_URL}`);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Error inesperado al generar la guía"
        );
      }
      setIsLoading(false);
    }
  };

  return (
    <Page
      title="Confirmación Final"
      backAction={{
        content: "Volver",
        onAction: () => navigate(`/orders/${orderId}/review`),
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Text as="p" variant="bodyMd" tone="subdued">
          Revisa los datos antes de generar la guía oficial de Correos de Costa Rica.
        </Text>

        {error && (
          <Banner tone="critical">
            <Text as="p" variant="bodyMd">{error}</Text>
          </Banner>
        )}

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Remitente
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Text as="p" variant="bodyMd">
                  {confirmData.remitente.nombre}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {confirmData.remitente.direccion}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Destinatario
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Text as="p" variant="bodyMd">
                  {confirmData.destinatario.nombre}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Teléfono: {confirmData.destinatario.telefono}
                </Text>
                {confirmData.destinatario.email && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Email: {confirmData.destinatario.email}
                  </Text>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Dirección de Entrega
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Text as="p" variant="bodyMd">
                  {confirmData.direccionEntrega.provincia}, {confirmData.direccionEntrega.canton}
                </Text>
                <Text as="p" variant="bodyMd">
                  Distrito: {confirmData.direccionEntrega.distrito}
                </Text>
                <Text as="p" variant="bodyMd">
                  Código Postal: {confirmData.direccionEntrega.codigoPostal}
                </Text>
                <div style={{ marginTop: "0.5rem", lineHeight: "1.6" }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {confirmData.direccionEntrega.senas}
                  </Text>
                </div>
              </div>
              {confirmData.orderDetails?.orderNumber && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e1e3e5" }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Orden: {confirmData.orderDetails.orderNumber}
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            onClick={() => navigate(`/orders/${orderId}/review`)}
            disabled={isLoading}
          >
            Volver y corregir
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerarGuia}
            disabled={isLoading || !provinciaCodigo || !cantonCodigo || !distritoCodigo}
            loading={isLoading}
          >
            {isLoading ? "Generando guía..." : "Generar guía oficial"}
          </Button>
        </div>
      </div>
    </Page>
  );
}
