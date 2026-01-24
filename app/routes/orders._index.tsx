import { Page, Text, ResourceList, Card, Badge, Button, Spinner, Banner } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import { getPendingOrders } from "~/services/orders.api";

// Tipos simplificados
type ReviewStatus = "ready" | "review_required";
type OrderStatus = "NO_GUIDE" | "GUIDE_CREATED" | "PROCESSING";

interface Order {
  id: string;
  customer: string;
  province: string;
  status: OrderStatus;
  reviewStatus: ReviewStatus;
  orderNumber?: string;
  correosTracking?: string;
  // Datos crudos para display
  rawAddress: string;
  rawZip: string;
  rawPhone: string;
}

// Función pura y segura de cálculo de estado basada en validación del backend
function calculateReviewStatus(o: any): ReviewStatus {
  // El backend ya validó la orden y nos dice si está lista
  if (o.ready_for_guide === true) {
    return "ready";
  }
  return "review_required";
}

export default function OrdersIndex() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        const shopifyOrders = await getPendingOrders();

        if (isMounted) {
          const mappedOrders: Order[] = (shopifyOrders || []).map(o => ({
            id: String(o.id),
            customer: o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "Cliente Desconocido",
            province: o.shipping_address?.province || "Sin dirección",
            status: ((o as any).correos_status === "GUIDE_CREATED" ? "GUIDE_CREATED" : (o as any).correos_status === "PROCESSING" ? "PROCESSING" : "NO_GUIDE"),
            reviewStatus: calculateReviewStatus(o),
            orderNumber: o.name,
            correosTracking: (o as any).correos_tracking,
            rawAddress: o.shipping_address?.address1 || "",
            rawZip: o.shipping_address?.zip || "",
            rawPhone: o.shipping_address?.phone || o.customer?.phone || ""
          }));

          // Ordenar: Primero las que requieren revisión, luego listas, al final las completadas
          mappedOrders.sort((a, b) => {
            if (a.status === "GUIDE_CREATED" && b.status !== "GUIDE_CREATED") return 1;
            if (a.status !== "GUIDE_CREATED" && b.status === "GUIDE_CREATED") return -1;
            if (a.reviewStatus === "review_required" && b.reviewStatus !== "review_required") return -1;
            if (a.reviewStatus !== "review_required" && b.reviewStatus === "review_required") return 1;
            return 0;
          });

          setOrders(mappedOrders);
        }
      } catch (err) {
        console.error("Error cargando órdenes:", err);
        if (isMounted) setError("Error de conexión al cargar órdenes.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrders();

    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <Page title="Órdenes Pendientes">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Órdenes Pendientes">
        <Banner tone="critical">
          <Text as="p" variant="bodyMd">{error}</Text>
        </Banner>
        <div style={{ marginTop: '1rem' }}>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Órdenes Pendientes" subtitle={`${orders.length} órdenes`}>

      <Card>
        <ResourceList
          resourceName={{ singular: "orden", plural: "órdenes" }}
          items={orders}
          renderItem={(item) => {
            const { id, customer, province, status, reviewStatus, orderNumber } = item;

            const isReady = reviewStatus === "ready";
            const isCompleted = status === "GUIDE_CREATED";
            const isCritical = !isCompleted && !isReady;

            return (
              <ResourceList.Item
                id={id}
                onClick={() => {
                  // Bloquear navegación a review si ya tiene guía
                  if (!isCompleted) {
                    navigate(`/orders/${id}/review`);
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        {orderNumber || `Orden ${id}`}
                      </Text>

                      {isCompleted ? (
                        <Badge tone="success">Guía Creada</Badge>
                      ) : item.status === "PROCESSING" ? (
                        <Badge tone="info">En proceso...</Badge>
                      ) : isCritical ? (
                        <Badge tone="critical">Revisión Obligatoria</Badge>
                      ) : (
                        <Badge tone="success">Lista para procesar</Badge>
                      )}
                    </div>

                    <Text as="p" variant="bodySm" tone="subdued">
                      {customer} • {province}
                    </Text>

                    {/* Feedback visual si requiere revisión */}
                    {isCritical && item.validation_issues && item.validation_issues.length > 0 && (
                      <Text as="span" variant="bodySm" tone="critical">
                        {item.validation_issues.join(", ")}
                      </Text>
                    )}
                  </div>

                  <div>
                    {/* Botones de acción */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {isCompleted ? (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Button onClick={() => {
                            const params = new URLSearchParams({
                              numero: item.correosTracking || "CR-Unknown",
                              orden: item.orderNumber || id,
                              cliente: customer,
                              fecha: new Date().toISOString()
                            });
                            navigate(`/orders/${id}/result?${params.toString()}`);
                          }}>Ver / Descargar PDF</Button>
                          <Button
                            url="https://sucursal.correos.go.cr/web/rastreo"
                            external
                            variant="plain"
                          >Ver seguimiento</Button>
                        </div>
                      ) : item.status === "PROCESSING" ? (
                        <Button disabled>Generando guía...</Button>
                      ) : isReady ? (
                        // ORDEN LISTA: Botón principal "Crear guía" + secundario "Ver/Editar"
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Button
                            variant="primary"
                            onClick={() => navigate(`/orders/${id}/confirm?from=shopify`)}
                          >
                            Crear guía
                          </Button>
                          <Button
                            variant="plain"
                            onClick={() => navigate(`/orders/${id}/review`)}
                          >
                            Ver/Editar
                          </Button>
                        </div>
                      ) : (
                        // ORDEN REQUIERE REVISIÓN: Solo "Revisar dirección"
                        <Button
                          tone="critical"
                          onClick={() => navigate(`/orders/${id}/review`)}
                        >
                          Revisar dirección
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </ResourceList.Item>
            );
          }}
        />
      </Card>
    </Page>
  );
}
