"""
Modelos de datos para envíos usando Pydantic.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class DatosRemitente(BaseModel):
    """Datos del remitente"""
    nombre: str = Field(..., max_length=200, description="Nombre del remitente")
    direccion: str = Field(..., max_length=500, description="Dirección física del remitente")
    telefono: str = Field(..., max_length=15, description="Número telefónico del remitente")
    codigo_postal: str = Field(..., max_length=8, description="Código postal del remitente")


class DatosDestinatario(BaseModel):
    """Datos del destinatario"""
    nombre: str = Field(..., max_length=200, description="Nombre del destinatario")
    direccion: str = Field(..., max_length=500, description="Dirección física del destinatario")
    telefono: str = Field(..., max_length=15, description="Número telefónico del destinatario")
    codigo_postal: str = Field(..., max_length=20, description="Código postal del destinatario (DEST_APARTADO)")
    codigo_postal_zip: Optional[str] = Field(None, max_length=8, description="Código postal ZIP del destinatario")


class SolicitudGuia(BaseModel):
    """Solicitud para generar una guía de envío"""
    remitente: DatosRemitente
    destinatario: DatosDestinatario
    peso: float = Field(..., gt=0, description="Peso del envío en gramos")
    monto_flete: float = Field(..., ge=0, description="Monto del flete en colones")
    observaciones: Optional[str] = Field(None, max_length=200, description="Descripción del contenido")
    fecha_envio: Optional[datetime] = Field(default_factory=datetime.now, description="Fecha de envío")
    
    @field_validator('peso')
    @classmethod
    def validate_peso(cls, v):
        """Validar que el peso sea positivo"""
        if v <= 0:
            raise ValueError('El peso debe ser mayor a 0')
        return v
    
    @field_validator('monto_flete')
    @classmethod
    def validate_monto_flete(cls, v):
        """Validar que el monto no sea negativo"""
        if v < 0:
            raise ValueError('El monto del flete no puede ser negativo')
        return v


class RespuestaGuia(BaseModel):
    """Respuesta de generación de guía"""
    exito: bool
    numero_envio: Optional[str] = None
    codigo_respuesta: Optional[str] = None
    mensaje_respuesta: Optional[str] = None
    pdf_base64: Optional[str] = None
    error: Optional[str] = None
