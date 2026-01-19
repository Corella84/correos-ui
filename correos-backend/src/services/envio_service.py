"""
Servicio para registrar envío usando CCRREGISTROENVIO.
"""
import logging
import base64
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple
from src.config import config
from src.services.soap_client import soap_client
from src.models.envio import SolicitudGuia

logger = logging.getLogger(__name__)


class EnvioService:
    """Servicio para registrar envíos"""

    @staticmethod
    def _parse_codigo_postal_cr(codigo: str) -> Optional[Tuple[str, str, str]]:
        """
        Costa Rica usa códigos postales de 5 dígitos:
        - Provincia: 1 dígito
        - Cantón: 2 dígitos
        - Distrito: 2 dígitos
        Ej: 10101 => prov=1, canton=01, distrito=01
        """
        if not codigo:
            return None
        raw = str(codigo).strip()
        # Tomar solo los primeros 5 caracteres numéricos si viene más largo
        digits = "".join(ch for ch in raw if ch.isdigit())
        if len(digits) < 5:
            return None
        digits = digits[:5]
        return digits[0], digits[1:3], digits[3:5]

    @staticmethod
    def _consultar_tarifa(solicitud: SolicitudGuia) -> Optional[Dict[str, Any]]:
        """
        Consulta la tarifa oficial con el método ccrTarifa.
        Devuelve None si no se puede calcular (p.ej. código postal inválido).
        """
        origen = EnvioService._parse_codigo_postal_cr(solicitud.remitente.codigo_postal)
        destino = EnvioService._parse_codigo_postal_cr(
            solicitud.destinatario.codigo_postal_zip or solicitud.destinatario.codigo_postal
        )
        if not origen or not destino:
            return None

        prov_o, canton_o, dist_o = origen
        prov_d, canton_d, dist_d = destino

        req_tarifa = {
            "ProvinciaOrigen": prov_o,
            "CantonOrigen": canton_o,
            "DistritoOrigen": dist_o,
            "ProvinciaDestino": prov_d,
            "CantonDestino": canton_d,
            "DistritoDestino": dist_d,
            "Peso": Decimal(str(solicitud.peso)),
            "Servicio": str(config.SERVICIO_ID),
        }

        res = soap_client.call_method("ccrTarifa", req_tarifa)

        # Parsear respuesta
        if hasattr(res, "CodRespuesta"):
            codigo = str(getattr(res, "CodRespuesta", "") or "")
            mensaje = str(getattr(res, "MensajeRespuesta", "") or "")
            monto_tarifa = getattr(res, "MontoTarifa", None)
            impuesto = getattr(res, "Impuesto", None)
            descuento = getattr(res, "Descuento", None)
        elif isinstance(res, dict):
            codigo = str(res.get("CodRespuesta") or "")
            mensaje = str(res.get("MensajeRespuesta", "") or "")
            monto_tarifa = res.get("MontoTarifa")
            impuesto = res.get("Impuesto")
            descuento = res.get("Descuento")
        else:
            return None

        if codigo != "00":
            logger.warning(f"ccrTarifa no retornó 00. Código: {codigo}, Mensaje: {mensaje}")
            return None

        # Normalizar a Decimal (Zeep normalmente ya entrega Decimal)
        def _to_decimal(v):
            if v is None:
                return Decimal("0")
            if isinstance(v, Decimal):
                return v
            return Decimal(str(v))

        monto_tarifa_d = _to_decimal(monto_tarifa)
        impuesto_d = _to_decimal(impuesto)
        descuento_d = _to_decimal(descuento)
        monto_total_d = monto_tarifa_d + impuesto_d - descuento_d

        return {
            "codigo_respuesta": codigo,
            "mensaje_respuesta": mensaje,
            "monto_tarifa": monto_tarifa_d,
            "impuesto": impuesto_d,
            "descuento": descuento_d,
            "monto_total": monto_total_d,
        }
    
    @staticmethod
    def registrar_envio(
        numero_guia: str,
        solicitud: SolicitudGuia
    ) -> Dict[str, Any]:
        """
        Registra un envío usando el método CCRREGISTROENVIO.
        
        Args:
            numero_guia: Número de guía generado previamente
            solicitud: Datos del envío
            
        Returns:
            Diccionario con:
                - codigo_respuesta: Código de respuesta
                - mensaje_respuesta: Mensaje de respuesta
                - pdf_base64: PDF de la guía en Base64
                
        Raises:
            Exception: Si falla el registro
        """
        try:
            logger.info(f"Registrando envío con número de guía: {numero_guia}")
            
            # FECHA_ENVIO según WSDL: xsd:dateTime
            # Zeep espera un datetime (no timestamp int).
            fecha_envio_dt = solicitud.fecha_envio
            if fecha_envio_dt is None:
                fecha_envio_dt = datetime.now()
            
            # Construir objeto ccrDatosEnvio según la estructura esperada
            datos_envio = {
                'COD_CLIENTE': config.COD_CLIENTE,
                'SERVICIO': str(config.SERVICIO_ID),
                'USUARIO_ID': config.USUARIO_ID,
                'FECHA_ENVIO': fecha_envio_dt,
                'ENVIO_ID': numero_guia,
                'MONTO_FLETE': float(solicitud.monto_flete),
                'PESO': float(solicitud.peso),
                
                # Datos del destinatario
                'DEST_NOMBRE': solicitud.destinatario.nombre,
                'DEST_DIRECCION': solicitud.destinatario.direccion,
                'DEST_TELEFONO': solicitud.destinatario.telefono,
                'DEST_APARTADO': solicitud.destinatario.codigo_postal,
                'DEST_ZIP': solicitud.destinatario.codigo_postal_zip or solicitud.destinatario.codigo_postal[:8],
                
                # Datos del remitente
                'SEND_NOMBRE': solicitud.remitente.nombre,
                'SEND_DIRECCION': solicitud.remitente.direccion,
                'SEND_TELEFONO': solicitud.remitente.telefono,
                'SEND_ZIP': solicitud.remitente.codigo_postal,
                
                # Observaciones
                'OBSERVACIONES': solicitud.observaciones or '',
                
                # Campos opcionales (pueden ser NULL o 0)
                'VARIABLE_1': None,
                'VARIABLE_3': None,
                'VARIABLE_4': None,
                'VARIABLE_5': 0,
                'VARIABLE_6': None,
                'VARIABLE_7': None,
                'VARIABLE_8': None,
                'VARIABLE_9': None,
                'VARIABLE_10': None,
                'VARIABLE_11': None,
                'VARIABLE_12': 0,
                'VARIABLE_13': None,
                'VARIABLE_14': None,
                'VARIABLE_15': None,
                'VARIABLE_16': None,
            }
            
            # Construir objeto ccrReqDatosEnvio
            req_envio = {
                'Cliente': config.COD_CLIENTE,
                'Envio': datos_envio
            }
            
            # Llamar al método SOAP
            result = soap_client.call_method("ccrRegistroEnvio", req_envio)
            
            # Procesar respuesta
            if hasattr(result, 'CodRespuesta'):
                codigo = result.CodRespuesta
                mensaje = getattr(result, 'MensajeRespuesta', '')
                pdf_base64 = getattr(result, 'PDF', None)
            elif isinstance(result, dict):
                codigo = result.get('CodRespuesta')
                mensaje = result.get('MensajeRespuesta', '')
                pdf_base64 = result.get('PDF')
            else:
                codigo = '00'
                mensaje = 'Consulta exitosa'
                pdf_base64 = getattr(result, 'PDF', None) if hasattr(result, 'PDF') else None
            
            # Validar código de respuesta
            if codigo != '00':
                error_msg = f"Error al registrar envío. Código: {codigo}, Mensaje: {mensaje}"
                logger.error(error_msg)
                
                if codigo == '20':
                    raise Exception("Token no válido. Intente nuevamente.")
                elif codigo == '15':
                    raise Exception("Error interno del servicio de Correos.")
                elif codigo == '17':
                    raise Exception(f"Error de validación de datos: {mensaje}")
                else:
                    raise Exception(f"Error desconocido: {mensaje}")
            
            if not pdf_base64:
                logger.warning("No se recibió PDF en la respuesta")
            
            logger.info("Envío registrado exitosamente")

            # Consultar tarifa oficial (si posible) para saber el monto cobrado por Correos
            tarifa = None
            try:
                tarifa = EnvioService._consultar_tarifa(solicitud)
            except Exception as e:
                logger.warning(f"No se pudo consultar tarifa (ccrTarifa): {e}")
            
            return {
                'codigo_respuesta': codigo,
                'mensaje_respuesta': mensaje,
                'pdf_base64': pdf_base64,
                # Tarifa oficial reportada por Correos (si disponible)
                'tarifa': tarifa,
            }
            
        except Exception as e:
            logger.error(f"Error al registrar envío: {e}")
            raise


# Instancia global del servicio
envio_service = EnvioService()
