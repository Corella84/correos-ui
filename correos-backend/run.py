#!/usr/bin/env python3
"""
Script para ejecutar el servidor de la API.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.api.endpoints:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
