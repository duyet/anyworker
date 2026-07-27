"""APIRouters mounted by create_app."""

from .auth import build_router as build_auth_router
from .byok import build_router as build_byok_router
from .catalog import build_router as build_catalog_router

__all__ = ["build_auth_router", "build_byok_router", "build_catalog_router"]
