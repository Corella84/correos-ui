# Verificación de VITE_BACKEND_URL y Lógica de Fallback

## 🔍 Hallazgos

### ✅ Archivos que SÍ usan VITE_BACKEND_URL correctamente:

1. **`app/services/orders.api.ts`**
   - ✅ Usa `VITE_BACKEND_URL` correctamente
   - ✅ Fallback a `http://localhost:8000` si no está configurado
   - ✅ Funciona tanto en cliente como servidor

```typescript
const BACKEND_URL = typeof window !== 'undefined'
    ? (import.meta.env?.VITE_BACKEND_URL || "http://localhost:8000")
    : (process.env.VITE_BACKEND_URL || "http://localhost:8000");
```

### ❌ Archivos que NO usan VITE_BACKEND_URL (hardcoded localhost):

1. **`app/routes/api.catalogo.tsx`** ⚠️ **CRÍTICO**
   - ❌ Hardcoded: `const PYTHON_BACKEND_URL = "http://localhost:8000";`
   - ❌ Nunca usa `VITE_BACKEND_URL`
   - ❌ En producción siempre intentará llamar a localhost (fallará)
   - **Impacto**: El catálogo geográfico nunca funcionará en producción

2. **`app/routes/orders.$id.confirm.tsx`** ⚠️ **CRÍTICO**
   - ❌ Hardcoded: `fetch("http://localhost:8000/generar_guia", ...)`
   - ❌ Nunca usa `VITE_BACKEND_URL`
   - ❌ En producción siempre intentará llamar a localhost (fallará)
   - **Impacto**: La generación de guías nunca funcionará en producción

## 📊 Flujo Actual del Catálogo Geográfico

```
Frontend (correos.api.ts)
  ↓
Llama a: /api/catalogo (endpoint Remix)
  ↓
api.catalogo.tsx (hardcoded localhost:8000)
  ↓
Backend Python (localhost:8000 o producción)
```

**Problema**: `api.catalogo.tsx` siempre llama a `localhost:8000`, incluso en producción.

## 📊 Flujo Actual de Generación de Guía

```
Frontend (orders.$id.confirm.tsx)
  ↓
Llama directamente a: http://localhost:8000/generar_guia
  ↓
Backend Python (localhost:8000 o producción)
```

**Problema**: Siempre llama a `localhost:8000`, incluso en producción.

## ✅ Lógica de Fallback (CORRECTA)

La lógica de fallback en `app/services/correos.api.ts` está **correcta**:

- ✅ Solo cae en fallback si hay **error** (catch)
- ✅ Si el backend responde **200 OK**, usa los datos del backend
- ✅ Si el backend responde **200 OK pero `success: false`**, lanza error y cae en fallback (correcto)
- ✅ Si hay timeout (8s), cae en fallback (correcto)
- ✅ Si hay error de red, cae en fallback (correcto)

**NO hay problema con la lógica de fallback**. El problema es que los endpoints nunca llegan al backend de producción porque están hardcoded a localhost.

## 🔧 Cambios Requeridos

### 1. `app/routes/api.catalogo.tsx`

**ANTES:**
```typescript
const PYTHON_BACKEND_URL = "http://localhost:8000";
```

**DESPUÉS:**
```typescript
const PYTHON_BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8000";
```

**Razón**: Este archivo corre en el servidor de Remix, por lo que usa `process.env`, no `import.meta.env`.

### 2. `app/routes/orders.$id.confirm.tsx`

**ANTES:**
```typescript
const response = await fetch("http://localhost:8000/generar_guia", {
```

**DESPUÉS:**
```typescript
const BACKEND_URL = typeof window !== 'undefined'
    ? (import.meta.env?.VITE_BACKEND_URL || "http://localhost:8000")
    : (process.env.VITE_BACKEND_URL || "http://localhost:8000");

const response = await fetch(`${BACKEND_URL}/generar_guia`, {
```

**Razón**: Este componente corre en el cliente, pero debe usar la misma lógica que `orders.api.ts`.

## ✅ Verificación de VITE_BACKEND_URL en Vercel

Para verificar que `VITE_BACKEND_URL` está configurada en Vercel:

1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Busca `VITE_BACKEND_URL`
3. Debe estar configurada para:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. El valor debe ser: `https://[TU-BACKEND].onrender.com` (sin trailing slash)

## 🧪 Cómo Verificar que NO Cae en Fallback cuando Backend Responde 200

### Test Manual:

1. Abre la consola del navegador en producción
2. Ve a `/orders/:id/review`
3. Busca estos logs:
   ```
   📍 Solicitando provincias al servidor...
   ✅ Provincias obtenidas (CACHE): 7
   ```
4. Si ves `✅ Provincias obtenidas (CACHE): 7`, el backend está funcionando
5. Si ves `❌ Error obteniendo provincias, usando fallback local`, entonces está cayendo en fallback

### Test con Network Tab:

1. Abre DevTools → Network
2. Filtra por "catalogo"
3. Debe haber una request a `/api/catalogo`
4. Revisa la respuesta:
   - Si es 200 OK con `success: true` → Backend funcionando ✅
   - Si es 500 o error → Cae en fallback ❌

## 📝 Resumen

- ✅ La lógica de fallback está correcta (solo cae en error)
- ❌ `api.catalogo.tsx` NO usa VITE_BACKEND_URL (hardcoded localhost)
- ❌ `orders.$id.confirm.tsx` NO usa VITE_BACKEND_URL (hardcoded localhost)
- ✅ `orders.api.ts` SÍ usa VITE_BACKEND_URL correctamente

**Conclusión**: Aunque `VITE_BACKEND_URL` esté configurada en Vercel, el catálogo geográfico y la generación de guías NO funcionarán en producción porque los endpoints están hardcoded a localhost.
