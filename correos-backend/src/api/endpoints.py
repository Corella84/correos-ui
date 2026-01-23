"""
Endpoints FastAPI para la integración con Correos de Costa Rica.
"""
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from src.models.envio import SolicitudGuia, RespuestaGuia
from src.services.guia_service import guia_service
from src.services.envio_service import envio_service
from src.services.catalogo_service import catalogo_service

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear aplicación FastAPI
app = FastAPI(
    title="Integración Correos de Costa Rica",
    description="API para generar guías de envío",
    version="1.0.0"
)


# ============================================================================
# EVENTO DE STARTUP - CARGAR CATÁLOGO EN MEMORIA
# ============================================================================
@app.on_event("startup")
async def startup_event():
    """
    Carga el catálogo geográfico completo al iniciar el servidor.
    Esto se ejecuta UNA SOLA VEZ al arrancar.
    """
    logger.info("=" * 60)
    logger.info("CARGANDO CATÁLOGO DESDE JSON (NO SOAP)")
    logger.info("=" * 60)
    
    try:
        catalogo_service.cargar_catalogo()
        logger.info("=" * 60)
        logger.info("CATÁLOGO CARGADO EXITOSAMENTE")
        logger.info("=" * 60)
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"ERROR CRÍTICO AL CARGAR CATÁLOGO: {e}")
        logger.error("El servidor continuará pero el catálogo no estará disponible")
        logger.error("=" * 60)


# ============================================================================
# MODELOS PYDANTIC PARA EL ENDPOINT DE CATÁLOGO
# ============================================================================
class CatalogoRequest(BaseModel):
    tipo: str  # "provincias", "cantones", "distritos"
    provincia_codigo: Optional[str] = None
    canton_codigo: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================
@app.get("/")
async def root():
    """Endpoint de salud"""
    return {
        "status": "ok",
        "service": "Integración Correos de Costa Rica",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Endpoint de salud detallado"""
    return {
        "status": "healthy",
        "service": "Integración Correos de Costa Rica"
    }


@app.post("/catalogo_geografico")
async def catalogo_geografico(request: CatalogoRequest):
    """
    Endpoint para consultar el catálogo geográfico.
    Lee SOLO del cache en memoria, NUNCA llama al SOAP.
    
    Parámetros:
    - tipo: "provincias", "cantones", "distritos"
    - provincia_codigo: requerido para cantones y distritos
    - canton_codigo: requerido para distritos
    
    Returns:
    {
        "success": true,
        "data": [...],
        "fuente": "CACHE"
    }
    """
    try:
        logger.info(f"📦 Consulta catálogo: tipo={request.tipo}, prov={request.provincia_codigo}, cant={request.canton_codigo}")
        
        if request.tipo == "provincias":
            data = catalogo_service.get_provincias()
            logger.info(f"✅ Devolviendo {len(data)} provincias desde CACHE")
            
        elif request.tipo == "cantones":
            if not request.provincia_codigo:
                raise HTTPException(
                    status_code=400,
                    detail="provincia_codigo es requerido para tipo=cantones"
                )
            data = catalogo_service.get_cantones(request.provincia_codigo)
            logger.info(f"✅ Devolviendo {len(data)} cantones (prov={request.provincia_codigo}) desde CACHE")
            
        elif request.tipo == "distritos":
            if not request.provincia_codigo or not request.canton_codigo:
                raise HTTPException(
                    status_code=400,
                    detail="provincia_codigo y canton_codigo son requeridos para tipo=distritos"
                )
            data = catalogo_service.get_distritos(
                request.provincia_codigo,
                request.canton_codigo
            )
            logger.info(f"✅ Devolviendo {len(data)} distritos (prov={request.provincia_codigo}, cant={request.canton_codigo}) desde CACHE")
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo inválido: {request.tipo}. Debe ser: provincias, cantones, distritos"
            )
        
        return {
            "success": True,
            "data": data,
            "fuente": "CACHE"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en catalogo_geografico: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": str(e),
                "fuente": "CACHE"
            }
        )


@app.post("/generar_guia", response_model=RespuestaGuia)
async def generar_guia(solicitud: SolicitudGuia) -> RespuestaGuia:
    """
    Genera una guía de envío completa.
    
    Este endpoint:
    1. Genera el número de guía (CCRGENERARGUIA)
    2. Registra el envío (CCRREGISTROENVIO)
    3. Retorna el PDF de la guía en Base64
    
    Args:
        solicitud: Datos del envío (remitente, destinatario, peso, etc.)
        
    Returns:
        RespuestaGuia con el número de envío y PDF en Base64
        
    Raises:
        HTTPException: Si hay error en el proceso
    """
    try:
        logger.info("Iniciando proceso de generación de guía")
        
        # Paso 1: Generar número de guía
        logger.info("Paso 1: Generando número de guía...")
        resultado_guia = guia_service.generar_numero_guia()
        numero_envio = resultado_guia['numero_envio']
        
        logger.info(f"Número de guía generado: {numero_envio}")
        
        # Paso 2: Registrar envío con los datos completos
        logger.info("Paso 2: Registrando envío...")
        resultado_envio = envio_service.registrar_envio(
            numero_guia=numero_envio,
            solicitud=solicitud
        )
        
        # Construir respuesta exitosa
        respuesta = RespuestaGuia(
            exito=True,
            numero_envio=numero_envio,
            codigo_respuesta=resultado_envio['codigo_respuesta'],
            mensaje_respuesta=resultado_envio['mensaje_respuesta'],
            pdf_base64=resultado_envio['pdf_base64']
        )
        
        logger.info(f"Guía generada exitosamente: {numero_envio}")
        
        return respuesta
        
    except Exception as e:
        logger.error(f"Error al generar guía: {e}", exc_info=True)
        
        # Construir respuesta de error
        respuesta = RespuestaGuia(
            exito=False,
            error=str(e)
        )
        
        # Retornar con código 500 si es error del servidor
        # o 400 si es error de validación
        status_code = 500
        if "validación" in str(e).lower() or "validation" in str(e).lower():
            status_code = 400
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "exito": False,
                "error": str(e),
                "numero_envio": None,
                "pdf_base64": None
            }
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Manejador global de excepciones"""
    logger.error(f"Excepción no manejada: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "exito": False,
            "error": "Error interno del servidor",
            "detalle": str(exc)
        }
    )
