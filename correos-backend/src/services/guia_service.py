"""
Servicio para generar número de guía usando CCRGENERARGUIA.
"""
import logging
from typing import Dict, Any
from src.services.soap_client import soap_client

logger = logging.getLogger(__name__)


class GuiaService:
    """Servicio para generar guías de envío"""
    
    @staticmethod
    def generar_numero_guia() -> Dict[str, Any]:
        """
        Genera un número de guía usando el método CCRGENERARGUIA.
        
        Returns:
            Diccionario con:
                - numero_envio: Número de guía generado
                - codigo_respuesta: Código de respuesta (00 = éxito)
                - mensaje_respuesta: Mensaje de respuesta
                
        Raises:
            Exception: Si falla la generación
        """
        try:
            logger.info("Generando número de guía con CCRGENERARGUIA...")
            
            # Llamar al método SOAP
            # Nota: Según la documentación, este método puede no requerir parámetros
            # o requerir solo el token en los headers
            result = soap_client.call_method("ccrGenerarGuia")
            
            # Procesar respuesta
            # El formato exacto depende de la estructura SOAP real
            # Ajustar según la respuesta real del servicio
            
            if hasattr(result, 'CodRespuesta'):
                codigo = result.CodRespuesta
                mensaje = getattr(result, 'MensajeRespuesta', '')
                numero_envio = getattr(result, 'NumeroEnvio', None)
            elif isinstance(result, dict):
                codigo = result.get('CodRespuesta')
                mensaje = result.get('MensajeRespuesta', '')
                numero_envio = result.get('NumeroEnvio')
            else:
                # Si la respuesta es directamente el número o estructura diferente
                codigo = '00'
                mensaje = 'Consulta exitosa'
                numero_envio = str(result) if result else None
            
            # Validar código de respuesta
            if codigo != '00':
                error_msg = f"Error al generar guía. Código: {codigo}, Mensaje: {mensaje}"
                logger.error(error_msg)
                
                if codigo == '20':
                    raise Exception("Token no válido. Intente nuevamente.")
                elif codigo == '15':
                    raise Exception("Error interno del servicio de Correos.")
                elif codigo == '17':
                    raise Exception(f"Error de validación: {mensaje}")
                else:
                    raise Exception(f"Error desconocido: {mensaje}")
            
            if not numero_envio:
                raise Exception("No se recibió número de envío en la respuesta")
            
            logger.info(f"Número de guía generado exitosamente: {numero_envio}")
            
            return {
                'numero_envio': numero_envio,
                'codigo_respuesta': codigo,
                'mensaje_respuesta': mensaje
            }
            
        except Exception as e:
            logger.error(f"Error al generar número de guía: {e}")
            raise


# Instancia global del servicio
guia_service = GuiaService()
