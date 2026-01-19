"""
Configuración de la aplicación.
Carga variables de entorno y define constantes.
"""
import os
from dotenv import load_dotenv
from typing import Optional

# Cargar variables de entorno
load_dotenv()


class Config:
    """Configuración de Correos de Costa Rica"""
    
    # Credenciales
    USERNAME: str = os.getenv("CORREOS_USERNAME", "ccrWS397761")
    PASSWORD: str = os.getenv("CORREOS_PASSWORD", "hwoeDmZwyZ")
    SISTEMA: str = os.getenv("CORREOS_SISTEMA", "PYMEXPRESS")
    USUARIO_ID: int = int(os.getenv("CORREOS_USUARIO_ID", "397761"))
    SERVICIO_ID: int = int(os.getenv("CORREOS_SERVICIO_ID", "73"))
    COD_CLIENTE: str = os.getenv("CORREOS_COD_CLIENTE", "397761")
    
    # URLs
    TOKEN_URL: str = os.getenv(
        "CORREOS_TOKEN_URL",
        "https://servicios.correos.go.cr:447/Token/authenticate"
    )
    SOAP_URL: str = os.getenv(
        "CORREOS_SOAP_URL",
        "https://amistadpro.correos.go.cr:444/wsAppCorreos.wsAppCorreos.svc"
    )
    
    # Configuración de aplicación
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    TOKEN_REFRESH_BUFFER_SECONDS: int = int(
        os.getenv("TOKEN_REFRESH_BUFFER_SECONDS", "60")
    )
    
    # Tiempo de expiración del token (5 minutos en segundos)
    TOKEN_EXPIRATION_SECONDS: int = 300


# Instancia global de configuración
config = Config()
