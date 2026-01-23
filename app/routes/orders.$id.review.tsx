import { Page, Text, Card, TextField, Select, Banner, Button, Spinner } from "@shopify/polaris";
import { useNavigate, useParams } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { costaRica, getCantonesByProvincia, getDistritosByCanton } from "~/data/costaRica";
import { getProvincias, getCantones, getDistritos } from "~/services/correos.api";
import { getOrderById, getCorreosStatus } from "~/services/orders.api";

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

  // Ref para bloquear efecto rebote (doble inicialización)
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
          console.log("[REVIEW] Order has GUIDE_CREATED, showing info screen");
          setGuideAlreadyCreated(true);
          setTrackingNumber(correosStatus.tracking_number);
          setLoadingOrder(false);
          return;
        }

        // PASO 2: Si no está procesada, cargar desde Shopify
        const shopifyOrder = await getOrderById(orderId);

        if (!shopifyOrder) {
          setErrorOrder("Orden no encontrada en Shopify.");
          setLoadingOrder(false);
          return;
        }

        if ((shopifyOrder as any).correos_status === "GUIDE_CREATED") {
          setGuideAlreadyCreated(true);
          setTrackingNumber((shopifyOrder as any).correos_tracking || null);
          setLoadingOrder(false);
          return;
        }

        const cleanPhone = (phone: string | undefined | null) => {
          if (!phone) return "";
          let cleaned = phone.replace(/\D/g, "");
          if (cleaned.startsWith("506") && cleaned.length > 8) {
            cleaned = cleaned.substring(3);
          }
          return cleaned;
        };

        const rawPhone = shopifyOrder.shipping_address?.phone || shopifyOrder.customer?.phone || "";
        const cleanedPhone = cleanPhone(rawPhone);

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

        // Inferir provincia desde el nombre
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

  // ============================================================================
  // DATOS DINÁMICOS - API DE CORREOS CON FALLBACK LOCAL
  // ============================================================================
  const [provinciasAPI, setProvinciasAPI] = useState<Array<{ codigo: string, nombre: string }>>([]);
  const [cantonesAPI, setCantonesAPI] = useState<Array<{ codigo: string, nombre: string }>>([]);
  const [distritosAPI, setDistritosAPI] = useState<Array<{ codigo: string, nombre: string, codigoPostal: string }>>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(true);
  const [loadingCantones, setLoadingCantones] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);

  // Cargar provincias al montar
  useEffect(() => {
    let cancelled = false;
    setLoadingProvincias(true);

    getProvincias()
      .then(data => {
        if (!cancelled) {
          setProvinciasAPI(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProvincias(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // Cargar cantones cuando cambia provincia
  useEffect(() => {
    if (!formData.provincia) {
      setCantonesAPI([]);
      return;
    }

    let cancelled = false;
    setLoadingCantones(true);

    getCantones(formData.provincia)
      .then(data => {
        if (!cancelled) {
          setCantonesAPI(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCantones(false);
        }
      });

    return () => { cancelled = true; };
  }, [formData.provincia]);

  // Cargar distritos cuando cambia cantón
  useEffect(() => {
    if (!formData.provincia || !formData.canton) {
      setDistritosAPI([]);
      return;
    }

    let cancelled = false;
    setLoadingDistritos(true);

    getDistritos(formData.provincia, formData.canton)
      .then(data => {
        if (!cancelled) {
          setDistritosAPI(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDistritos(false);
        }
      });

    return () => { cancelled = true; };
  }, [formData.provincia, formData.canton]);

  // Opciones para selects - API primero, fallback local
  const provinciasOptions = useMemo(() => {
    const source = provinciasAPI.length > 0 ? provinciasAPI : costaRica;
    return source.map((p) => ({
      label: p.nombre,
      value: String(p.codigo),
    }));
  }, [provinciasAPI]);

  const cantonesOptions = useMemo(() => {
    if (!formData.provincia) return [];

    const source = cantonesAPI.length > 0 ? cantonesAPI : getCantonesByProvincia(formData.provincia);

    return [
      { label: "Seleccione un cantón...", value: "" },
      ...source.map((c) => ({
        label: c.nombre,
        value: String(c.codigo),
      }))
    ];
  }, [formData.provincia, cantonesAPI]);

  const distritosOptions = useMemo(() => {
    if (!formData.provincia || !formData.canton) return [];

    const source = distritosAPI.length > 0 ? distritosAPI : getDistritosByCanton(formData.provincia, formData.canton);

    return [
      { label: "Seleccione un distrito...", value: "" },
      ...source.map((d) => ({
        label: d.nombre,
        value: String(d.codigo),
      }))
    ];
  }, [formData.provincia, formData.canton, distritosAPI]);

  // Validación ZIP
  const zipMismatch = useMemo(() => {
    if (formData.codigoPostal.length !== 5 || !formData.provincia || !formData.canton || !formData.distrito) {
      return false;
    }

    const p = formData.provincia.padStart(1, '0');
    const cc = formData.canton.padStart(2, '0');
    const dd = formData.distrito.padStart(2, '0');
    const zipEsperado = `${p}${cc}${dd}`;

    return formData.codigoPostal !== zipEsperado;
  }, [formData.codigoPostal, formData.provincia, formData.canton, formData.distrito]);

  const hasZipMismatchBackend = orderData?.validationIssues?.some(
    (issue) => issue.type === "ZIP_MISMATCH"
  ) || false;

  const isFormValid = formData.codigoPostal.length === 5 &&
    formData.provincia &&
    formData.canton &&
    formData.distrito &&
    formData.senas.length > 0 &&
    formData.telefono.length >= 8 &&
    formData.nombre.length > 0;

  if (loadingOrder) {
    return (
      <Page title="Cargando orden...">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

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
                  label={loadingProvincias ? "Provincia (Cargando...)" : "Provincia"}
                  options={provinciasOptions}
                  value={String(formData.provincia || "")}
                  disabled={loadingProvincias}
                  onChange={(value) => {
                    const nuevaProvincia = value ? String(value) : "";
                    setFormData((prev) => ({
                      ...prev,
                      provincia: nuevaProvincia,
                      canton: "",
                      distrito: "",
                    }));
                  }}
                />

                <Select
                  label={loadingCantones ? "Cantón (Cargando...)" : "Cantón"}
                  options={cantonesOptions.length > 0 ? cantonesOptions : [{ label: "Seleccione una provincia primero", value: "" }]}
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
                  label={loadingDistritos ? "Distrito (Cargando...)" : "Distrito"}
                  options={distritosOptions.length > 0 ? distritosOptions : [{ label: "Seleccione un cantón primero", value: "" }]}
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
