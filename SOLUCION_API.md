# Solución para Integración de API de Correos

## 🐛 Problema Detectado

El error `TypeError: __vite_ssr_import_0__.jsxDEV is not a function` indica un problema con las dependencias de node_modules.

## ✅ Solución

### Paso 1: Reinstalar dependencias
```bash
cd /Users/juandiegocorellavega/Desktop/correos-ui
rm -rf node_modules package-lock.json
npm install
```

### Paso 2: Modificar el servicio API para que funcione solo en el cliente

El problema con la implementación actual es que `fetch` se ejecuta durante SSR (Server-Side Rendering) donde puede no estar disponible correctamente.

Necesitamos modificar `correos.api.ts` para:
1. Detectar si estamos en el cliente o servidor
2. Solo ejecutar llamadas en el cliente
3. Usar fallback en el servidor

### Paso 3: Usar `typeof window !== 'undefined'` para detectar cliente

```typescript
// En los useEffect, agregar verificación:
useEffect(() => {
  if (typeof window === 'undefined') return; // Solo ejecutar en cliente
  
  async function loadProvincias() {
    // ... código de carga
  }
  loadProvincias();
}, []);
```

## 📋 Próximos Pasos

1. Terminar de reinstalar node_modules
2. Descomentar los useEffect en orders.$id.review.tsx
3. Agregar verificación `typeof window !== 'undefined'`
4. Probar nuevamente
