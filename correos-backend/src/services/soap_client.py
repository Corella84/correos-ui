"""
Cliente SOAP base para comunicación con Correos de Costa Rica.
"""
import logging
from lxml import etree
from zeep import Client, Settings
from zeep.exceptions import Fault, TransportError
from zeep.plugins import HistoryPlugin
from src.config import config
from src.services.auth_service import auth_service

logger = logging.getLogger(__name__)


class SoapClient:
    """
    Cliente SOAP para interactuar con el Web Service de Correos.
    Maneja autenticación y errores comunes.
    """
    
    def __init__(self):
        self._client: Client = None
        self._wsdl_url: str = f"{config.SOAP_URL}?wsdl"
        self._history = HistoryPlugin()
        self._settings = Settings(
            strict=False,
            xml_huge_tree=True,
            raw_response=False
        )
    
    def _get_client(self) -> Client:
        """Obtiene o crea el cliente SOAP"""
        if self._client is None:
            try:
                logger.info(f"Creando cliente SOAP con WSDL: {self._wsdl_url}")
                self._client = Client(
                    wsdl=self._wsdl_url,
                    settings=self._settings,
                    plugins=[self._history],
                )
                logger.info("Cliente SOAP creado exitosamente")
            except Exception as e:
                logger.error(f"Error al crear cliente SOAP: {e}")
                raise Exception(f"Error al inicializar cliente SOAP: {str(e)}")
        
        return self._client
    
    def call_method(
        self,
        method_name: str,
        *args,
        retry_on_token_error: bool = True,
        **kwargs
    ):
        """
        Llama a un método del Web Service SOAP.
        
        Args:
            method_name: Nombre del método a llamar
            *args: Argumentos posicionales
            retry_on_token_error: Si True, reintenta con nuevo token si hay error 20
            **kwargs: Argumentos con nombre
            
        Returns:
            Resultado de la llamada SOAP
            
        Raises:
            Exception: Si falla la llamada
        """
        client = self._get_client()
        method = getattr(client.service, method_name, None)
        
        if method is None:
            raise ValueError(f"Método '{method_name}' no encontrado en el servicio")
        
        # Obtener token válido (Correos usa token por llamada)
        token = auth_service.get_token()
        # Defensa extra: si por alguna razón viene con 'Bearer ', quitarlo aquí también.
        if isinstance(token, str) and token.lower().startswith("bearer "):
            token = token[7:].strip()
        
        # No usar set_default_soapheaders(dict): Zeep intenta tipar el header
        # y puede fallar con "ComplexType() got an unexpected keyword argument".
        # En su lugar enviamos un header XML (sin tipado) por llamada, o pasamos
        # el token como parámetro si el WSDL lo declara en la firma.

        operation_signature = ""
        try:
            binding = getattr(client.service, "_binding", None)
            if binding and hasattr(binding, "_operations"):
                op = binding._operations.get(method_name)
                if op and getattr(op, "input", None) and hasattr(op.input, "signature"):
                    operation_signature = op.input.signature() or ""
        except Exception as e:
            logger.debug(f"No se pudo obtener firma WSDL para {method_name}: {e}")

        def _build_token_header(token_value: str):
            # Correos (WCF) suele matchear headers por (nombre + namespace).
            # Como el WSDL no expone pToken, inferimos el namespace del binding.
            ns = None
            try:
                binding = getattr(client.service, "_binding", None)
                bname = getattr(binding, "name", None)
                if bname is not None:
                    if hasattr(bname, "namespace"):
                        ns = bname.namespace
                    elif isinstance(bname, str) and bname.startswith("{") and "}" in bname:
                        ns = bname[1 : bname.index("}")]
            except Exception:
                ns = None

            if ns:
                el = etree.Element(etree.QName(ns, "pToken"))
            else:
                el = etree.Element("pToken")
            el.text = str(token_value)
            return [el]

        def _invoke_with_token(token_value: str):
            # Si la operación expone pToken como parámetro en el body, úsalo como kw.
            if "pToken" in operation_signature and "pToken" not in kwargs:
                merged_kwargs = dict(kwargs)
                merged_kwargs["pToken"] = token_value
                return method(*args, **merged_kwargs)

            # Caso común: pToken va en SOAP headers
            # Además, algunos despliegues validan token por headers HTTP.
            session = getattr(getattr(client, "transport", None), "session", None)
            old_auth = None
            old_ptoken = None
            try:
                if session is not None:
                    old_auth = session.headers.get("Authorization")
                    old_ptoken = session.headers.get("pToken")
                    session.headers["Authorization"] = f"Bearer {token_value}"
                    session.headers["pToken"] = str(token_value)
                return method(*args, **kwargs, _soapheaders=_build_token_header(token_value))
            finally:
                # Restaurar headers para no "ensuciar" otras llamadas
                if session is not None:
                    if old_auth is None:
                        session.headers.pop("Authorization", None)
                    else:
                        session.headers["Authorization"] = old_auth
                    if old_ptoken is None:
                        session.headers.pop("pToken", None)
                    else:
                        session.headers["pToken"] = old_ptoken

        def _extract_code_message(res):
            """
            Algunos métodos de Correos responden con CodRespuesta/MensajeRespuesta
            (sin SOAP Fault). Extraemos esos campos para manejar token inválido.
            """
            try:
                if hasattr(res, "CodRespuesta"):
                    code = getattr(res, "CodRespuesta", None)
                    msg = getattr(res, "MensajeRespuesta", "") or ""
                    return (str(code) if code is not None else None, str(msg))
                if isinstance(res, dict):
                    code = res.get("CodRespuesta")
                    msg = res.get("MensajeRespuesta", "") or ""
                    return (str(code) if code is not None else None, str(msg))
            except Exception:
                pass
            return (None, "")
        
        try:
            logger.info(f"Llamando método SOAP: {method_name}")
            if operation_signature:
                logger.debug(f"Firma WSDL {method_name}: {operation_signature}")

            result = _invoke_with_token(token)

            # Si el WS reporta token inválido como código 20 (sin Fault),
            # invalidamos, renovamos y reintentamos una vez.
            code, msg = _extract_code_message(result)
            if retry_on_token_error and code == "20":
                logger.warning(
                    f"Token inválido reportado por WS en {method_name}: {msg}. Renovando y reintentando..."
                )
                auth_service.invalidate_token()
                token = auth_service.get_token(force_refresh=True)
                if isinstance(token, str) and token.lower().startswith("bearer "):
                    token = token[7:].strip()
                result = _invoke_with_token(token)
            logger.info(f"Método {method_name} ejecutado exitosamente")
            return result
            
        except Fault as e:
            error_code = getattr(e, 'code', None)
            error_message = str(e)
            
            logger.error(f"Error SOAP Fault en {method_name}: {e}")
            
            # Si es error de token (código 20) y se permite reintento
            if retry_on_token_error and (
                '20' in error_message or 
                'Token no valido' in error_message or
                'token' in error_message.lower()
            ):
                logger.warning("Error de token detectado, renovando e reintentando...")
                auth_service.invalidate_token()
                token = auth_service.get_token(force_refresh=True)
                
                # Reintentar una vez
                try:
                    result = _invoke_with_token(token)
                    logger.info(f"Método {method_name} ejecutado exitosamente tras renovar token")
                    return result
                except Exception as retry_error:
                    logger.error(f"Error en reintento de {method_name}: {retry_error}")
                    raise Exception(f"Error en método {method_name} tras renovar token: {str(retry_error)}")
            
            raise Exception(f"Error SOAP en {method_name}: {error_message}")
            
        except TransportError as e:
            logger.error(f"Error de transporte en {method_name}: {e}")
            raise Exception(f"Error de conexión en {method_name}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error inesperado en {method_name}: {e}")
            raise Exception(f"Error al ejecutar {method_name}: {str(e)}")
    
    def get_service_info(self):
        """Obtiene información del servicio (útil para debugging)"""
        client = self._get_client()
        return {
            'wsdl_url': self._wsdl_url,
            'services': list(client.wsdl.services.keys()) if client.wsdl.services else [],
            'port_types': list(client.wsdl.port_types.keys()) if client.wsdl.port_types else [],
        }

    def get_last_soap_exchange(self):
        """
        Devuelve el último request/response SOAP capturado por Zeep.
        Útil para ver exactamente qué se envió y qué respondió el WS.
        """
        try:
            sent = None
            received = None

            if getattr(self._history, "last_sent", None) and self._history.last_sent.get("envelope") is not None:
                sent = etree.tostring(
                    self._history.last_sent["envelope"],
                    pretty_print=True,
                    encoding="unicode",
                )

            if getattr(self._history, "last_received", None) and self._history.last_received.get("envelope") is not None:
                received = etree.tostring(
                    self._history.last_received["envelope"],
                    pretty_print=True,
                    encoding="unicode",
                )

            return {"sent": sent, "received": received}
        except Exception as e:
            logger.debug(f"No se pudo obtener exchange SOAP: {e}")
            return {"sent": None, "received": None}


# Instancia global del cliente SOAP
soap_client = SoapClient()
