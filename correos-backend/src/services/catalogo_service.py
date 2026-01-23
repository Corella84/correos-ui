"""
Servicio para catálogo geográfico.
Carga 100% desde JSON estático (NO SOAP).
"""
import json
import logging
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger(__name__)

# Cache global - se carga una sola vez al startup
CATALOGO_CACHE: Dict = {}


class CatalogoService:
    """Servicio de catálogo geográfico basado en JSON estático."""
    
    def __init__(self):
        """Inicializa el servicio con la ruta al archivo JSON."""
        self.data_path = Path(__file__).parent.parent / "data" / "catalogo_geografico.json"
    
    def cargar_catalogo(self) -> None:
        """
        Carga el catálogo desde JSON una sola vez al iniciar.
        NO llama SOAP - lee archivo estático.
        """
        global CATALOGO_CACHE
        
        if CATALOGO_CACHE:
            logger.info("✅ Catálogo ya cargado en memoria")
            return
        
        try:
            logger.info(f"📦 Cargando catálogo desde {self.data_path}")
            
            if not self.data_path.exists():
                raise FileNotFoundError(f"No se encontró el archivo: {self.data_path}")
            
            with open(self.data_path, 'r', encoding='utf-8') as f:
                CATALOGO_CACHE = json.load(f)
            
            # Contar items para logging
            num_prov = len(CATALOGO_CACHE.get("provincias", []))
            num_cant = sum(len(v) for v in CATALOGO_CACHE.get("cantones", {}).values())
            num_dist = sum(
                len(dists)
                for dists in CATALOGO_CACHE.get("distritos", {}).values()
            )
            
            logger.info(f"✅ Catálogo cargado exitosamente:")
            logger.info(f"   - {num_prov} provincias")
            logger.info(f"   - {num_cant} cantones")
            logger.info(f"   - {num_dist} distritos")
            
        except FileNotFoundError as e:
            logger.error(f"❌ Archivo de catálogo no encontrado: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Error cargando catálogo: {e}", exc_info=True)
            raise
    
    def get_provincias(self) -> List[Dict[str, str]]:
        """
        Obtiene todas las provincias desde el cache.
        
        Returns:
            Lista de provincias: [{"codigo": "1", "nombre": "San José"}, ...]
        """
        if not CATALOGO_CACHE:
            raise Exception("Catálogo no cargado. El servidor debe iniciarse correctamente.")
        
        return CATALOGO_CACHE.get("provincias", [])
    
    def get_cantones(self, codigo_provincia: str) -> List[Dict[str, str]]:
        """
        Obtiene cantones de una provincia desde el cache.
        
        Args:
            codigo_provincia: Código de la provincia (ej: "1")
            
        Returns:
            Lista de cantones: [{"codigo": "01", "nombre": "San José"}, ...]
        """
        if not CATALOGO_CACHE:
            raise Exception("Catálogo no cargado. El servidor debe iniciarse correctamente.")
        
        return CATALOGO_CACHE.get("cantones", {}).get(codigo_provincia, [])
    
    def get_distritos(self, codigo_provincia: str, codigo_canton: str) -> List[Dict[str, str]]:
        """
        Obtiene distritos de un cantón desde el cache.
        
        Args:
            codigo_provincia: Código de la provincia (ej: "1")
            codigo_canton: Código del cantón (ej: "01")
            
        Returns:
            Lista de distritos: [{"codigo": "01", "nombre": "Carmen", "codigoPostal": "10101"}, ...]
        """
        if not CATALOGO_CACHE:
            raise Exception("Catálogo no cargado. El servidor debe iniciarse correctamente.")
        
        # Usar key compuesta "provincia-canton"
        key = f"{codigo_provincia}-{codigo_canton}"
        return CATALOGO_CACHE.get("distritos", {}).get(key, [])


# Instancia global del servicio
catalogo_service = CatalogoService()
