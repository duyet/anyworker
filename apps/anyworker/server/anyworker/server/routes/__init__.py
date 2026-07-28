"""APIRouters mounted by create_app."""

from .auth import build_router as build_auth_router
from .byok import build_router as build_byok_router
from .catalog import build_router as build_catalog_router
from .github import build_router as build_github_router
from .testing import build_router as build_testing_router
from anyworker.plugins.routes import build_router as build_plugin_router

__all__ = [
    "build_auth_router",
    "build_byok_router",
    "build_catalog_router",
    "build_github_router",
    "build_testing_router",
    "build_plugin_router",
]
