# 🚀 Configuración para Vercel - LISTO PARA COPIAR/PEGAR

## ✅ Backend Verificado

**URL Backend:** `https://correos-backend.onrender.com`
- ✅ Health endpoint funcionando
- ✅ CORS configurado para Vercel
- ✅ Catálogo completo desplegado

## 📝 Configurar Variable de Entorno en Vercel

### Paso 1: Ir a Vercel Dashboard
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto (correos-ui o el nombre que tenga)
3. Click en **Settings** (en el menú superior)
4. Click en **Environment Variables** (menú lateral izquierdo)

### Paso 2: Agregar Variable de Entorno

Haz click en **Add New** y copia/pega exactamente esto:

```
Name: VITE_BACKEND_URL
Value: https://correos-backend.onrender.com
```

**IMPORTANTE:** NO agregues `/` al final de la URL

### Paso 3: Seleccionar Environments

Marca las 3 opciones:
- ✅ Production
- ✅ Preview
- ✅ Development

### Paso 4: Guardar

Haz click en **Save**

### Paso 5: Redesplegar

Hay 2 formas:

**Opción A - Desde Dashboard:**
1. Ve a la tab **Deployments**
2. Encuentra el último deployment
3. Click en los 3 puntos (⋮) al lado
4. Click en **Redeploy**
5. Confirma **Redeploy**

**Opción B - Hacer un Commit Nuevo:**
```bash
git commit --allow-empty -m "trigger: redeploy with VITE_BACKEND_URL"
git push origin main
```

## 🧪 Verificar que Funciona

Una vez redespliegue (tarda ~2 minutos):

### 1. Abrir tu App en Vercel
```
https://tu-app.vercel.app
```

### 2. Abrir Consola del Navegador
- Presiona **F12** o **Cmd+Option+I** (Mac)
- Ve a la tab **Console**

### 3. Navegar a una Orden
- Click en "Ver órdenes"
- Click en cualquier orden para "Revisar"

### 4. Verificar en la Consola

Deberías ver mensajes como:
```
📍 Solicitando provincias al servidor...
✅ Provincias obtenidas (CACHE): 7
```

Si ves esto, **¡FUNCIONA!** ✅

### 5. Probar Flujo Completo

1. Selecciona una **provincia** (ej: Cartago)
   - Consola debe mostrar: `✅ Cantones obtenidos (CACHE): 8`

2. Selecciona un **cantón** (ej: Cartago)
   - Consola debe mostrar: `✅ Distritos obtenidos (CACHE): 11`

3. Selecciona un **distrito**
   - El código postal debería auto-completarse

¡Si todo esto funciona, el sistema está listo para generar guías! 🎉

## ❌ Si Algo Sale Mal

### Problema: Error de CORS en la consola

```
Access to fetch at 'https://correos-backend.onrender.com...'
from origin 'https://tu-app.vercel.app' has been blocked by CORS policy
```

**Causa:** El backend todavía no se actualizó con la configuración de CORS.

**Solución:**
1. Espera 2-3 minutos más (Render puede tardar)
2. Verifica en Render Dashboard que el deploy terminó
3. Prueba de nuevo

### Problema: Backend muy lento o timeout

```
❌ Error obteniendo provincias, usando fallback local
```

**Causa:** Backend en free tier de Render se "duerme" después de 15 minutos de inactividad.

**Solución:**
1. Esto es **normal** y **esperado** en el plan gratuito
2. La primera request tarda ~30 segundos (despertando el backend)
3. Refresca la página y vuelve a intentar
4. Las siguientes requests serán rápidas

### Problema: Solo carga fallback local (30 distritos)

**Verificar:**
1. La variable `VITE_BACKEND_URL` está configurada
2. El valor es exactamente: `https://correos-backend.onrender.com`
3. Redesplegar después de agregar la variable

### Problema: "Failed to fetch"

**Verificar:**
1. Backend está activo en Render Dashboard
2. Probar manualmente: https://correos-backend.onrender.com/health
   - Debería mostrar: `{"status":"healthy","service":"Integración Correos de Costa Rica"}`

## 🎯 Resumen de lo Configurado

| Componente | URL | Estado |
|------------|-----|--------|
| Backend | https://correos-backend.onrender.com | ✅ Activo |
| Health Check | https://correos-backend.onrender.com/health | ✅ OK |
| Catálogo | /catalogo_geografico | ✅ 7 prov, 84 cant, 495 dist |
| CORS | Configurado para Vercel | ✅ OK |
| Frontend | Tu URL en Vercel | ⏳ Necesita variable env |

## 📞 Siguiente Paso

1. Configura la variable `VITE_BACKEND_URL` en Vercel
2. Redesplegar
3. Probar en el navegador
4. ¡Listo para producción! 🚀

---

**¿Dudas?** Revisa:
- `SOLUCION_VERCEL.md` - Troubleshooting completo
- `CHECKLIST_PRODUCCION.md` - Verificación paso a paso
