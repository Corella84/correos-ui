# Integración API de Correos de Costa Rica

## ✅ Implementación Completada

Se ha completado la integración con las APIs de Correos de Costa Rica para obtener datos geográficos dinámicamente.

### Archivos Creados/Modificados

#### 1. **`app/services/correos.api.ts`** (NUEVO)
Servicio que maneja:
- ✅ Autenticación con token (renovación automática cada 5 minutos)
- ✅ Llamadas SOAP al Web Service de Correos
- ✅ Función `getProvincias()` - Obtiene todas las provincias
- ✅ Función `getCantones(codigoProvincia)` - Obtiene cantones de una provincia
- ✅ Función `getDistritos(codigoProvincia, codigoCanton)` - Obtiene distritos de un cantón
- ✅ Fallback a datos estáticos en caso de error de API

#### 2. **`app/routes/orders.$id.review.tsx`** (MODIFICADO)
Actualizado para:
- ✅ Importar y usar las funciones de la API de Correos
- ✅ Cargar provincias al montar el componente
- ✅ Cargar cantones dinámicamente cuando cambia la provincia
- ✅ Cargar distritos dinámicamente cuando cambia el cantón
- ✅ Mostrar indicadores de carga ("Cargando desde API...") en los Select
- ✅ Deshabilitar selects mientras cargan datos
- ✅ Usar datos de API con fallback a datos estáticos

#### 3. **Otros archivos corregidos**
- ✅ `orders.$id.confirm.tsx` - Corregido import de Polaris
- ✅ `orders.$id.result.tsx` - Corregido import de Polaris
- ✅ `orders._index.tsx` - Corregido import de Polaris
- ✅ `_index.tsx` - Corregido import de Polaris

---

## 🔧 Configuración de la API

### Credenciales (Ya configuradas en el código)
```
Usuario: ccrWS397761
Clave: hwoeDmZwyZ
Sistema: PYMEXPRESS
```

### Endpoints
- **Token**: `https://servicios.correos.go.cr:447/Token/authenticate`
- **SOAP**: `https://amistadpro.correos.go.cr:444/wsAppCorreos.wsAppCorreos.svc`

### Métodos Implementados
1. `ccrCodProvincia` - Obtiene provincias
2. `ccrCodCanton` - Obtiene cantones por provincia
3. `ccrCodDistrito` - Obtiene distritos por cantón

---

## 🧪 Próximos Pasos para Probar

### 1. Iniciar el servidor de desarrollo
```bash
cd /Users/juandiegocorellavega/Desktop/correos-ui
npm run dev
```

### 2. Navegar a la página de revisión
Abrir en el navegador: `http://localhost:5174/orders/1024/review`

### 3. Observar en la consola del navegador
Deberías ver logs como:
```
🔑 Solicitando nuevo token a Correos API
✅ Token obtenido exitosamente
📡 Llamando SOAP method: ccrCodProvincia
✅ SOAP response recibida para ccrCodProvincia
✅ Provincias cargadas desde API: 7
```

### 4. Probar el flujo completo
1. Seleccionar una provincia (ej: Cartago)
   - Debería cargar cantones desde la API
   - Consola: `✅ Cantones cargados para provincia 3: X`
2. Seleccionar un cantón
   - Debería cargar distritos desde la API
   - Consola: `✅ Distritos cargados para provincia 3, canton Y: Z`
3. Verificar que todos los cantones y distritos estén disponibles (no solo los de muestra)

---

## 🐛 Debugging

### Si la API no responde:
- El sistema automáticamente hará fallback a los datos estáticos de `costaRica.ts`
- Revisar la consola del navegador para mensajes de error
- Verificar que las credenciales sean correctas
- Verificar conectividad a los endpoints de Correos

### Estructura de respuesta SOAP esperada:
El parser actual es básico y busca tags `<Result>`. Si la estructura real de la API es diferente, será necesario ajustar la función `parseSOAPResponse()` en `correos.api.ts`.

### Logs útiles:
- `🔑` - Autenticación de token
- `📡` - Llamada SOAP iniciada
- `✅` - Operación exitosa
- `❌` - Error en operación
- `⚠️` - Advertencia

---

## 📝 Notas Importantes

1. **Token Cache**: El token se cachea en memoria y se renueva automáticamente cuando expira (5 minutos)
2. **Fallback Automático**: Si la API falla, el sistema usa los datos estáticos sin interrumpir la UX
3. **Indicadores de Carga**: Los selects muestran "Cargando desde API..." mientras obtienen datos
4. **CORS**: Si hay problemas de CORS, puede ser necesario configurar un proxy en Vite o manejar las llamadas desde el servidor
5. **TypeScript**: Todas las interfaces están tipadas correctamente
6. **Performance**: Las llamadas a la API se hacen solo cuando es necesario (cuando cambia la selección del usuario)

---

## 🔄 Flujo de Carga de Datos

```
Montaje del componente
    ↓
getProvincias() → API de Correos
    ↓
Usuario selecciona Provincia
    ↓
getCantones(provincia) → API de Correos
    ↓
Usuario selecciona Cantón
    ↓
getDistritos(provincia, canton) → API de Correos
    ↓
Datos completos cargados
```

---

## ⚡ Mejoras Futuras Sugeridas

1. **Parser XML robusto**: Usar librería como `fast-xml-parser` para parsear respuestas SOAP
2. **Cache persistente**: Guardar datos en localStorage para evitar llamadas repetidas
3. **Retry logic**: Implementar reintentos automáticos en caso de fallo temporal
4. **Manejo de errores mejorado**: Mostrar mensajes específicos al usuario cuando falla la API
5. **Loading states más detallados**: Spinners o skeletons en lugar de solo deshabilitar
6. **Prefetch**: Precargar cantones de las provincias más comunes

---

## 📊 Estado Actual

✅ **Implementación completada**
✅ **Build exitoso** (sin errores de TypeScript)
⏳ **Pendiente**: Prueba con servidor en vivo para verificar respuestas reales de la API

---

## 🚀 Para Iniciar las Pruebas

```bash
cd /Users/juandiegocorellavega/Desktop/correos-ui
npm run dev
```

Luego abrir: `http://localhost:5174/orders/1024/review`

Y observar la consola del navegador para ver los logs de la API.
