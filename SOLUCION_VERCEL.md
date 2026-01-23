# 🚀 Solución para Despliegue en Vercel/Render

## 📋 Problema Detectado
Las provincias no cargan correctamente en producción (Vercel), pero funcionan en local.

## 🔍 Causas Probables

### 1. Variable de Entorno No Configurada en Vercel
**Problema:** El frontend en Vercel no sabe la URL del backend en Render.

**Solución:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   ```
   VITE_BACKEND_URL=https://tu-backend.onrender.com
   ```
   (Reemplaza con la URL real de tu backend en Render)
4. Deploy → Redeploy

### 2. CORS No Configurado en Backend
**Problema:** El backend en Render no acepta requests desde Vercel.

**Solución:** Agregar CORS al backend Python.

Edita `correos-backend/src/api/endpoints.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

# Después de crear la app
app = FastAPI(
    title="Integración Correos de Costa Rica",
    description="API para generar guías de envío",
    version="1.0.0"
)

# AGREGAR ESTO:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local
        "https://tu-frontend.vercel.app",  # Producción
        "https://*.vercel.app",  # Todos los deploys de Vercel
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Backend No Desplegado en Render
**Verificar que el backend esté corriendo:**
1. Ve a https://tu-backend.onrender.com/health
2. Deberías ver: `{"status":"healthy","service":"Integración Correos de Costa Rica"}`

Si no carga, verifica:
- Que el servicio esté activo en Render Dashboard
- Que las variables de entorno estén configuradas en Render
- Que los logs no muestren errores

### 4. Catálogo No Incluido en Deploy
**Problema:** El archivo `catalogo_geografico.json` no se incluye en el deploy.

**Verificar:** El archivo debe estar en:
```
correos-backend/src/data/catalogo_geografico.json
```

**Render debe incluirlo automáticamente**, pero si no:
1. Verifica que no esté en `.gitignore`
2. Haz commit y push del archivo

## 📝 Checklist de Verificación

### En Vercel (Frontend):
- [ ] Variable `VITE_BACKEND_URL` configurada
- [ ] Deploy exitoso
- [ ] No hay errores en los logs de Vercel
- [ ] Consola del navegador no muestra errores de CORS

### En Render (Backend):
- [ ] Servicio activo y desplegado
- [ ] Variables de entorno configuradas (credenciales de Correos)
- [ ] CORS configurado para aceptar requests de Vercel
- [ ] Archivo `catalogo_geografico.json` presente
- [ ] Endpoint `/health` responde correctamente
- [ ] Endpoint `/catalogo_geografico` funciona con Postman/curl

### Prueba Manual:
```bash
# 1. Probar health del backend
curl https://tu-backend.onrender.com/health

# 2. Probar catálogo
curl -X POST https://tu-backend.onrender.com/catalogo_geografico \
  -H "Content-Type: application/json" \
  -d '{"tipo": "provincias"}'

# Debe retornar 7 provincias
```

## 🎯 Orden de Ejecución

1. **Backend (Render):**
   - Agregar CORS
   - Verificar catálogo
   - Commit y push
   - Esperar redeploy automático

2. **Frontend (Vercel):**
   - Configurar `VITE_BACKEND_URL`
   - Trigger redeploy
   - Verificar en consola del navegador

3. **Pruebas:**
   - Abrir https://tu-frontend.vercel.app
   - Ir a órdenes → revisar
   - Verificar que carguen las 7 provincias
   - Seleccionar provincia y verificar cantones
   - Seleccionar cantón y verificar distritos

## 🐛 Debugging

### Si las provincias no cargan en Vercel:

1. **Abre la consola del navegador** (F12)
2. Busca mensajes que digan:
   - `📍 Solicitando provincias al servidor...`
   - `✅ Provincias obtenidas` ← Si ves esto, funciona
   - `❌ Error obteniendo provincias, usando fallback local` ← Problema de conectividad

3. **Si usa fallback local:**
   - Verifica la URL en Network tab
   - Debería llamar a `/api/catalogo`
   - Revisa la respuesta del servidor

4. **Si hay error de CORS:**
   ```
   Access to fetch at 'https://backend...' from origin 'https://frontend...'
   has been blocked by CORS policy
   ```
   → Falta configurar CORS en el backend

5. **Si el endpoint no existe:**
   ```
   POST /api/catalogo 404 Not Found
   ```
   → El backend no está conectado o la URL está mal

## 📊 Arquitectura Actual

```
┌──────────────────┐
│  Vercel          │
│  (Frontend)      │
│  Remix + React   │
└────────┬─────────┘
         │ VITE_BACKEND_URL
         │
         v
┌──────────────────┐
│  Render          │
│  (Backend)       │
│  FastAPI         │
│  + Catálogo JSON │
└────────┬─────────┘
         │
         v
┌──────────────────┐
│  API Correos     │
│  (Solo para      │
│   generar guías) │
└──────────────────┘
```

## ✅ Resultado Esperado

Cuando funcione correctamente, en la consola del navegador verás:

```
📍 Solicitando provincias al servidor...
✅ Provincias obtenidas (CACHE): 7
📍 Solicitando cantones para provincia 3...
✅ Cantones obtenidos (CACHE): 8
📍 Solicitando distritos para provincia 3, cantón 01...
✅ Distritos obtenidos (CACHE): 11
```

La fuente debe decir `CACHE` porque el backend lee del archivo JSON.

## 🆘 Si Nada Funciona

Como medida temporal, el código tiene **fallback a datos locales**:
- Las 7 provincias siempre cargarán
- Cantones y distritos limitados (solo ~30 distritos)
- Suficiente para pruebas, pero incompleto para producción

Para datos completos (495 distritos), el backend DEBE estar funcionando.
