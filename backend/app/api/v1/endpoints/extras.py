from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.v1.endpoints.inbound import ExtraBillSchema, bill_warehouse_extra
from app.core.auth import get_tenant_from_auth_header

router = APIRouter(prefix="/extras", tags=["Faturamento de Extras Spot"])

@router.post("/bill")
async def bill_extra_alias(
    payload: ExtraBillSchema,
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    """
    Rota direta para registro de serviços extras executados na doca:
    POST /api/v1/logistics/extras/bill
    """
    return await bill_warehouse_extra(payload, tenant_id)

