#!/usr/bin/env python3
"""
Script para descargar el catálogo geográfico completo de Costa Rica
desde la API pública https://api-geo-cr.vercel.app
"""
import json
import urllib.request
import urllib.error
import sys

BASE_URL = "https://api-geo-cr.vercel.app"

def fetch_json(url):
    """Fetch JSON from URL"""
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def main():
    print("=" * 60)
    print("DESCARGANDO CATÁLOGO GEOGRÁFICO COMPLETO DE COSTA RICA")
    print("Fuente: api-geo-cr.vercel.app")
    print("=" * 60)
    
    catalogo = {
        "provincias": [],
        "cantones": {},
        "distritos": {}
    }
    
    # 1. Fetch provincias
    print("\n[1/3] Descargando provincias...")
    resp = fetch_json(f"{BASE_URL}/provincias")
    if not resp or resp.get("status") != "success":
        print("ERROR: No se pudieron obtener las provincias")
        sys.exit(1)
    
    provincias_raw = resp.get("data", [])
    for p in provincias_raw:
        catalogo["provincias"].append({
            "codigo": str(p["idProvincia"]),
            "nombre": p["descripcion"]
        })
    print(f"   ✅ {len(catalogo['provincias'])} provincias")
    
    # 2. Fetch cantones por provincia
    print("\n[2/3] Descargando cantones por provincia...")
    total_cantones = 0
    for prov in catalogo["provincias"]:
        prov_id = prov["codigo"]
        resp = fetch_json(f"{BASE_URL}/provincias/{prov_id}/cantones")
        if not resp or resp.get("status") != "success":
            print(f"   ⚠️  No se pudieron obtener cantones para provincia {prov_id}")
            catalogo["cantones"][prov_id] = []
            continue
        
        cantones_raw = resp.get("data", [])
        catalogo["cantones"][prov_id] = []
        for c in cantones_raw:
            catalogo["cantones"][prov_id].append({
                "codigo": str(c["idCanton"]).zfill(2),
                "nombre": c["descripcion"]
            })
        total_cantones += len(catalogo["cantones"][prov_id])
        print(f"   Provincia {prov_id}: {len(catalogo['cantones'][prov_id])} cantones")
    print(f"   ✅ {total_cantones} cantones en total")
    
    # 3. Fetch distritos por cantón
    print("\n[3/3] Descargando distritos por cantón...")
    total_distritos = 0
    for prov_id, cantones in catalogo["cantones"].items():
        for canton in cantones:
            canton_id = canton["codigo"]
            # API usa el ID numérico, no con ceros
            canton_id_num = str(int(canton_id))
            
            resp = fetch_json(f"{BASE_URL}/cantones/{canton_id_num}/distritos")
            if not resp or resp.get("status") != "success":
                print(f"   ⚠️  No se pudieron obtener distritos para {prov_id}-{canton_id}")
                key = f"{prov_id}-{canton_id}"
                catalogo["distritos"][key] = []
                continue
            
            distritos_raw = resp.get("data", [])
            key = f"{prov_id}-{canton_id}"
            catalogo["distritos"][key] = []
            for d in distritos_raw:
                # Generar código postal: PCCDD
                distrito_num = str(d.get("idDistrito", 1)).zfill(2)
                codigo_postal = f"{prov_id}{canton_id}{distrito_num}"
                
                catalogo["distritos"][key].append({
                    "codigo": distrito_num,
                    "nombre": d["descripcion"],
                    "codigoPostal": codigo_postal
                })
            total_distritos += len(catalogo["distritos"][key])
    
    print(f"   ✅ {total_distritos} distritos en total")
    
    # 4. Guardar JSON
    output_path = "src/data/catalogo_geografico.json"
    print(f"\n[4/4] Guardando en {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(catalogo, f, ensure_ascii=False, indent=2)
    
    print("\n" + "=" * 60)
    print("CATÁLOGO COMPLETO DESCARGADO")
    print("=" * 60)
    print(f"Provincias: {len(catalogo['provincias'])}")
    print(f"Cantones:   {total_cantones}")
    print(f"Distritos:  {total_distritos}")
    print("=" * 60)

if __name__ == "__main__":
    main()
