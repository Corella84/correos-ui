# 🚀 Guía Rápida: Activar en Vercel (2 minutos)

## Tu App Está Lista - Solo Falta Esto

Todo el código está funcionando. El backend está activo en Render.
**Solo necesitas configurar una variable en Vercel.**

---

## 📝 Pasos (Copia/Pega)

### 1️⃣ Abrir Vercel Dashboard
```
https://vercel.com/dashboard
```

### 2️⃣ Seleccionar tu proyecto
- Busca "correos-ui" o el nombre de tu proyecto
- Click para abrirlo

### 3️⃣ Ir a Settings
- Click en **Settings** (menú superior)
- Luego **Environment Variables** (menú lateral izquierdo)

### 4️⃣ Agregar Variable
Click en **"Add New"** y copia esto exactamente:

```
Name:  VITE_BACKEND_URL
Value: https://correos-backend.onrender.com
```

⚠️ **IMPORTANTE**:
- NO agregues `/` al final
- Marca las 3 opciones: Production, Preview, Development

### 5️⃣ Guardar
Click en **Save**

### 6️⃣ Redesplegar
**Opción A** - Desde Vercel:
1. Ve a tab **Deployments**
2. Click en **⋮** (tres puntos) del último deployment
3. Click **Redeploy**
4. Confirma

**Opción B** - Desde tu terminal:
```bash
git commit --allow-empty -m "trigger: deploy con backend configurado"
git push origin main
```

---

## ✅ Verificar que Funciona

Espera 2-3 minutos a que redespliegue, luego:

### 1. Abre tu app en Vercel
```
https://tu-app.vercel.app
```

### 2. Abre la consola del navegador
- Presiona **F12** (Windows) o **Cmd+Option+I** (Mac)
- Ve a la pestaña **Console**

### 3. Ve a una orden
- Click en "Ver órdenes"
- Click en cualquier orden para revisar

### 4. Busca este mensaje en la consola
```
✅ Provincias obtenidas (CACHE): 7
```

Si ves eso, **¡FUNCIONA!** ✅

### 5. Prueba el flujo completo
1. Selecciona una **provincia** → Verás cantones
2. Selecciona un **cantón** → Verás distritos
3. Selecciona un **distrito** → Código postal se auto-completa

---

## ❌ Si Algo Falla

### Error: "CORS policy"
```
Access to fetch... has been blocked by CORS
```
**Solución**: Espera 2-3 minutos más. El backend se está activando.

### Error: Timeout o muy lento
```
❌ Error obteniendo provincias, usando fallback local
```
**Causa**: Backend en free tier "despertando" (primera vez tarda ~30 segundos)
**Solución**: Refresca la página y vuelve a intentar.

### Solo carga "fallback local"
**Verifica**:
1. La variable `VITE_BACKEND_URL` está en Vercel
2. El valor es exactamente: `https://correos-backend.onrender.com`
3. Redesplegar después de agregar la variable

---

## 🎯 Checklist Final

- [ ] Variable `VITE_BACKEND_URL` agregada en Vercel
- [ ] Marcadas las 3 opciones (Production, Preview, Development)
- [ ] Redesplegar el frontend
- [ ] Esperar 2-3 minutos
- [ ] Abrir app y verificar consola del navegador
- [ ] Ver mensaje "✅ Provincias obtenidas (CACHE): 7"
- [ ] Probar flujo: provincia → cantón → distrito

---

## 📞 ¿Más Ayuda?

Si necesitas troubleshooting detallado, lee:
- `SOLUCION_VERCEL.md` - Solución a problemas comunes
- `CHECKLIST_PRODUCCION.md` - Verificación completa paso a paso
- `ESTADO_ACTUAL.md` - Estado completo del proyecto

---

## 🔗 URLs de Referencia

| Componente | URL | Estado |
|------------|-----|--------|
| Backend (Render) | https://correos-backend.onrender.com | ✅ Activo |
| Health Check | https://correos-backend.onrender.com/health | ✅ OK |
| Frontend (Vercel) | Tu URL de Vercel | ⏳ Necesita variable |

---

**¡Eso es todo! Configura esa variable en Vercel y tu app estará lista para producción.** 🎉
