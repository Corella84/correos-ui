import { Page, Text, Card, Button, Banner } from "@shopify/polaris";
import { useNavigate, useParams, useSearchParams } from "@remix-run/react";

const BACKEND_URL = typeof window !== 'undefined'
  ? (import.meta.env?.VITE_BACKEND_URL || "${BACKEND_URL}")
  : (process.env.VITE_BACKEND_URL || "${BACKEND_URL}");

/**
 * CONTRATO DE DATOS - Resultado de Generación de Guía
 * 
 * El backend debe retornar después de generar la guía:
 */
type ResultStatus = "SUCCESS" | "ERROR";

interface GuiaResult {
  status: ResultStatus;
  orderId: string;
  guia?: {
    numero: string;              // Número de guía de Correos (formato: CRXXXXXXXXXCR)
    fechaGeneracion: string;      // Fecha ISO de generación
    trackingUrl?: string;         // URL de seguimiento (opcional)
    pdfUrl?: string;              // URL del PDF de la guía (opcional)
  };
  error?: {
    code: string;                 // Código de error
    message: string;              // Mensaje de error legible
    details?: string;             // Detalles adicionales (opcional)
  };
  orderDetails?: {
    orderNumber: string;          // Número de orden de Shopify
    customerName: string;          // Nombre del cliente
  };
}

/**
 * ESTADOS VISUALES:
 * - SUCCESS: Banner success verde, muestra número de guía, botón "Volver a órdenes"
 * - ERROR: Banner error rojo, muestra mensaje de error, botón "Reintentar" o "Volver"
 * 
 * RESPONSABILIDAD DEL BACKEND:
 * - Generar la guía llamando a la API de Correos
 * - Retornar el número de guía o error detallado
 * - Actualizar el estado de la orden a GUIDE_CREATED
 */

export default function OrderResult() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const orderId = params.id || "";

  // Leer datos de la URL (vienen de la pantalla de confirmación)
  const numeroGuia = searchParams.get("numero");
  const fechaGeneracion = searchParams.get("fecha");
  const orderNumber = searchParams.get("orden");
  const customerName = searchParams.get("cliente");

  // Si no hay datos en la URL, usar datos mock (fallback para desarrollo)
  const result: GuiaResult = numeroGuia
    ? {
      status: "SUCCESS",
      orderId,
      guia: {
        numero: numeroGuia,
        fechaGeneracion: fechaGeneracion || new Date().toISOString(),
        trackingUrl: "https://sucursal.correos.go.cr/web/rastreo",
        pdfUrl: `${BACKEND_URL}/descargar_guia/${numeroGuia}`,
      },
      orderDetails: {
        orderNumber: orderNumber || orderId,
        customerName: customerName || "Cliente",
      },
    }
    : {
      // Fallback mock si se accede directamente sin datos
      status: "SUCCESS",
      orderId,
      guia: {
        numero: "CR123456789CR",
        fechaGeneracion: new Date().toISOString(),
        trackingUrl: "https://sucursal.correos.go.cr/web/rastreo",
        pdfUrl: "${BACKEND_URL}/descargar_guia/CR123456789CR",
      },
      orderDetails: {
        orderNumber: "SH-1024",
        customerName: "Juan Pérez",
      },
    };

  // Renderizar según el estado del resultado
  if (result.status === "ERROR") {
    return (
      <Page title="Error al Generar Guía">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Banner tone="critical">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {result.error?.message || "Ocurrió un error al generar la guía"}
            </Text>
            {result.error?.details && (
              <div style={{ marginTop: "0.5rem" }}>
                <Text as="p" variant="bodySm">
                  {result.error.details}
                </Text>
              </div>
            )}
          </Banner>

          <Card>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Información del Error
                </Text>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Código: {result.error?.code}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Orden: #{result.orderId}
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <Button
              onClick={() => navigate(`/orders/${orderId}/confirm`)}
            >
              Reintentar
            </Button>
            <Button
              onClick={() => navigate("/orders")}
              variant="primary"
            >
              Volver a órdenes
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // Estado SUCCESS
  const fechaFormateada = result.guia?.fechaGeneracion
    ? new Date(result.guia.fechaGeneracion).toLocaleDateString("es-CR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "";

  return (
    <Page title="Guía Generada Exitosamente">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <Banner tone="success">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            La guía de Correos de Costa Rica se ha generado correctamente.
          </Text>
        </Banner>

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Información de la Guía
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Número de Guía
                  </Text>
                  <Text as="p" variant="bodyLg" fontWeight="semibold">
                    {result.guia?.numero}
                  </Text>
                </div>
                <div>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Fecha de Generación
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {fechaFormateada}
                  </Text>
                </div>
                {result.orderDetails && (
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Orden
                    </Text>
                    <Text as="p" variant="bodyMd">
                      #{result.orderDetails.orderNumber}
                    </Text>
                  </div>
                )}
                {result.guia?.trackingUrl && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <Button
                      url={result.guia.trackingUrl}
                      external
                      variant="plain"
                    >
                      Ver seguimiento
                    </Button>
                  </div>
                )}
                {result.guia?.pdfUrl && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <Button
                      url={result.guia.pdfUrl}
                      external
                      variant="primary"
                    >
                      Descargar Guía PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Próximos Pasos
              </Text>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Text as="p" variant="bodyMd" tone="subdued">
                  • La guía está lista para ser impresa y adjuntada al paquete
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  • El cliente recibirá una notificación con el número de seguimiento
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  • Puedes hacer seguimiento del envío en el sistema de Correos
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            onClick={() => navigate("/orders")}
            variant="primary"
          >
            Volver a órdenes
          </Button>
        </div>
      </div>
    </Page>
  );
}
