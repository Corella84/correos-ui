import { Page, Text, Card, Button, Banner, Spinner } from "@shopify/polaris";
import { useNavigate, useParams, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getProvinciaByCodigo, getCantonesByProvincia, getDistritosByCanton } from "~/data/costaRica";
import { getOrderById } from "~/services/orders.api";

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
  
  const fromShopify = searchParams.get("from") === "shopify";

  const [isLoading, setIsLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(fromShopify);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para datos que pueden venir de Shopify o de URL params
  const [codigoPostal, setCodigoPostal] = useState(searchParams.get("codigoPostal") || "");
  const [provinciaCodigo, setProvinciaCodigo] = useState(searchParams.get("provincia") || "");
  const [cantonCodigo, setCantonCodigo] = useState(searchParams.get("canton") || "");
  const [distritoCodigo, setDistritoCodigo] = useState(searchParams.get("distrito") || "");
  const [senas, setSenas] = useState(searchParams.get("senas") || "");
  const [telefono, setTelefono] = useState(searchParams.get("telefono") || "");
  const [clienteNombre, setClienteNombre] = useState(searchParams.get("clienteNombre") || "Cliente");
  const [clienteTelefono, setClienteTelefono] = useState(searchParams.get("clienteTelefono") || searchParams.get("telefono") || "");
  const [tipoEnvio, setTipoEnvio] = useState(searchParams.get("tipoEnvio") || "domicilio");
  const [sucursalCodigo, setSucursalCodigo] = useState(searchParams.get("sucursalCodigo") || "");
  const [sucursalNombre, setSucursalNombre] = useState(searchParams.get("sucursalNombre") || "");
  
  // Cargar datos de Shopify si viene con from=shopify
  useEffect(() => {
    if (!fromShopify) return;
    
    const loadShopifyData = async () => {
      try {
        setLoadingOrder(true);
        const response = await getOrderById(orderId);
        
        if (!response.success || !response.order) {
          throw new Error("No se pudo cargar la orden");
        }
        
        const order = response.order;
        const shipping = order.shipping_address || {};
        const customer = order.customer || {};
        
        // Inferir datos básicos
        setClienteNombre(customer.name || "Cliente");
        
        // Teléfono
        const rawPhone = shipping.phone || customer.phone || "";
        const cleanedPhone = rawPhone.replace(/\D/g, "");
        setTelefono(cleanedPhone);
        setClienteTelefono(cleanedPhone);
        
        // Dirección
        const address1 = shipping.address1 || "";
        const address2 = shipping.address2 || "";
        const fullAddress = `${address1} ${address2}`.trim();
        setSenas(fullAddress);
        
        // Geografía (inferir de shipping_address)
        const province = shipping.province || "";
        const city = shipping.city || "";
        
        // Intentar mapear provincia
        const provincias = [
          { nombre: "San José", codigo: "1" },
          { nombre: "Alajuela", codigo: "2" },
          { nombre: "Cartago", codigo: "3" },
          { nombre: "Heredia", codigo: "4" },
          { nombre: "Guanacaste", codigo: "5" },
          { nombre: "Puntarenas", codigo: "6" },
          { nombre: "Limón", codigo: "7" },
        ];
        
        const matchedProv = provincias.find(p => 
          province.toLowerCase().includes(p.nombre.toLowerCase())
        );
        
        if (matchedProv) {
          setProvinciaCodigo(matchedProv.codigo);
        }
        
        // ZIP
        const rawZip = shipping.zip || "";
        setCodigoPostal(rawZip);
        
        // Tipo de envío por defecto
        setTipoEnvio("domicilio");
        
      } catch (err) {
        console.error("Error cargando datos de Shopify:", err);
        setError("No se pudieron cargar los datos de la orden. Vuelve a revisión.");
      } finally {
        setLoadingOrder(false);
      }
    };
    
    loadShopifyData();
  }, [fromShopify, orderId]);
  
  const esSucursal = tipoEnvio === "sucursal";

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
      
      // Dirección destino: si es sucursal, usar nombre de sucursal; si es domicilio, usar señas
      const destinatarioDireccion = esSucursal 
        ? `Sucursal ${sucursalNombre}, ${distritoNombre}, ${cantonNombre}, ${provinciaNombre}`
        : `${senas}, ${distritoNombre}, ${cantonNombre}, ${provinciaNombre}`;

      // Formato GID de Shopify según contrato v2
      const shopifyGid = `gid://shopify/Order/${orderId}`;
      
      const payload = {
        orden_id: shopifyGid,
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
          senas_adicionales: esSucursal ? `Entrega en Sucursal: ${sucursalNombre} (${sucursalCodigo})` : senas,
          // Nuevos campos para entrega en sucursal
          tipo_envio: tipoEnvio,
          sucursal_codigo: esSucursal ? sucursalCodigo : null,
          sucursal_nombre: esSucursal ? sucursalNombre : null,
        },
        peso: 500.0,
        monto_flete: 0.0,
      };

      // FIX HIGH #3: Timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Backend URL - desarrollo local
      const BACKEND_URL = "http://localhost:8000";

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
        setError("No se pudo conectar con el backend. Verifica que esté corriendo en http://localhost:8000");
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
      {loadingOrder ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem" }}>
          <Spinner size="large" />
          <Text as="p" variant="bodyMd" tone="subdued">
            Cargando datos de la orden...
          </Text>
        </div>
      ) : (
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
                {esSucursal ? "Entrega en Sucursal" : "Dirección de Entrega"}
              </Text>
              
              {/* Badge de tipo de envío */}
              <div style={{ 
                display: "inline-block", 
                padding: "0.25rem 0.75rem", 
                borderRadius: "4px", 
                backgroundColor: esSucursal ? "#e3f2fd" : "#e8f5e9",
                color: esSucursal ? "#1565c0" : "#2e7d32",
                fontSize: "0.875rem",
                fontWeight: "500",
                width: "fit-content"
              }}>
                {esSucursal ? "📦 Retiro en Sucursal" : "🏠 Entrega a Domicilio"}
              </div>

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
                
                {/* Mostrar sucursal si aplica */}
                {esSucursal && sucursalNombre && (
                  <div style={{ 
                    marginTop: "0.5rem", 
                    padding: "0.75rem", 
                    backgroundColor: "#f5f5f5", 
                    borderRadius: "4px",
                    border: "1px solid #e0e0e0"
                  }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Sucursal: {sucursalNombre}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Código: {sucursalCodigo}
                    </Text>
                  </div>
                )}
                
                {/* Mostrar señas solo si es domicilio */}
                {!esSucursal && confirmData.direccionEntrega.senas && (
                  <div style={{ marginTop: "0.5rem", lineHeight: "1.6" }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {confirmData.direccionEntrega.senas}
                    </Text>
                  </div>
                )}
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
      )}
    </Page>
  );
}
