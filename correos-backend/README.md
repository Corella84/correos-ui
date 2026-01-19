# Correos Backend

Backend independiente para generar guías de Correos de Costa Rica.

## Ejecución

```bash
# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales

# Ejecutar servidor
python run.py
```

El servidor se ejecutará en `http://0.0.0.0:8000`

## Endpoints

### GET /
Endpoint de salud básico.

### GET /health
Endpoint de salud detallado.

### POST /generar_guia
Genera una guía de envío completa.

**Request Body:**
```json
{
  "remitente": {
    "nombre": "Tribu Mates",
    "direccion": "San José, Costa Rica",
    "telefono": "22221234",
    "codigo_postal": "10101"
  },
  "destinatario": {
    "nombre": "Juan Pérez",
    "direccion": "Del Pali 200 metros sur",
    "telefono": "8888-8888",
    "codigo_postal": "10101",
    "codigo_postal_zip": "10101"
  },
  "peso": 500.0,
  "monto_flete": 2000.0,
  "observaciones": "Paquete frágil"
}
```

**Response Success:**
```json
{
  "exito": true,
  "numero_envio": "PY064089266CR",
  "codigo_respuesta": "00",
  "mensaje_respuesta": "Éxito",
  "pdf_base64": "JVBERi0xLjQKJeLjz9MK..."
}
```

**Response Error:**
```json
{
  "exito": false,
  "error": "Mensaje de error",
  "numero_envio": null,
  "pdf_base64": null
}
```

## Archivos Copiados

- `run.py` - Script de ejecución
- `requirements.txt` - Dependencias (sin Streamlit)
- `env.example` - Ejemplo de variables de entorno
- `src/config.py` - Configuración
- `src/models/envio.py` - Modelos Pydantic
- `src/api/endpoints.py` - Endpoints FastAPI
- `src/services/auth_service.py` - Autenticación
- `src/services/soap_client.py` - Cliente SOAP
- `src/services/guia_service.py` - Servicio de guías
- `src/services/envio_service.py` - Servicio de envíos
- `src/__init__.py` - Init del paquete
- `src/api/__init__.py` - Init del API
- `src/services/__init__.py` - Init de servicios
