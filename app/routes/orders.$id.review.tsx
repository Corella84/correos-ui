import { Page, Text, Card, TextField, Select, Banner, Button, Spinner } from "@shopify/polaris";
import { useNavigate, useParams } from "@remix-run/react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { costaRica, getCantonesByProvincia, getDistritosByCanton, validarCodigoPostal } from "~/data/costaRica";
import { getProvincias, getCantones, getDistritos } from "~/services/correos.api";
import { getOrderById, getCorreosStatus, type ShopifyOrder } from "~/services/orders.api";

interface OrderReviewData {
  orderId: string;
  originalAddress: {
    address1: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
  };
  customer: {
    name: string;
    phone?: string;
  };
  validationIssues?: ValidationIssue[];
}

type ValidationIssueType = "ZIP_MISMATCH" | "ZIP_MISSING" | "PHONE_INVALID" | "ADDRESS_INCOMPLETE";

interface ValidationIssue {
  type: ValidationIssueType;
  message: string;
  severity: "warning" | "error";
}

interface CorreosAddressForm {
  codigoPostal: string;
  provincia: string;
  canton: string;
  distrito: string;
  senas: string;
  telefono: string;
  nombre: string;
}

export default function OrderReview() {
  const navigate = useNavigate();
  const params = useParams();
  const orderId = params.id || "";

  // FIX: Ref para bloquear efecto rebote (doble inicialización)
  const formInitialized = useRef(false);

  // Resetear lock si cambiamos de orden
  useEffect(() => {
    formInitialized.current = false;
  }, [orderId]);

  // Estado para la orden real fetched de Shopify API
  const [orderData, setOrderData] = useState<OrderReviewData | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [errorOrder, setErrorOrder] = useState<string | null>(null);
  const [guideAlreadyCreated, setGuideAlreadyCreated] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);

  // Inicializar formData vacío, se llenará cuando cargue la orden
  const [formData, setFormData] = useState<CorreosAddressForm>({
    codigoPostal: "",
    provincia: "",
    canton: "",
    distrito: "",
    senas: "",
    telefono: "",
    nombre: "",
  });

  // Efecto para cargar datos reales
  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoadingOrder(true);

        // PASO 1: Consultar fuente de verdad (processed_orders.json via endpoint)
        console.log("[REVIEW] Step 1: Checking correos status for orderId:", orderId);
        const correosStatus = await getCorreosStatus(orderId);
        console.log("[REVIEW] Correos status result:", correosStatus);

        if (correosStatus && correosStatus.status === "GUIDE_CREATED") {
          // Orden ya procesada - mostrar pantalla informativa
          console.log("[REVIEW] Order has GUIDE_CREATED, showing info screen");
          setGuideAlreadyCreated(true);
          setTrackingNumber(correosStatus.tracking_number);
          setLoadingOrder(false);
          return; // NO llamar a Shopify
        }

        // PASO 2: Si no está procesada, cargar desde Shopify
        const shopifyOrder = await getOrderById(orderId);

        if (!shopifyOrder) {
          setErrorOrder("Orden no encontrada en Shopify.");
          setLoadingOrder(false);
          return;
        }

        // Verificación adicional por si el backend tiene estado actualizado
        if ((shopifyOrder as any).correos_status === "GUIDE_CREATED") {
          setGuideAlreadyCreated(true);
          setTrackingNumber((shopifyOrder as any).correos_tracking || null);
          setLoadingOrder(false);
          return;
        }

        // Función helper local para limpiar teléfonos (eliminar +506 y no numéricos)
        const cleanPhone = (phone: string | undefined | null) => {
          if (!phone) return "";
          let cleaned = phone.replace(/\D/g, ""); // Solo dígitos
          if (cleaned.startsWith("506") && cleaned.length > 8) {
            cleaned = cleaned.substring(3); // Quitar prefijo 506 si sobra
          }
          return cleaned;
        };

        const rawPhone = shopifyOrder.shipping_address?.phone || shopifyOrder.customer?.phone || "";
        const cleanedPhone = cleanPhone(rawPhone);

        // Mapear datos de Shopify a nuestra estructura interna
        const mappedData: OrderReviewData = {
          orderId: String(shopifyOrder.id),
          originalAddress: {
            address1: shopifyOrder.shipping_address?.address1 || "Sin dirección",
            address2: "",
            city: shopifyOrder.shipping_address?.city || "Desconocido",
            province: shopifyOrder.shipping_address?.province || "Desconocido",
            zip: shopifyOrder.shipping_address?.zip || "10101",
          },
          customer: {
            name: shopifyOrder.customer?.first_name
              ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name || ""}`.trim()
              : "Cliente Desconocido",
            phone: cleanedPhone,
          },
          validationIssues: [],
        };

        setOrderData(mappedData);

        // Inferir provincia desde el nombre (ej: "San Jose" -> "1")
        let provinciaInferida = "";
        if (mappedData.originalAddress.province) {
          const provinciaEncontrada = costaRica.find(
            (p) => p.nombre.toLowerCase().includes(mappedData.originalAddress.province!.toLowerCase())
          );
          if (provinciaEncontrada) {
            provinciaInferida = provinciaEncontrada.codigo;
          }
        }

        // Inicializar el formulario con los datos reales (SOLO UNA VEZ)
        if (!formInitialized.current) {
          setFormData({
            codigoPostal: mappedData.originalAddress.zip || "",
            provincia: provinciaInferida,
            canton: "",
            distrito: "",
            senas: mappedData.originalAddress.address1 || "",
            telefono: cleanedPhone,
            nombre: mappedData.customer.name || "",
          });
          formInitialized.current = true;
        }

      } catch (err) {
        console.error("Error fetching order:", err);
        setErrorOrder("Error al cargar la orden.");
      } finally {
        setLoadingOrder(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);


  // ELIMINADO: useEffect que reinicializaba constantemente
  // El formData ya se inicializa correctamente en el useState
  // No necesitamos un useEffect que lo pise

  // ============================================================================
  // DATOS DINÁMICOS DE LA API DE CORREOS
  // ============================================================================
  const [provinciasAPI, setProvinciasAPI] = useState<Array<{ codigo: string, nombre: string }>>([]);
  const [cantonesAPI, setCantonesAPI] = useState<Array<{ codigo: string, nombre: string }>>([]);
  const [distritosAPI, setDistritosAPI] = useState<Array<{ codigo: string, nombre: string, codigoPostal: string }>>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingCantones, setLoadingCantones] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);

  // Cargar provincias al montar el componente (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Solo ejecutar en el navegador

    async function loadProvincias() {
      setLoadingProvincias(true);
      try {
        const provincias = await getProvincias();
        setProvinciasAPI(provincias);
        console.log("✅ Provincias cargadas desde API:", provincias.length);
      } catch (error) {
        console.error("❌ Error cargando provincias, usando fallback estático");
      } finally {
        setLoadingProvincias(false);
      }
    }
    loadProvincias();
  }, []);

  // Cargar cantones cuando cambia la provincia (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Solo ejecutar en el navegador

    if (!formData.provincia) {
      setCantonesAPI([]);
      return;
    }

    async function loadCantones() {
      setLoadingCantones(true);
      try {
        const cantones = await getCantones(formData.provincia);
        setCantonesAPI(cantones);
        console.log(`✅ Cantones cargados para provincia ${formData.provincia}:`, cantones.length);
      } catch (error) {
        console.error("❌ Error cargando cantones");
        setCantonesAPI([]);
      } finally {
        setLoadingCantones(false);
      }
    }
    loadCantones();
  }, [formData.provincia]);

  // Cargar distritos cuando cambia el cantón (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Solo ejecutar en el navegador

    if (!formData.provincia || !formData.canton) {
      setDistritosAPI([]);
      return;
    }

    async function loadDistritos() {
      setLoadingDistritos(true);
      try {
        const distritos = await getDistritos(formData.provincia, formData.canton);
        setDistritosAPI(distritos);
        console.log(`✅ Distritos cargados para provincia ${formData.provincia}, canton ${formData.canton}:`, distritos.length);
      } catch (error) {
        console.error("❌ Error cargando distritos");
        setDistritosAPI([]);
      } finally {
        setLoadingDistritos(false);
      }
    }
    loadDistritos();
  }, [formData.provincia, formData.canton]);

  // DEBUG: Log en cada render
  console.log("🔴 RENDER - formData.provincia:", formData.provincia);
  console.log("🔴 RENDER - orderId:", orderId);

  // Obtener opciones dinámicas según selección
  // Asegurar que todos los values sean strings explícitamente
  const provinciasOptions = useMemo(() => {
    // Priorizar datos de API, fallback a datos estáticos si aún no cargó
    const source = provinciasAPI.length > 0 ? provinciasAPI : costaRica;
    return source.map((p) => ({
      label: p.nombre,
      value: String(p.codigo), // Forzar string explícito
    }));
  }, [provinciasAPI]);

  const cantonesOptions = useMemo(() => {
    if (!formData.provincia) return [];

    // Priorizar datos de API, fallback a datos estáticos si aún no cargó
    const cantones = cantonesAPI.length > 0
      ? cantonesAPI
      : getCantonesByProvincia(formData.provincia);

    // Agregar opción placeholder al inicio
    const options = [
      { label: "Seleccione un cantón...", value: "" },
      ...cantones.map((c) => ({
        label: c.nombre,
        value: String(c.codigo), // Forzar string explícito
      }))
    ];

    return options;
  }, [formData.provincia, cantonesAPI]);

  const distritosOptions = useMemo(() => {
    if (!formData.provincia || !formData.canton) return [];

    // Priorizar datos de API, fallback a datos estáticos si aún no cargó
    const distritos = distritosAPI.length > 0
      ? distritosAPI
      : getDistritosByCanton(formData.provincia, formData.canton);

    // Agregar opción placeholder al inicio
    const options = [
      { label: "Seleccione un distrito...", value: "" },
      ...distritos.map((d) => ({
        label: d.nombre,
        value: String(d.codigo), // Forzar string explícito
      }))
    ];

    return options;
  }, [formData.provincia, formData.canton, distritosAPI]);

  // ============================================================================
  // ELIMINADAS: Variables de validación intermedias (provinciaValida, cantonValido, distritoValido)
  // ============================================================================
  // REGLA: Los Selects usan directamente formData (fuente de verdad del usuario)
  // No hay validación intermedia que pueda interferir con la edición humana
  // ============================================================================

  // ============================================================================
  // ELIMINADOS: useEffects que re-infieren o recalculan valores
  // ============================================================================
  // REGLA: Una vez que el usuario interactúa, el sistema NO vuelve a inferir.
  // Los valores inválidos se manejan en el onChange del Select (resetear dependientes).
  // ============================================================================

  // ============================================================================
  // VALIDACIÓN: El ZIP solo VALIDA (muestra alerta), NO cambia selects
  // ============================================================================
  // REGLA: Si el ZIP no concuerda con la selección geográfica:
  // → Mostrar alerta visual
  // → NO cambiar automáticamente provincia/cantón/distrito
  // → El usuario decide si corregir el ZIP o la selección geográfica
  // ============================================================================
  const zipMismatch = useMemo(() => {
    if (formData.codigoPostal.length !== 5 || !formData.provincia || !formData.canton || !formData.distrito) {
      return false;
    }

    // Calcular el ZIP esperado basado en la selección geográfica
    // Formato: PCCDD (Provincia + Cantón + Distrito)
    const p = formData.provincia.padStart(1, '0');
    const cc = formData.canton.padStart(2, '0');
    const dd = formData.distrito.padStart(2, '0');
    const zipEsperado = `${p}${cc}${dd}`;

    // Comparar con el ZIP ingresado
    return formData.codigoPostal !== zipEsperado;
  }, [formData.codigoPostal, formData.provincia, formData.canton, formData.distrito]);

  // Mock: Determinar si hay problemas de validación del backend
  const hasZipMismatchBackend = orderData?.validationIssues?.some(
    (issue) => issue.type === "ZIP_MISMATCH"
  ) || false;

  // Validación del formulario: verificar que todos los campos requeridos estén completos
  // Usa formData directamente (fuente de verdad del usuario)
  const isFormValid = formData.codigoPostal.length === 5 &&
    formData.provincia &&
    formData.canton &&
    formData.distrito &&
    formData.senas.length > 0 &&
    formData.telefono.length >= 8 &&
    formData.nombre.length > 0;

  console.log("OrderReview formData.provincia:", formData.provincia);

  if (loadingOrder) {
    return (
      <Page title="Cargando orden...">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  // Pantalla informativa para órdenes con guía ya creada
  if (guideAlreadyCreated) {
    return (
      <Page
        title="Orden Ya Procesada"
        backAction={{
          content: "Volver a órdenes",
          onAction: () => navigate("/orders"),
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Banner tone="success">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              Esta orden ya tiene una guía generada y no puede ser editada.
            </Text>
          </Banner>

          <Card>
            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Información de la Guía
                </Text>
                {trackingNumber && (
                  <div>
                    <Text as="p" variant="bodySm" tone="subdued">Número de Guía</Text>
                    <Text as="p" variant="bodyLg" fontWeight="semibold">{trackingNumber}</Text>
                  </div>
                )}
                <Text as="p" variant="bodySm" tone="subdued">
                  La guía fue generada exitosamente. Usa los botones a continuación para ver o descargar el PDF.
                </Text>
              </div>
            </div>
          </Card>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Button
              variant="primary"
              onClick={() => {
                const params = new URLSearchParams({
                  numero: trackingNumber || "CR-Unknown",
                  orden: orderId,
                  cliente: "Cliente",
                  fecha: new Date().toISOString()
                });
                navigate(`/orders/${orderId}/result?${params.toString()}`);
              }}
            >
              Ver / Descargar PDF
            </Button>
            <Button
              url="https://sucursal.correos.go.cr/web/rastreo"
              external
            >
              Ver seguimiento
            </Button>
            <Button onClick={() => navigate("/orders")}>
              Volver a órdenes
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  if (errorOrder || !orderData) {
    return (
      <Page title="Error">
        <Banner tone="critical">
          <Text as="p" variant="bodyMd">
            {errorOrder || "No se pudo cargar la orden para revisión."}
          </Text>
        </Banner>
        <div style={{ marginTop: '1rem' }}>
          <Button onClick={() => navigate("/orders")}>Volver a la lista</Button>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Revisión de Dirección"
      backAction={{
        content: "Volver a órdenes",
        onAction: () => navigate("/orders"),
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* ESTADO: Banner de validación según problemas detectados */}
        {hasZipMismatchBackend && (
          <Banner tone="warning">
            <Text as="p" variant="bodyMd">
              El código postal no coincide con la dirección escrita. Por favor, verifica y corrige los datos antes de continuar.
            </Text>
          </Banner>
        )}

        {zipMismatch && formData.codigoPostal.length === 5 && (
          <Banner tone="warning">
            <Text as="p" variant="bodyMd">
              El código postal no coincide con la selección geográfica (Provincia/Cantón/Distrito). Por favor, verifica los datos.
            </Text>
          </Banner>
        )}

        {/* Otros estados de validación */}
        {formData.codigoPostal.length > 0 && formData.codigoPostal.length < 5 && (
          <Banner tone="critical">
            <Text as="p" variant="bodyMd">
              El código postal debe tener 5 dígitos.
            </Text>
          </Banner>
        )}

        {formData.telefono.length > 0 && formData.telefono.length < 8 && (
          <Banner tone="critical">
            <Text as="p" variant="bodyMd">
              El teléfono debe tener al menos 8 dígitos.
            </Text>
          </Banner>
        )}

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Dirección Original del Cliente
              </Text>
              <div style={{ lineHeight: "1.6" }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {orderData.originalAddress.address1}
                  </Text>
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {orderData.originalAddress.city ? `${orderData.originalAddress.city}` : ''}
                    {orderData.originalAddress.province ? `, ${orderData.originalAddress.province}` : ''}
                  </Text>
                </div>
                {orderData.originalAddress.zip && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Código postal original: {orderData.originalAddress.zip}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Datos para la Guía de Correos
              </Text>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <TextField
                  label="Nombre del Destinatario"
                  value={formData.nombre}
                  onChange={(value) => setFormData({ ...formData, nombre: value })}
                  autoComplete="name"
                />
                <TextField
                  label="Código Postal"
                  value={formData.codigoPostal}
                  onChange={(value) => setFormData({ ...formData, codigoPostal: value })}
                  autoComplete="postal-code"
                  error={formData.codigoPostal.length > 0 && formData.codigoPostal.length !== 5 ? "Debe tener 5 dígitos" : undefined}
                />

                <Select
                  label={loadingProvincias ? "Provincia (Cargando desde API...)" : "Provincia"}
                  options={provinciasOptions}
                  value={String(formData.provincia || "")}
                  disabled={loadingProvincias}
                  onChange={(value) => {
                    const nuevaProvincia = value ? String(value) : "";
                    setFormData((prev) => {
                      const newState = {
                        ...prev,
                        provincia: nuevaProvincia,
                        canton: "",
                        distrito: "",
                      };
                      return newState;
                    });
                  }}
                />

                <Select
                  label={loadingCantones ? "Cantón (Cargando desde API...)" : "Cantón"}
                  options={cantonesOptions.length > 0 ? cantonesOptions : [{ label: loadingCantones ? "Cargando..." : "Seleccione una provincia primero", value: "" }]}
                  value={formData.canton || ""}
                  onChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      canton: value || "",
                      distrito: "",
                    }));
                  }}
                  disabled={!formData.provincia || cantonesOptions.length === 0 || loadingCantones}
                />

                <Select
                  label={loadingDistritos ? "Distrito (Cargando desde API...)" : "Distrito"}
                  options={distritosOptions.length > 0 ? distritosOptions : [{ label: loadingDistritos ? "Cargando..." : "Seleccione un cantón primero", value: "" }]}
                  value={formData.distrito || ""}
                  onChange={(value) => {
                    let nuevoZip = formData.codigoPostal;
                    if (value && formData.provincia && formData.canton) {
                      const p = formData.provincia.padStart(1, '0');
                      const cc = formData.canton.padStart(2, '0');
                      const dd = value.padStart(2, '0');
                      nuevoZip = `${p}${cc}${dd}`;
                    }

                    setFormData((prev) => ({
                      ...prev,
                      distrito: value || "",
                      codigoPostal: nuevoZip,
                    }));
                  }}
                  disabled={!formData.provincia || !formData.canton || distritosOptions.length === 0 || loadingDistritos}
                />

                <TextField
                  label="Señas finales"
                  value={formData.senas}
                  onChange={(value) => setFormData({ ...formData, senas: value })}
                  multiline={4}
                  autoComplete="street-address"
                  helpText="Indicaciones específicas para la entrega"
                />

                <TextField
                  label="Teléfono"
                  value={formData.telefono}
                  onChange={(value) => setFormData({ ...formData, telefono: value })}
                  type="tel"
                  autoComplete="tel"
                  error={formData.telefono.length > 0 && formData.telefono.length < 8 ? "Debe tener al menos 8 dígitos" : undefined}
                />
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <Button
            onClick={() => navigate("/orders")}
          >
            Volver a órdenes
          </Button>
          <Button
            variant="primary"
            disabled={!isFormValid}
            onClick={() => {
              // Pasar datos del formulario a confirmación via URL params
              const params = new URLSearchParams({
                codigoPostal: formData.codigoPostal,
                provincia: formData.provincia,
                canton: formData.canton,
                distrito: formData.distrito,
                senas: formData.senas,
                telefono: formData.telefono,
                clienteNombre: formData.nombre,
                clienteTelefono: formData.telefono,
              });
              navigate(`/orders/${orderId}/confirm?${params.toString()}`);
            }}
          >
            Continuar a confirmación
          </Button>
        </div>
      </div>
    </Page>
  );
}
