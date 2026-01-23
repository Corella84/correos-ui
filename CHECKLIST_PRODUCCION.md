# ✅ Checklist para Despliegue en Producción

## 🎯 Antes de Desplegar

### Backend (Render)
- [ ] CORS configurado en `correos-backend/src/api/endpoints.py` ✅ (Ya hecho)
- [ ] Archivo `catalogo_geografico.json` presente (58KB, 7 provincias, 84 cantones, 495 distritos)
- [ ] Variables de entorno configuradas en Render:
  ```
  CORREOS_USERNAME=ccrWS397761
  CORREOS_PASSWORD=hwoeDmZwyZ
  CORREOS_SISTEMA=PYMEXPRESS
  CORREOS_USUARIO_ID=397761
  CORREOS_SERVICIO_ID=73
  CORREOS_COD_CLIENTE=397761
  CORREOS_TOKEN_URL=https://servicios.correos.go.cr:447/Token/authenticate
  CORREOS_SOAP_URL=https://amistadpro.correos.go.cr:444/wsAppCorreos.wsAppCorreos.svc
  LOG_LEVEL=INFO
  TOKEN_REFRESH_BUFFER_SECONDS=60
  ```

### Frontend (Vercel)
- [ ] Variable de entorno configurada en Vercel:
  ```
  VITE_BACKEND_URL=https://TU-BACKEND.onrender.com
  ```
  **⚠️ IMPORTANTE:** Reemplaza `TU-BACKEND` con la URL real de Render

## 🚀 Pasos de Despliegue

### 1. Desplegar Backend en Render

```bash
# Asegurarte de que los cambios estén commiteados
git status
git add .
git commit -m "fix: add CORS configuration for Vercel"
git push origin main
```

Render debería redesplegar automáticamente. Si no:
1. Ve a Render Dashboard
2. Manual Deploy → Deploy latest commit

### 2. Verificar Backend

Una vez desplegado, prueba:

```bash
# Reemplaza TU-BACKEND con tu URL real de Render
export BACKEND_URL="https://TU-BACKEND.onrender.com"

# 1. Health check
curl $BACKEND_URL/health

# Debe retornar:
# {"status":"healthy","service":"Integración Correos de Costa Rica"}

# 2. Probar catálogo de provincias
curl -X POST $BACKEND_URL/catalogo_geografico \
  -H "Content-Type: application/json" \
  -d '{"tipo": "provincias"}'

# Debe retornar:
# {
#   "success": true,
#   "data": [
#     {"codigo": "1", "nombre": "San José"},
#     {"codigo": "2", "nombre": "Alajuela"},
#     ...7 provincias total
#   ],
#   "fuente": "CACHE"
# }

# 3. Probar cantones
curl -X POST $BACKEND_URL/catalogo_geografico \
  -H "Content-Type: application/json" \
  -d '{"tipo": "cantones", "provincia_codigo": "3"}'

# Debe retornar 8 cantones de Cartago

# 4. Probar distritos
curl -X POST $BACKEND_URL/catalogo_geografico \
  -H "Content-Type: application/json" \
  -d '{"tipo": "distritos", "provincia_codigo": "3", "canton_codigo": "01"}'

# Debe retornar 11 distritos de Cartago
```

### 3. Configurar Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   - Name: `VITE_BACKEND_URL`
   - Value: `https://TU-BACKEND.onrender.com` (tu URL real)
   - Environment: Production, Preview, Development (todas)
4. Guarda

### 4. Redesplegar Frontend

Desde Vercel Dashboard:
1. Deployments tab
2. Último deployment → ⋮ (tres puntos)
3. Redeploy

O desde terminal:
```bash
# Si tienes Vercel CLI instalado
vercel --prod
```

### 5. Verificar en Producción

1. Abre tu app en Vercel: `https://tu-app.vercel.app`
2. Abre la consola del navegador (F12)
3. Ve a una orden para revisar
4. Deberías ver en la consola:
   ```
   📍 Solicitando provincias al servidor...
   ✅ Provincias obtenidas (CACHE): 7
   ```

5. Selecciona una provincia, debería cargar cantones
6. Selecciona un cantón, debería cargar distritos

## 🐛 Troubleshooting

### Problema: "CORS Error" en la consola del navegador

```
Access to fetch at 'https://...' has been blocked by CORS policy
```

**Solución:**
1. Verifica que el backend tenga CORS configurado (ya lo hicimos)
2. Redesplega el backend en Render
3. Espera 2-3 minutos para que se active
4. Prueba de nuevo

### Problema: "Failed to fetch" o timeout

**Posibles causas:**
1. El backend está en "sleep" (free tier de Render)
   - **Solución:** Espera 30 segundos para que despierte
   - Primera carga siempre es lenta en free tier

2. URL del backend incorrecta
   - **Solución:** Verifica `VITE_BACKEND_URL` en Vercel
   - Debe empezar con `https://` y terminar sin `/`

3. Backend no está desplegado
   - **Solución:** Verifica en Render Dashboard que esté "Live"

### Problema: Solo carga 7 provincias pero no cantones/distritos

**Causa:** El backend está respondiendo pero el catálogo está incompleto

**Solución:**
1. Verifica el tamaño del archivo:
   ```bash
   ls -lh correos-backend/src/data/catalogo_geografico.json
   # Debe ser ~58KB
   ```

2. Si es más pequeño, el catálogo está incompleto
3. El archivo debe tener esta estructura:
   ```json
   {
     "provincias": [7 items],
     "cantones": {
       "1": [20 items],
       "2": [15 items],
       ...
     },
     "distritos": {
       "1-01": [11 items],
       ...
     }
   }
   ```

### Problema: Funciona en local pero no en producción

**Verificar:**
1. Variable `VITE_BACKEND_URL` configurada en Vercel
2. Backend en Render está activo (no en error)
3. CORS configurado en el backend
4. No hay errores en Render logs

## 📊 Verificación Final

Una vez desplegado, prueba el flujo completo:

1. [ ] Health check del backend funciona
2. [ ] Catálogo de provincias responde (7 provincias)
3. [ ] Catálogo de cantones responde (para cada provincia)
4. [ ] Catálogo de distritos responde (para cada cantón)
5. [ ] Frontend carga sin errores
6. [ ] Al abrir una orden, carga las 7 provincias
7. [ ] Al seleccionar provincia, carga cantones
8. [ ] Al seleccionar cantón, carga distritos
9. [ ] Al confirmar, puede generar guía

## 🎉 Éxito

Si todo funciona, verás en la consola:

```
📍 Solicitando provincias al servidor...
✅ Provincias obtenidas (CACHE): 7
📍 Solicitando cantones para provincia 3...
✅ Cantones obtenidos (CACHE): 8
📍 Solicitando distritos para provincia 3, cantón 01...
✅ Distritos obtenidos (CACHE): 11
```

¡La aplicación está lista para generar guías de Correos! 🚀

## 📝 Notas Importantes

1. **Free Tier de Render:**
   - El backend "duerme" después de 15 minutos de inactividad
   - Primera request tarda ~30 segundos en despertar
   - Esto es normal y esperado en el plan gratuito

2. **Fallback Local:**
   - Si el backend falla, el frontend usa datos locales
   - Solo tiene ~30 distritos (en vez de 495)
   - Suficiente para pruebas, incompleto para producción

3. **Monitoring:**
   - Revisa los logs de Render regularmente
   - Vercel tiene analytics automático
   - Configura alertas si el backend está down

## 🔗 URLs de Referencia

- **Backend (Render):** https://dashboard.render.com
- **Frontend (Vercel):** https://vercel.com/dashboard
- **Repo GitHub:** https://github.com/Corella84/correos-ui
- **API de Correos (Docs):** `contrato-api-correos-v2-CORREGIDO.md`
