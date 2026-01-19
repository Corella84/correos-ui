"""
Servicio de autenticación con Correos de Costa Rica.
Maneja la obtención y renovación automática de tokens.
"""
import time
import logging
import requests
import json
import base64
from typing import Optional
from datetime import datetime, timedelta
from src.config import config

logger = logging.getLogger(__name__)


class AuthService:
    """
    Servicio para autenticación con token.
    Gestiona la renovación automática antes de la expiración.
    """
    
    def __init__(self):
        self._token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._lock = False  # Simple lock para evitar requests concurrentes
    
    def get_token(self, force_refresh: bool = False) -> str:
        """
        Obtiene un token válido, renovándolo si es necesario.
        
        Args:
            force_refresh: Si True, fuerza la renovación del token
            
        Returns:
            Token válido
            
        Raises:
            Exception: Si no se puede obtener el token
        """
        # Si hay un token válido y no se fuerza refresh, retornarlo
        if not force_refresh and self._is_token_valid():
            return self._token
        
        # Renovar token
        return self._refresh_token()

    @staticmethod
    def _normalize_token(token: str) -> str:
        """
        Correos espera SOLO el JWT (sin 'Bearer ').
        Normaliza el string para evitar rechazos por prefijo.
        """
        if token is None:
            return token
        t = str(token).strip()
        # Quitar prefijo Bearer si viene incluido
        if t.lower().startswith("bearer "):
            t = t[7:].strip()
        return t

    @staticmethod
    def _try_get_jwt_exp(token: str) -> Optional[datetime]:
        """
        Intenta leer el claim 'exp' de un JWT sin validar firma.
        Esto permite calcular expiración real en vez de asumir 5 minutos.
        """
        try:
            if not token or token.count(".") < 2:
                return None
            payload_b64 = token.split(".")[1]
            # base64url padding
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload_raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
            payload = json.loads(payload_raw)
            exp = payload.get("exp")
            if isinstance(exp, (int, float)):
                return datetime.fromtimestamp(exp)
            if isinstance(exp, str) and exp.isdigit():
                return datetime.fromtimestamp(int(exp))
            return None
        except Exception:
            return None
    
    def _is_token_valid(self) -> bool:
        """Verifica si el token actual es válido"""
        if not self._token or not self._token_expires_at:
            return False
        
        # Verificar si el token expira pronto (usar buffer)
        buffer_time = timedelta(seconds=config.TOKEN_REFRESH_BUFFER_SECONDS)
        expires_with_buffer = self._token_expires_at - buffer_time
        
        return datetime.now() < expires_with_buffer
    
    def _refresh_token(self) -> str:
        """
        Renueva el token desde el servicio de autenticación.
        
        Returns:
            Nuevo token
            
        Raises:
            Exception: Si falla la autenticación
        """
        # Evitar múltiples requests simultáneos
        if self._lock:
            # Esperar un poco y reintentar
            time.sleep(0.5)
            if self._token and self._is_token_valid():
                return self._token
        
        self._lock = True
        
        try:
            logger.info("Renovando token de autenticación...")
            logger.info(f"URL: {config.TOKEN_URL}")
            logger.info(f"Username: {config.USERNAME}")
            
            payload = {
                "Username": config.USERNAME,
                "Password": config.PASSWORD,
                "Sistema": config.SISTEMA
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            logger.debug(f"Payload enviado (sin password): {{'Username': '{config.USERNAME}', 'Sistema': '{config.SISTEMA}'}}")
            
            response = requests.post(
                config.TOKEN_URL,
                json=payload,
                headers=headers,
                timeout=10,
                verify=True  # Cambiar a False temporalmente si hay problemas SSL
            )
            
            logger.info(f"Status code: {response.status_code}")
            logger.info(f"Response headers: {dict(response.headers)}")
            logger.info(f"Response text (primeros 500 chars): {response.text[:500]}")
            
            response.raise_for_status()
            
            # Intentar parsear como JSON
            try:
                data = response.json()
                logger.info(f"Response JSON parseado: {data}")
            except (ValueError, json.JSONDecodeError) as e:
                # Si no es JSON, puede ser texto plano (el token directamente)
                logger.warning(f"La respuesta no es JSON válido: {e}")
                logger.info("Intentando interpretar respuesta como texto plano (token directo)")
                data = response.text.strip()
                logger.info(f"Response como texto: {data}")
            
            # El formato de respuesta puede variar, ajustar según la respuesta real
            token = None
            
            if isinstance(data, dict):
                # Buscar el token en diferentes campos posibles
                if "token" in data:
                    token = data["token"]
                elif "Token" in data:
                    token = data["Token"]
                elif "access_token" in data:
                    token = data["access_token"]
                elif "AccessToken" in data:
                    token = data["AccessToken"]
                elif "result" in data:
                    # Algunos APIs devuelven {"result": "token"}
                    token = data["result"]
                elif len(data) == 1:
                    # Si solo hay un campo, usar su valor
                    token = list(data.values())[0]
                else:
                    logger.warning(f"Formato de respuesta JSON no reconocido: {data}")
                    # Intentar convertir todo el dict a string si no hay campos conocidos
                    token = str(data)
            elif isinstance(data, str):
                # Si la respuesta es directamente el token como string
                token = data.strip().strip('"').strip("'")  # Remover comillas si las hay
            
            if not token or token == "null" or token == "None":
                logger.error(f"No se pudo extraer el token de la respuesta: {data}")
                raise ValueError(f"Token vacío o inválido en la respuesta. Respuesta completa: {response.text}")
            
            # Normalizar: Correos NO acepta 'Bearer <jwt>' en pToken
            normalized = self._normalize_token(token)

            # Guardar token y calcular expiración (preferir exp del JWT)
            self._token = str(normalized)
            jwt_exp = self._try_get_jwt_exp(self._token)
            if jwt_exp:
                self._token_expires_at = jwt_exp
            else:
                # Fallback: asumir expiración configurable (por defecto 5 minutos)
                self._token_expires_at = datetime.now() + timedelta(
                    seconds=config.TOKEN_EXPIRATION_SECONDS
                )
            
            logger.info(
                f"Token renovado exitosamente. Expira en: {self._token_expires_at}"
            )
            logger.debug(f"Token (primeros 20 chars): {self._token[:20]}...")
            
            return self._token
            
        except requests.exceptions.SSLError as e:
            logger.error(f"Error SSL al renovar token: {e}")
            raise Exception(f"Error SSL al obtener token: {str(e)}. Verifica certificados o configura verify=False temporalmente.")
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Error de conexión al renovar token: {e}")
            raise Exception(f"Error de conexión al obtener token: {str(e)}. Verifica la URL '{config.TOKEN_URL}' y conectividad.")
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error HTTP al renovar token: {e}")
            logger.error(f"Response status: {response.status_code}")
            logger.error(f"Response text: {response.text}")
            raise Exception(f"Error HTTP {response.status_code} al obtener token: {response.text}")
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout al renovar token: {e}")
            raise Exception(f"Timeout al obtener token: {str(e)}. La conexión excedió el tiempo de espera.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de request al renovar token: {e}")
            raise Exception(f"Error de conexión al obtener token: {str(e)}")
        except ValueError as e:
            logger.error(f"Error de valor al procesar token: {e}")
            raise
        except Exception as e:
            logger.error(f"Error inesperado al renovar token: {e}", exc_info=True)
            raise Exception(f"Error al obtener token: {str(e)}")
        finally:
            self._lock = False
    
    def invalidate_token(self):
        """Invalida el token actual (útil para forzar renovación)"""
        self._token = None
        self._token_expires_at = None
        logger.info("Token invalidado")


# Instancia global del servicio de autenticación
auth_service = AuthService()
