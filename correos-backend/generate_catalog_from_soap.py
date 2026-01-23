#!/usr/bin/env python3
"""
Script para descargar el catálogo geográfico completo de Correos de Costa Rica via SOAP.
Ejecutar UNA SOLA VEZ en local para generar el JSON.

Estructura de respuesta SOAP:
- ccrCodProvincia → Provincias.ccrItemGeografico[].Codigo/Descripcion
- ccrCodCanton → Cantones.ccrItemGeografico[].Codigo/Descripcion
- ccrCodDistrito → Distritos.ccrItemGeografico[].Codigo/Descripcion

Uso:
    python generate_catalog_from_soap.py

Requisitos:
    - Variables de entorno configuradas (.env o export)
    - Credenciales válidas de Correos
    - Conexión a internet
"""
import json
import sys
import os
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.soap_client import soap_client
from zeep.helpers import serialize_object

def main():
    print("=" * 60)
    print("DESCARGANDO CATÁLOGO GEOGRÁFICO DE CORREOS VIA SOAP")
    print("Esto se ejecuta UNA SOLA VEZ para generar el JSON")
    print("=" * 60)
    
    catalogo = {
        "provincias": [],
        "cantones": {},
        "distritos": {}
    }
    
    # Verificar que el archivo de salida existe o puede crearse
    output_path = Path("src/data/catalogo_geografico.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"\n📁 Archivo de salida: {output_path.absolute()}")
    print(f"🔐 Usando credenciales de Correos configuradas en .env\n")
    
    # 1. Obtener provincias
    print("\n[1/3] Obteniendo provincias (ccrCodProvincia)...")
    try:
        result = soap_client.call_method("ccrCodProvincia")
        data = serialize_object(result)
        
        # Verificar respuesta SOAP
        cod_respuesta = data.get('CodRespuesta')
        if cod_respuesta != '00':
            mensaje = data.get('MensajeRespuesta', 'Error desconocido')
            print(f"   ❌ Error SOAP: Código {cod_respuesta} - {mensaje}")
            sys.exit(1)
        
        # Extraer provincias
        provincias_data = data.get('Provincias', {})
        items = provincias_data.get('ccrItemGeografico', [])
        
        # Normalizar: puede venir como lista o objeto único
        if not isinstance(items, list):
            items = [items] if items else []
        
        # Procesar cada provincia
        for item in items:
            codigo = str(item.get('Codigo', '')).strip()
            nombre = str(item.get('Descripcion', '')).strip().upper()
            
            if codigo and nombre:
                catalogo["provincias"].append({
                    "codigo": codigo,
                    "nombre": nombre
                })
        
        if not catalogo["provincias"]:
            print("   ❌ No se obtuvieron provincias. Abortando.")
            sys.exit(1)
        
        print(f"   ✅ {len(catalogo['provincias'])} provincias obtenidas")
        for p in catalogo["provincias"]:
            print(f"      {p['codigo']}: {p['nombre']}")
            
    except Exception as e:
        print(f"   ❌ Error obteniendo provincias: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # 2. Obtener cantones por provincia
    print("\n[2/3] Obteniendo cantones (ccrCodCanton)...")
    total_cantones = 0
    for idx, prov in enumerate(catalogo["provincias"], 1):
        prov_id = prov["codigo"]
        prov_nombre = prov["nombre"]
        
        try:
            # Pequeño delay para evitar rate limiting
            if idx > 1:
                time.sleep(0.5)
            
            result = soap_client.call_method("ccrCodCanton", prov_id)
            data = serialize_object(result)
            
            catalogo["cantones"][prov_id] = []
            
            cod_respuesta = data.get('CodRespuesta')
            if cod_respuesta == '00':
                cantones_data = data.get('Cantones', {})
                items = cantones_data.get('ccrItemGeografico', [])
                
                # Normalizar: puede venir como lista o objeto único
                if not isinstance(items, list):
                    items = [items] if items else []
                
                # Procesar cada cantón
                for item in items:
                    codigo = str(item.get('Codigo', '')).strip()
                    nombre = str(item.get('Descripcion', '')).strip().upper()
                    
                    if codigo and nombre:
                        # Asegurar padding de 2 dígitos
                        codigo_padded = codigo.zfill(2)
                        catalogo["cantones"][prov_id].append({
                            "codigo": codigo_padded,
                            "nombre": nombre
                        })
            else:
                mensaje = data.get('MensajeRespuesta', 'Error desconocido')
                print(f"   ⚠️ Provincia {prov_id}: Error SOAP {cod_respuesta} - {mensaje}")
            
            total_cantones += len(catalogo["cantones"][prov_id])
            print(f"   [{idx}/{len(catalogo['provincias'])}] {prov_nombre}: {len(catalogo['cantones'][prov_id])} cantones")
            
        except Exception as e:
            print(f"   ⚠️ Error en provincia {prov_id} ({prov_nombre}): {e}")
            catalogo["cantones"][prov_id] = []
    
    print(f"\n   ✅ {total_cantones} cantones en total")
    
    # 3. Obtener distritos por cantón
    print("\n[3/3] Obteniendo distritos (ccrCodDistrito)...")
    total_distritos = 0
    total_combinations = sum(len(cantones) for cantones in catalogo["cantones"].values())
    current = 0
    
    for prov_id, cantones in catalogo["cantones"].items():
        prov_nombre = next((p["nombre"] for p in catalogo["provincias"] if p["codigo"] == prov_id), prov_id)
        
        for canton in cantones:
            canton_id = canton["codigo"]
            canton_nombre = canton["nombre"]
            key = f"{prov_id}-{canton_id}"
            current += 1
            
            try:
                # Pequeño delay para evitar rate limiting
                if current > 1:
                    time.sleep(0.3)
                
                # Provincia sin padding (1,2..), cantón CON padding (01,02..)
                result = soap_client.call_method("ccrCodDistrito", prov_id, canton_id)
                data = serialize_object(result)
                
                catalogo["distritos"][key] = []
                
                cod_respuesta = data.get('CodRespuesta')
                if cod_respuesta == '00':
                    distritos_data = data.get('Distritos', {})
                    items = distritos_data.get('ccrItemGeografico', [])
                    
                    # Normalizar: puede venir como lista o objeto único
                    if not isinstance(items, list):
                        items = [items] if items else []
                    
                    # Procesar cada distrito
                    for item in items:
                        codigo = str(item.get('Codigo', '')).strip()
                        nombre = str(item.get('Descripcion', '')).strip().upper()
                        
                        if codigo and nombre:
                            # Asegurar padding de 2 dígitos
                            distrito_codigo = codigo.zfill(2)
                            
                            catalogo["distritos"][key].append({
                                "codigo": distrito_codigo,
                                "nombre": nombre
                            })
                else:
                    mensaje = data.get('MensajeRespuesta', 'Error desconocido')
                    print(f"   ⚠️ {key}: Error SOAP {cod_respuesta} - {mensaje}")
                
                num_distritos = len(catalogo["distritos"][key])
                total_distritos += num_distritos
                
                # Mostrar progreso cada 10 combinaciones o al final
                if current % 10 == 0 or current == total_combinations:
                    print(f"   [{current}/{total_combinations}] {prov_nombre} > {canton_nombre}: {num_distritos} distritos")
                    
            except Exception as e:
                print(f"   ⚠️ Error en {key} ({prov_nombre} > {canton_nombre}): {e}")
                catalogo["distritos"][key] = []
    
    print(f"\n   ✅ {total_distritos} distritos en total")
    
    # 4. Validar y guardar JSON
    print(f"\n[4/4] Validando datos antes de guardar...")
    
    # Validaciones estrictas - si no se cumplen, ERROR y no guardar
    errores_validacion = []
    
    if len(catalogo['provincias']) != 7:
        error_msg = f"ERROR: Se esperaban 7 provincias, se obtuvieron {len(catalogo['provincias'])}"
        print(f"   ❌ {error_msg}")
        errores_validacion.append(error_msg)
    
    if total_cantones < 80:
        error_msg = f"ERROR: Se esperaban al menos 80 cantones, se obtuvieron {total_cantones}"
        print(f"   ❌ {error_msg}")
        errores_validacion.append(error_msg)
    
    if total_distritos < 480:
        error_msg = f"ERROR: Se esperaban al menos 480 distritos, se obtuvieron {total_distritos}"
        print(f"   ❌ {error_msg}")
        errores_validacion.append(error_msg)
    
    # Si hay errores de validación, NO guardar y salir
    if errores_validacion:
        print("\n" + "=" * 60)
        print("❌ VALIDACIÓN FALLIDA - NO SE GUARDARÁ EL ARCHIVO")
        print("=" * 60)
        for error in errores_validacion:
            print(f"   • {error}")
        print("=" * 60)
        print("\n⚠️  Corrija los errores y ejecute el script nuevamente.")
        sys.exit(1)
    
    # Si pasa las validaciones, guardar JSON
    print(f"\n[5/5] Guardando en {output_path}...")
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(catalogo, f, ensure_ascii=False, indent=2)
        
        # Verificar tamaño del archivo
        file_size = output_path.stat().st_size
        print(f"   ✅ Archivo guardado: {file_size:,} bytes ({file_size/1024:.1f} KB)")
        
    except Exception as e:
        print(f"   ❌ Error guardando archivo: {e}")
        sys.exit(1)
    
    # Resumen final
    print("\n" + "=" * 60)
    print("✅ CATÁLOGO OFICIAL DE CORREOS DESCARGADO EXITOSAMENTE")
    print("=" * 60)
    print(f"📊 Estadísticas:")
    print(f"   • Provincias: {len(catalogo['provincias'])}")
    print(f"   • Cantones:   {total_cantones}")
    print(f"   • Distritos:  {total_distritos}")
    print(f"   • Archivo:    {output_path.absolute()}")
    print("=" * 60)
    print("\n✅ El catálogo está listo para producción.")
    print("✅ Puede hacer deploy. El JSON no cambiará hasta ejecutar este script nuevamente.")
    print("\n💡 Para regenerar el catálogo, ejecute este script nuevamente.")

if __name__ == "__main__":
    main()
