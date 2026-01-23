# Backend: Catálogo Geográfico Cacheado

## Problema Resuelto

El endpoint `/api/catalogo` devolvía 500 en producción porque llamaba al SOAP de Correos en runtime, y Render cortaba o fallaba la ejecución.

## Solución Implementada

Cache del catálogo geográfico completo en memoria al iniciar el backend.

## Archivos Creados/Modificados

### 1. **NUEVO**: `src/services/catalogo_service.py`
- Servicio que maneja el cache global del catálogo
- Cache estructura:
  ```python
  CATALOGO_CACHE = {
      "cargado": False,
      "provincias": [],
      "cantones": {codigo_provincia: [cantones]},
      "distritos": {codigo_provincia: {codigo_canton: [distritos]}}
  }
  ```
- Método `cargar_catalogo_completo()`: Llama SOAP UNA VEZ al inicio
- Métodos `get_provincias/cantones/distritos()`: Leen SOLO del cache

### 2. **MODIFICADO**: `src/api/endpoints.py`
- Agregado evento `@app.on_event("startup")`: Ejecuta `catalogo_service.cargar_catalogo_completo()` al arrancar
- Agregado endpoint `POST /catalogo_geografico`:
  - Requestparámetros: `tipo`, `provincia_codigo`, `canton_codigo`
  - Lee SOLO del cache, NUNCA llama SOAP
  - Filtra según parámetros
  - Responde inmediato

## Flujo de Ejecución

### Al Iniciar el Backend (UNA VEZ)
```
1. FastAPI startup event se dispara
2. catalogo_service.cargar_catalogo_completo()
3. Llama SOAP CCRCATALOGOS:
   - Carga 7 provincias
   - Para cada provincia: carga todos sus cantones
   - Para cada cantón: carga todos sus distritos
4. Guarda todo en CATALOGO_CACHE global
5. Marca CATALOGO_CACHE["cargado"] = True
```

### En Requests (`POST /catalogo_geografico`)
```
1. Lee parámetros (tipo, provincia_codigo, canton_codigo)
2. Llama método correspondiente del catalogo_service
3. catalogo_service lee del CATALOGO_CACHE (sin SOAP)
4. Filtra y devuelve datos
5. Respuesta inmediata
```

## Logs Esperados

### Al Iniciar
```
============================================================
INICIANDO SERVIDOR - CARGANDO CATÁLOGO GEOGRÁFICO
============================================================
📦 Iniciando carga de catálogo geográfico desde SOAP...
Cargando provincias...
✅ 7 provincias cargadas
Cargando cantones por provincia...
  Provincia 1: 20 cantones
  Provincia 2: 15 cantones
  ...
Cargando distritos por provincia/cantón...
✅ 473 distritos cargados en total
✅ Catálogo geográfico completo cargado exitosamente
============================================================
CATÁLOGO CARGADO EXITOSAMENTE
============================================================
```

### En Requests
```
📦 Consulta catálogo: tipo=provincias, prov=None, cant=None
✅ Devolviendo 7 provincias desde CACHE

📦 Consulta catálogo: tipo=cantones, prov=1, cant=None
✅ Devolviendo 20 cantones (prov=1) desde CACHE
```

## Verificación

1. Deploy a Render
2. Revisar logs de startup (debe mostrar carga del catálogo)
3. Verificar frontend muestra todas las provincias
4. No debe haber errores 500 en `/api/catalogo`
5. No debe haber llamadas SOAP durante requests

## Garantías

✅ SOAP se llama SOLO una vez al iniciar  
✅ Requests leen del cache (respuesta inmediata)  
✅ No hay errores 500 por timeout  
✅ Todas las provincias de Correos aparecen  
✅ No se toca frontend, Shopify, ni PDFs
