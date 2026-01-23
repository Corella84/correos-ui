# Generación del Catálogo Geográfico Completo

## Descripción

Script para descargar el catálogo geográfico completo de Costa Rica desde el Web Service SOAP de Correos de Costa Rica.

## Requisitos

1. Variables de entorno configuradas en `.env`:
   ```bash
   CORREOS_USERNAME=ccrWS397761
   CORREOS_PASSWORD=hwoeDmZwyZ
   CORREOS_SISTEMA=PYMEXPRESS
   CORREOS_TOKEN_URL=https://servicios.correos.go.cr:447/Token/authenticate
   CORREOS_SOAP_URL=https://amistadpro.correos.go.cr:444/wsAppCorreos.wsAppCorreos.svc
   ```

2. Dependencias instaladas:
   ```bash
   pip install -r requirements.txt
   ```

## Uso

```bash
cd correos-backend
python generate_catalog_from_soap.py
```

## Proceso

El script ejecuta los siguientes pasos:

1. **Obtener provincias** (`ccrCodProvincia`)
   - Descarga las 7 provincias de Costa Rica
   - Valida que la respuesta sea exitosa

2. **Obtener cantones** (`ccrCodCanton`)
   - Para cada provincia, descarga todos sus cantones
   - Total esperado: ~84 cantones

3. **Obtener distritos** (`ccrCodDistrito`)
   - Para cada combinación provincia-cantón, descarga todos los distritos
   - Total esperado: ~489 distritos
   - Genera código postal automáticamente (formato: provincia + cantón + distrito)

4. **Guardar JSON**
   - Guarda el catálogo completo en `src/data/catalogo_geografico.json`
   - Formato: JSON con estructura jerárquica

## Estructura del JSON Generado

```json
{
  "provincias": [
    {"codigo": "1", "nombre": "San José"},
    ...
  ],
  "cantones": {
    "1": [
      {"codigo": "01", "nombre": "San José"},
      ...
    ],
    ...
  },
  "distritos": {
    "1-01": [
      {"codigo": "01", "nombre": "Carmen", "codigoPostal": "10101"},
      ...
    ],
    ...
  }
}
```

## Resultado Esperado

- ✅ 7 provincias
- ✅ ~84 cantones
- ✅ ~489 distritos
- ✅ Archivo JSON de ~58KB

## Notas Importantes

- ⚠️ Este script se ejecuta **UNA SOLA VEZ** en local
- ⚠️ El JSON generado se incluye en el deploy del backend
- ⚠️ El backend **NO** llama SOAP en runtime, solo lee el JSON
- ⚠️ Para actualizar el catálogo, ejecutar este script nuevamente y hacer commit del JSON

## Troubleshooting

### Error de autenticación
- Verificar que las credenciales en `.env` sean correctas
- Verificar que `CORREOS_TOKEN_URL` sea accesible

### Error de conexión SOAP
- Verificar que `CORREOS_SOAP_URL` sea accesible
- Verificar conectividad a internet
- Verificar certificados SSL si hay errores de SSL

### Catálogo incompleto
- Revisar logs del script para identificar qué provincias/cantones fallaron
- Reintentar ejecución del script
- Verificar que el servicio SOAP de Correos esté disponible

## Tiempo de Ejecución

- Tiempo estimado: 2-5 minutos
- Depende de la velocidad de conexión y respuesta del servicio SOAP
- El script incluye delays pequeños para evitar rate limiting
