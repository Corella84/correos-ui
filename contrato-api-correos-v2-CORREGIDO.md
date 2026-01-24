# Contrato API: UI ↔ Backend de Correos de Costa Rica (v2 - Corregido)

_Este documento es el contrato funcional y técnico entre la interfaz de usuario (UI) y el servicio `correos-backend`. Define las responsabilidades, estructuras de datos y comportamiento esperado de cada sistema._

---

## CAMBIOS EN VERSIÓN 2

- ✅ Agregado endpoint `/catalogo_geografico` para obtener provincias, cantones y distritos dinámicamente
- ✅ Cambio de nombres a códigos en `direccion_corregida` (provincia_codigo, canton_codigo, distrito_codigo)
- ✅ Validación mejorada de teléfono (debe empezar con 2, 4, 5, 6, 7 u 8)
- ✅ Validación de código postal vs ubicación geográfica
- ✅ Especificación de formato de `orden_id` de Shopify
- ✅ Agregado endpoint opcional `/validar_direccion` para validación previa
- ✅ **NUEVO:** Validación automática de órdenes (`ready_for_guide`) en `/ordenes`

---

## 1. Endpoints Disponibles

### 1.1. `POST /catalogo_geografico` (NUEVO)

**Propósito:** Obtener el catálogo geográfico actualizado de Costa Rica desde la API de Correos.

**Cuándo se llama:**
- Al cargar la pantalla de "Revisión de Dirección"
- Cuando el usuario selecciona una provincia (para cargar cantones)
- Cuando el usuario selecciona un cantón (para cargar distritos)

**Request:**
```json
{
  "tipo": "provincias"
}
```

O para cantones:
```json
{
  "tipo": "cantones",
  "provincia_codigo": "1"
}
```

O para distritos:
```json
{
  "tipo": "distritos",
  "provincia_codigo": "1",
  "canton_codigo": "01"
}
```

**Response Exitoso (200 OK):**
```json
{
  "status": "exito",
  "tipo": "provincias",
  "datos": [
    {"codigo": "1", "nombre": "San José"},
    {"codigo": "2", "nombre": "Alajuela"},
    {"codigo": "3", "nombre": "Cartago"},
    {"codigo": "4", "nombre": "Heredia"},
    {"codigo": "5", "nombre": "Guanacaste"},
    {"codigo": "6", "nombre": "Puntarenas"},
    {"codigo": "7", "nombre": "Limón"}
  ]
}
```

Para cantones:
```json
{
  "status": "exito",
  "tipo": "cantones",
  "provincia_codigo": "1",
  "datos": [
    {"codigo": "01", "nombre": "San José"},
    {"codigo": "02", "nombre": "Escazú"},
    {"codigo": "03", "nombre": "Desamparados"}
  ]
}
```

Para distritos:
```json
{
  "status": "exito",
  "tipo": "distritos",
  "provincia_codigo": "1",
  "canton_codigo": "01",
  "datos": [
    {"codigo": "01", "nombre": "Carmen", "codigo_postal": "10101"},
    {"codigo": "02", "nombre": "Merced", "codigo_postal": "10102"},
    {"codigo": "03", "nombre": "Hospital", "codigo_postal": "10103"}
  ]
}
```

**Para barrios/sucursales (Entrega en Sucursal):**

O para barrios (usado en "Entrega en Sucursal"):
```json
{
  "tipo": "barrios",
  "provincia_codigo": "1",
  "canton_codigo": "01",
  "distrito_codigo": "01"
}
```

**Response Exitoso para barrios:**
```json
{
  "status": "exito",
  "tipo": "barrios",
  "provincia_codigo": "1",
  "canton_codigo": "01",
  "distrito_codigo": "01",
  "datos": [
    {"codigo_barrio": "01", "codigo_sucursal": "CART", "nombre": "SAN JOSE"},
    {"codigo_barrio": "02", "codigo_sucursal": "CART", "nombre": "BARRIO AMON"},
    {"codigo_barrio": "03", "codigo_sucursal": "CART", "nombre": "BARRIO ARANJUEZ"}
  ]
}
```

**Uso en UI:** El `codigo_sucursal` se usa para identificar la sucursal de Correos donde el cliente recogerá el paquete.

**Response Error (503 Service Unavailable):**
```json
{
  "status": "error_servicio_externo",
  "mensaje": "No se pudo obtener el catálogo de Correos de Costa Rica.",
  "detalle_error": "El servicio de Correos no respondió. Por favor, intente de nuevo."
}
```

---

### 1.2. `GET /correos/status/{order_id}` (NUEVO)

**Propósito:** Consultar el estado de procesamiento de una orden específica.

**Cuándo se llama:**
- Al cargar la pantalla de "Revisión de Dirección" para verificar si ya tiene guía
- En la lista de órdenes para mostrar el estado correcto

**Parámetro de ruta:**
- `order_id`: ID de la orden (puede ser número, formato TM-XXX, o GID)

**Response Exitoso (200 OK):**
```json
{
  "exists": true,
  "status": "GUIDE_CREATED",
  "tracking_number": "CR123456789CR",
  "processed_at": "2026-01-23T15:30:00Z"
}
```

**Estados posibles:**
- `GUIDE_CREATED`: Guía generada exitosamente
- `PROCESSING`: Guía en proceso de generación

**Response Error (404 Not Found):**
```json
{
  "detail": "Orden no procesada"
}
```

**Uso en UI - Lista de Órdenes:**

| Estado | Badge | Botón Principal | Botón Secundario |
|--------|-------|----------------|------------------|
| Sin guía + `ready_for_guide: true` | 🟢 "Lista para procesar" | "Crear guía" (va a `/confirm`) | "Ver/Editar" (va a `/review`) |
| Sin guía + `ready_for_guide: false` | 🔴 "Revisión Obligatoria" | "Revisar dirección" (va a `/review`) | - |
| En proceso (`status === PROCESSING`) | 🔵 "En proceso..." | "Generando guía..." (disabled) | - |
| Guía creada (`status === GUIDE_CREATED`) | 🟢 "Guía Creada" | "Ver / Descargar PDF" + "Ver seguimiento" | - |

**Validación automática (`ready_for_guide`):**

El backend valida cada orden automáticamente usando estos criterios:

1. ✅ **Teléfono válido:** 8 dígitos, empieza con 2, 4, 5, 6, 7 u 8
2. ✅ **Dirección con información útil:** No vacía, mínimo 20 caracteres, no solo números
3. ⚠️ **ZIP opcional:** Puede validarse pero NO es bloqueante

Si ambos criterios se cumplen, `ready_for_guide: true`, permitiendo crear la guía directamente.

---

### 1.3. `GET /ordenes` (NUEVO)

**Propósito:** Obtener la lista de órdenes pendientes de Shopify con validación automática.

**Cuándo se llama:**
- Al cargar la pantalla de "Lista de Órdenes"
- Para refrescar el estado de las órdenes

**Response Exitoso (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "5847109009704",
      "order_number": "1024",
      "customer": {
        "name": "Ana Rodríguez",
        "phone": "88112233"
      },
      "shipping_address": {
        "province": "San José",
        "city": "San José",
        "address1": "Del Pali 200 metros sur",
        "zip": "10101",
        "phone": "88112233"
      },
      "ready_for_guide": true,
      "validation_issues": []
    },
    {
      "id": "5847109009705",
      "order_number": "1025",
      "customer": {
        "name": "Carlos Pérez",
        "phone": "1234567"
      },
      "shipping_address": {
        "province": "Alajuela",
        "city": "Grecia",
        "address1": "Casa",
        "zip": "0000",
        "phone": "1234567"
      },
      "ready_for_guide": false,
      "validation_issues": [
        "Teléfono no tiene 8 dígitos",
        "Dirección muy corta o vacía"
      ]
    }
  ]
}
```

**Campos clave:**
- `ready_for_guide` (boolean): Indica si la orden puede ir directo a confirmación o requiere revisión
- `validation_issues` (array): Lista de problemas encontrados (vacío si `ready_for_guide: true`)

**Criterios de validación automática:**
1. ✅ **Teléfono válido:** 8 dígitos, empieza con 2, 4, 5, 6, 7 u 8
2. ✅ **Dirección útil:** Mínimo 20 caracteres, no solo números o ceros
3. ⚠️ **ZIP ignorado:** No se usa para determinar `ready_for_guide`

---

### 1.4. `POST /validar_direccion` (NUEVO - OPCIONAL)

**Propósito:** Validar una dirección sin generar una guía oficial. Útil para verificar antes de la confirmación final.

**Request:**
```json
{
  "codigo_postal": "10101",
  "provincia_codigo": "1",
  "canton_codigo": "01",
  "distrito_codigo": "01"
}
```

**Response Exitoso (200 OK):**
```json
{
  "status": "valido",
  "mensaje": "La dirección es válida según Correos de Costa Rica.",
  "codigo_postal_coincide": true
}
```

**Response Error (400 Bad Request):**
```json
{
  "status": "invalido",
  "mensaje": "La dirección tiene problemas de validación.",
  "errores": [
    {
      "campo": "codigo_postal",
      "descripcion": "El código postal 99999 no corresponde a San José > San José > Carmen"
    }
  ]
}
```

---

### 1.5. `POST /generar_guia`

**Propósito:** Generar una guía de envío oficial de Correos de Costa Rica.

**Cuándo se llama:** Exclusivamente desde la pantalla de **"Confirmación Final"**, después de que el operario ha revisado y validado todos los datos.

**Request - Estructura del Payload:**

**Ejemplo para Entrega a Domicilio:**
```json
{
  "orden_id": "gid://shopify/Order/5847109009704",
  "destinatario": {
    "nombre_completo": "Ana Rodríguez",
    "telefono": "88112233",
    "email": "ana.rodriguez@email.com"
  },
  "direccion_original": "Del Pali 200 metros sur, casa esquinera color verde",
  "direccion_corregida": {
    "codigo_postal": "10101",
    "provincia_codigo": "1",
    "provincia_nombre": "San José",
    "canton_codigo": "01",
    "canton_nombre": "San José",
    "distrito_codigo": "01",
    "distrito_nombre": "Carmen",
    "senas_adicionales": "Casa esquinera color verde con portón negro",
    "tipo_envio": "domicilio",
    "sucursal_codigo": null,
    "sucursal_nombre": null
  }
}
```

**Ejemplo para Entrega en Sucursal:**
```json
{
  "orden_id": "gid://shopify/Order/5847109009704",
  "destinatario": {
    "nombre_completo": "Ana Rodríguez",
    "telefono": "88112233",
    "email": "ana.rodriguez@email.com"
  },
  "direccion_original": "Del Pali 200 metros sur, casa esquinera color verde",
  "direccion_corregida": {
    "codigo_postal": "10101",
    "provincia_codigo": "1",
    "provincia_nombre": "San José",
    "canton_codigo": "01",
    "canton_nombre": "San José",
    "distrito_codigo": "01",
    "distrito_nombre": "Carmen",
    "senas_adicionales": "Entrega en Sucursal: SAN JOSE (CART)",
    "tipo_envio": "sucursal",
    "sucursal_codigo": "CART",
    "sucursal_nombre": "SAN JOSE"
  }
}
```

---

## 2. Descripción de Campos y Validaciones Pre-Request

La UI es responsable de realizar las siguientes validaciones **antes** de enviar la petición al backend.

| Campo | Tipo | Obligatorio | Fuente / Edición | Validación en UI (Pre-request) |
| :--- | :--- | :--- | :--- | :--- |
| `orden_id` | string | Sí | Shopify (sin edición) | Debe ser un GID válido de Shopify formato: `gid://shopify/Order/{número}` |
| `destinatario.nombre_completo` | string | Sí | Shopify (sin edición) | No debe estar vacío. |
| `destinatario.telefono` | string | Sí | **Editable por el usuario** | **8 dígitos numéricos**. Debe empezar con **2, 4, 5, 6, 7 u 8**. Sin prefijos (+506), guiones o espacios. |
| `destinatario.email` | string | No | Shopify (sin edición) | Si existe, formato email válido (regex). |
| `direccion_original` | string | Sí | Shopify (sin edición) | Se envía tal cual. Sin validación. |
| `direccion_corregida.codigo_postal` | string | Sí | **Editable** | Exactamente 5 dígitos numéricos. |
| `direccion_corregida.provincia_codigo` | string | Sí | **Editable (Select)** | No vacío. Debe existir en catálogo de `/catalogo_geografico`. |
| `direccion_corregida.provincia_nombre` | string | Sí | Auto-llenado desde Select | No vacío. |
| `direccion_corregida.canton_codigo` | string | Sí | **Editable (Select)** | No vacío. Debe existir en catálogo. |
| `direccion_corregida.canton_nombre` | string | Sí | Auto-llenado desde Select | No vacío. |
| `direccion_corregida.distrito_codigo` | string | Sí | **Editable (Select)** | No vacío. Debe existir en catálogo. |
| `direccion_corregida.distrito_nombre` | string | Sí | Auto-llenado desde Select | No vacío. |
| `direccion_corregida.senas_adicionales` | string | Condicional | **Editable (Textarea)** | **Obligatorio si `tipo_envio = "domicilio"`**. Mínimo 10 caracteres. Si es sucursal, puede contener info de la sucursal. |
| `direccion_corregida.tipo_envio` | string | Sí | **Editable (Select)** | Valores permitidos: `"domicilio"` o `"sucursal"`. |
| `direccion_corregida.sucursal_codigo` | string | Condicional | **Editable (Select)** | **Obligatorio si `tipo_envio = "sucursal"`**. Código de sucursal obtenido de `/catalogo_geografico` tipo "barrios". |
| `direccion_corregida.sucursal_nombre` | string | Condicional | Auto-llenado desde Select | **Obligatorio si `tipo_envio = "sucursal"`**. Nombre de la sucursal. |

**VALIDACIÓN CRÍTICA:** El backend DEBE validar que el `codigo_postal` corresponda a la combinación `provincia_codigo` + `canton_codigo` + `distrito_codigo`. Si no coincide, devolver `400 Bad Request`.

**NOTA SOBRE ENTREGA EN SUCURSAL:** Cuando `tipo_envio = "sucursal"`, el paquete se entrega en la sucursal de Correos indicada en `sucursal_codigo`. El cliente debe recogerlo presentando identificación.

---

## 3. Response (Respuesta) - `/generar_guia`

### 3.1. Caso de Éxito (`200 OK`)

```json
{
  "status": "exito",
  "mensaje": "Guía generada correctamente.",
  "guia": {
    "tracking_number": "CR123456789CR",
    "pdf_base64": "JVBERi0xLjQKJ...",
    "fecha_generacion": "2026-01-18T03:32:00Z"
  }
}
```

* `guia.tracking_number`: Número de seguimiento oficial.
* `guia.pdf_base64`: PDF de la guía codificado en Base64.
* `guia.fecha_generacion`: Timestamp ISO 8601 de cuándo se generó.

### 3.2. Caso de Error Corregible (`400 Bad Request`)

```json
{
  "status": "error_validacion",
  "mensaje": "Los datos enviados son inválidos según Correos de Costa Rica.",
  "errores": [
    {
      "campo": "direccion_corregida.codigo_postal",
      "descripcion": "El código postal 99999 no corresponde a la ubicación seleccionada."
    }
  ]
}
```

**NOTA:** Puede haber múltiples errores. La UI debe iterar sobre el array `errores` y resaltar cada campo problemático.

### 3.3. Caso de Error Bloqueante (`503 Service Unavailable`)

```json
{
  "status": "error_servicio_externo",
  "mensaje": "No se pudo establecer comunicación con el servicio de Correos de Costa Rica.",
  "detalle_error": "El servicio no respondió o devolvió un error 5xx. Por favor, intente de nuevo más tarde."
}
```

### 3.4. Rate Limiting (`429 Too Many Requests`)

```json
{
  "status": "error_rate_limit",
  "mensaje": "Demasiadas solicitudes. Por favor, espere antes de reintentar.",
  "retry_after_seconds": 60
}
```

La UI debe bloquear el botón "Generar Guía" temporalmente según `retry_after_seconds`.

### 3.5. Error Interno del Backend (`500 Internal Server Error`)

```json
{
  "status": "error_interno_backend",
  "mensaje": "Ocurrió un error inesperado en nuestro sistema. El equipo ha sido notificado.",
  "error_id": "uuid-error-tracking"
}
```

---

## 4. Mapeo UI ↔ Backend

### Pantalla de "Revisión de Dirección"

**Llamadas al backend:**
1. **Al cargar:** `POST /catalogo_geografico` con `{"tipo": "provincias"}` para cargar provincias
2. **Al seleccionar provincia:** `POST /catalogo_geografico` con `{"tipo": "cantones", "provincia_codigo": "X"}` 
3. **Al seleccionar cantón:** `POST /catalogo_geografico` con `{"tipo": "distritos", "provincia_codigo": "X", "canton_codigo": "XX"}`
4. **(Opcional) Al cambiar código postal:** `POST /validar_direccion` para validar que coincida con la ubicación


**Estado:** Esta pantalla NO llama a `/generar_guia`. Solo prepara los datos.

### Pantalla de "Confirmación Final"

**Envía:**
- Al presionar "Generar Guía Oficial": `POST /generar_guia` con el payload completo (ver sección 1.3)

**Recibe y Actúa:**

| Código HTTP | Acción en UI |
| :--- | :--- |
| `200 OK` | 1. Decodificar `pdf_base64`<br>2. Mostrar pantalla **"Resultado (Éxito)"**<br>3. Mostrar `tracking_number`<br>4. Ofrecer descarga del PDF: `guia-{tracking_number}.pdf`<br>5. Actualizar estado de orden a "Guía Creada" |
| `400 Bad Request` | 1. Volver a **"Revisión de Dirección"**<br>2. Resaltar campos en `errores[]`<br>3. Mostrar `descripcion` junto a cada campo |
| `503 Service Unavailable` | 1. Mostrar pantalla **"Resultado (Error Bloqueante)"**<br>2. Mensaje: "Problema de comunicación con Correos"<br>3. Botón: "Reintentar" / "Volver a la lista" |
| `429 Too Many Requests` | 1. Bloquear botón "Generar Guía" por `retry_after_seconds`<br>2. Mostrar timer: "Intente de nuevo en {X} segundos" |
| `500 Internal Server Error` | 1. Mostrar error genérico<br>2. Mostrar `error_id` para soporte<br>3. Botón: "Volver a la lista" |

---

## 5. Tabla de Manejo de Errores en la UI

| Código HTTP | `status` | Mensaje al Usuario | Acción Permitida |
| :--- | :--- | :--- | :--- |
| `200 OK` | `exito` | "¡Listo! Guía generada con éxito. Tracking: CR123..." | Descargar PDF, Volver a lista |
| `400 Bad Request` | `error_validacion` | "Revisá estos datos: [errores específicos]" | **Volver a revisión** (campos resaltados) |
| `503 Service Unavailable` | `error_servicio_externo` | "Problema de comunicación con Correos. Intentá de nuevo en unos minutos." | Reintentar, Volver a lista |
| `429 Too Many Requests` | `error_rate_limit` | "Demasiadas solicitudes. Esperá {X} segundos." | Esperar y reintentar (botón bloqueado) |
| `500 Internal Server Error` | `error_interno_backend` | "Error inesperado. ID: {error_id}. El equipo fue notificado." | Volver a lista |

---

## 6. Suposiciones Explícitas

### 6.1. Suposiciones del Backend (`correos-backend`)

* **Confianza en Payload:** El backend asume estructura JSON correcta, pero DEBE validar:
  - Códigos existen en catálogo de Correos
  - Código postal coincide con ubicación
  - Teléfono tiene formato correcto
  - Todos los campos obligatorios presentes
* **Stateless:** Cada llamada es independiente. No guarda estado entre requests.
* **Entorno Configurado:** Tiene credenciales y acceso al Web Service de Correos.
* **Caché de Catálogo:** Se recomienda cachear el catálogo geográfico por 24h para reducir llamadas a Correos.

### 6.2. Suposiciones de la UI (Remix + Polaris)

* **Conocimiento del Endpoint:** La UI conoce la URL base del backend (ej: `https://api-correos.ejemplo.com`)
* **Manejo de Estado:** La UI gestiona:
  - Bloqueo de botones durante requests
  - Spinners de carga
  - Mensajes de error/éxito
  - Resaltado de campos con error
* **Decodificación de PDF:** La UI decodifica `pdf_base64` y genera descarga.
* **Caché Local:** Puede cachear catálogo geográfico en sessionStorage para evitar llamadas repetidas.

### 6.3. Qué NO se Resuelve (Fuera de Alcance)

* **Autenticación:** No se define cómo autenticar UI ↔ Backend (se asume API Key, JWT u otro mecanismo)
* **Almacenamiento de Guías:** El backend no guarda PDFs. Solo los devuelve. La UI o Shopify deben almacenarlos.
* **Webhooks:** No hay notificaciones asíncronas. Todo es síncrono Request → Response.
* **Tracking de Estado de Envío:** No se contempla consultar el estado de una guía después de generada.

---

## 7. Validaciones Críticas del Backend

El backend **DEBE** validar lo siguiente antes de llamar a Correos:

### 7.1. Validación de Teléfono
```python
import re

def validar_telefono_cr(telefono: str) -> bool:
    # Exactamente 8 dígitos, empieza con 2, 4, 5, 6, 7 u 8
    pattern = r'^[24-8]\d{7}$'
    return bool(re.match(pattern, telefono))
```

### 7.2. Validación de Código Postal vs Ubicación

El backend debe consultar el catálogo de Correos y verificar que:
```
codigo_postal == distrito.codigo_postal
```

Donde `distrito` se obtiene de:
```
catalogo[provincia_codigo][canton_codigo][distrito_codigo].codigo_postal
```

Si no coincide → `400 Bad Request` con error específico.

### 7.3. Validación de Email (si presente)
```python
import re

def validar_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))
```

### 7.4. Validación de orden_id de Shopify
```python
def validar_shopify_order_id(orden_id: str) -> bool:
    # Formato: gid://shopify/Order/{número}
    pattern = r'^gid://shopify/Order/\d+$'
    return bool(re.match(pattern, orden_id))
```

---

## 8. Ejemplos de Flujo Completo

### Ejemplo 1: Flujo Exitoso

1. **UI carga "Revisión de Dirección"**
   ```
   POST /catalogo_geografico
   {"tipo": "provincias"}
   
   → Response: [{codigo: "1", nombre: "San José"}, ...]
   ```

2. **Usuario selecciona provincia "San José" (codigo: "1")**
   ```
   POST /catalogo_geografico
   {"tipo": "cantones", "provincia_codigo": "1"}
   
   → Response: [{codigo: "01", nombre: "San José"}, ...]
   ```

3. **Usuario selecciona cantón "San José" (codigo: "01")**
   ```
   POST /catalogo_geografico
   {"tipo": "distritos", "provincia_codigo": "1", "canton_codigo": "01"}
   
   → Response: [{codigo: "01", nombre: "Carmen", "codigo_postal": "10101"}, ...]
   ```

4. **Usuario completa formulario y va a "Confirmación Final"**

5. **Usuario presiona "Generar Guía Oficial"**
   ```
   POST /generar_guia
   {
     "orden_id": "gid://shopify/Order/5847109009704",
     "destinatario": {
       "nombre_completo": "Ana Rodríguez",
       "telefono": "88112233",
       "email": "ana@email.com"
     },
     "direccion_original": "Del Pali 200m sur",
     "direccion_corregida": {
       "codigo_postal": "10101",
       "provincia_codigo": "1",
       "provincia_nombre": "San José",
       "canton_codigo": "01",
       "canton_nombre": "San José",
       "distrito_codigo": "01",
       "distrito_nombre": "Carmen",
       "senas_adicionales": "Casa verde portón negro"
     }
   }
   
   → Response 200 OK:
   {
     "status": "exito",
     "guia": {
       "tracking_number": "CR123456789CR",
       "pdf_base64": "JVBERi0x...",
       "fecha_generacion": "2026-01-18T03:32:00Z"
     }
   }
   ```

6. **UI muestra pantalla de éxito con PDF descargable**

---

### Ejemplo 2: Error de Código Postal No Coincide

1. Usuario completa formulario con:
   - Provincia: San José (codigo: 1)
   - Cantón: San José (codigo: 01)  
   - Distrito: Carmen (codigo: 01)
   - Código Postal: **99999** (incorrecto, debería ser 10101)

2. Usuario presiona "Generar Guía Oficial"

3. Backend valida y detecta error:
   ```
   POST /generar_guia
   
   → Response 400 Bad Request:
   {
     "status": "error_validacion",
     "mensaje": "Los datos son inválidos.",
     "errores": [
       {
         "campo": "direccion_corregida.codigo_postal",
         "descripcion": "El código postal 99999 no corresponde a San José > San José > Carmen. El código correcto es 10101."
       }
     ]
   }
   ```

4. UI vuelve a "Revisión de Dirección", resalta el campo "Código Postal" y muestra el mensaje de error.

---

### Ejemplo 3: Servicio de Correos Caído

1. Usuario presiona "Generar Guía Oficial"
2. Backend intenta comunicarse con Correos pero falla (timeout, 503, etc.)
   ```
   POST /generar_guia
   
   → Response 503 Service Unavailable:
   {
     "status": "error_servicio_externo",
     "mensaje": "No se pudo comunicar con Correos de Costa Rica.",
     "detalle_error": "Timeout después de 30 segundos."
   }
   ```

3. UI muestra pantalla de error bloqueante:
   - "El servicio de Correos no está disponible"
   - Botón "Reintentar"
   - Botón "Volver a la lista"

---

## 9. Checklist de Implementación

### Para el Backend:
- [ ] Endpoint `POST /catalogo_geografico` implementado
- [ ] Caché de catálogo geográfico (24h recomendado)
- [ ] Endpoint `POST /generar_guia` implementado
- [ ] Validación de teléfono (8 dígitos, empieza con 2/4/5/6/7/8)
- [ ] Validación de código postal vs ubicación
- [ ] Validación de orden_id de Shopify (GID format)
- [ ] Manejo de errores 400, 503, 429, 500
- [ ] Logging de errores con error_id
- [ ] (Opcional) Endpoint `POST /validar_direccion`

### Para la UI:
- [ ] Integración con `/catalogo_geografico` en pantalla de revisión
- [ ] Cascada de selects: Provincia → Cantón → Distrito
- [ ] Auto-llenado de nombres al seleccionar códigos
- [ ] Validación de teléfono en frontend (8 dígitos, regex)
- [ ] Validación de código postal (5 dígitos)
- [ ] Envío de códigos + nombres en payload
- [ ] Manejo de respuesta 200: decodificar PDF y mostrar descarga
- [ ] Manejo de respuesta 400: resaltar campos con error
- [ ] Manejo de respuesta 503: mostrar error de servicio externo
- [ ] Manejo de respuesta 429: bloquear botón con timer
- [ ] Manejo de respuesta 500: mostrar error_id
- [ ] Spinners de carga durante requests
- [ ] (Opcional) Caché de catálogo en sessionStorage

---

## 10. Notas Finales

### Cambios Importantes vs v1:
1. **NUEVO:** Endpoint `/catalogo_geografico` para obtener datos dinámicos
2. **CAMBIO:** Enviar códigos en lugar de solo nombres en `direccion_corregida`
3. **MEJORA:** Validación de teléfono más estricta (debe empezar con 2/4/5/6/7/8)
4. **MEJORA:** Validación de código postal vs ubicación en backend
5. **NUEVO:** Endpoint opcional `/validar_direccion` para validación previa

### Recomendaciones de Implementación:
- **Caché:** Implementar caché de catálogo geográfico en ambos lados (backend: 24h, frontend: session)
- **Timeout:** Configurar timeout de 30 segundos para llamadas a Correos
- **Retry:** Implementar retry con backoff exponencial en el backend
- **Logging:** Registrar todas las llamadas a Correos con timestamps para debugging
- **Monitoreo:** Alertar si el servicio de Correos falla >3 veces seguidas

---

**Versión:** 2.0  
**Fecha:** 2026-01-18  
**Autor:** Contrato corregido basado en integración real con API de Correos de Costa Rica

---

## Apéndice: Estructura Completa de Datos de Correos

### Ejemplo de Catálogo Completo:
```json
{
  "provincias": [
    {
      "codigo": "1",
      "nombre": "San José",
      "cantones": [
        {
          "codigo": "01",
          "nombre": "San José",
          "distritos": [
            {"codigo": "01", "nombre": "Carmen", "codigo_postal": "10101"},
            {"codigo": "02", "nombre": "Merced", "codigo_postal": "10102"}
          ]
        }
      ]
    }
  ]
}
```

Esta estructura debe ser devuelta por `/catalogo_geografico` según el `tipo` solicitado.

---

**FIN DEL CONTRATO v2**
