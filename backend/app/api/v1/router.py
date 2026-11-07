from fastapi import APIRouter
from app.api.v1.endpoints import inbound, extras, outbound, scheduling_audit, billing

api_router = APIRouter()

api_router.include_router(inbound.router, prefix="/logistics")
api_router.include_router(extras.router, prefix="/logistics")
api_router.include_router(outbound.router, prefix="/logistics")
api_router.include_router(scheduling_audit.router, prefix="/logistics")
api_router.include_router(billing.router, prefix="/logistics")
