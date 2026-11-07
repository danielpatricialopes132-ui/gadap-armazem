from typing import Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.supabase_client import supabase
from app.core.auth import get_tenant_from_auth_header

router = APIRouter(prefix="/billing", tags=["Faturamento Aduaneiro & Demurrage"])

class CalculateStorageRequest(BaseModel):
    inbound_lot_id: UUID
    cif_value: float = Field(..., gt=0, description="Valor CIF da mercadoria em R$")
    gross_weight_ton: float = Field(default=1.0, gt=0)
    days_stored: int = Field(..., ge=1)

class RegisterContainerRequest(BaseModel):
    client_id: UUID
    container_number: str = Field(..., min_length=11, max_length=11)
    shipping_line: str
    gate_in_date: datetime
    free_time_days: int = 14
    daily_demurrage_rate: float = 120.00
    currency: str = "USD"

@router.post("/storage/calculate")
async def calculate_storage_fee(
    payload: CalculateStorageRequest,
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    """
    Calcula a armazenagem por decêndio/período com Ad Valorem sobre o valor CIF
    e taxa de movimentação (handling in/out).
    """
    free_days = 7
    billable_days = max(0, payload.days_stored - free_days)
    periods = max(1, (billable_days + 9) // 10) if billable_days > 0 else 0

    ad_valorem_rate = 0.0050 # 0.50% por período decendial
    storage_fee = periods * (payload.cif_value * ad_valorem_rate)
    storage_fee = max(storage_fee, 150.00 if periods > 0 else 0.0)

    handling_fee = payload.gross_weight_ton * 50.00 # R$ 50/tonelada (In + Out)
    total = storage_fee + handling_fee

    return {
        "days_stored": payload.days_stored,
        "free_days": free_days,
        "billable_periods": periods,
        "storage_fee": round(storage_fee, 2),
        "handling_fee": round(handling_fee, 2),
        "total_estimated": round(total, 2)
    }

@router.post("/containers/register")
async def register_container(
    payload: RegisterContainerRequest,
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    deadline = payload.gate_in_date + timedelta(days=payload.free_time_days)
    insert_data = {
        "tenant_id": str(tenant_id),
        "client_id": str(payload.client_id),
        "container_number": payload.container_number.upper(),
        "shipping_line": payload.shipping_line,
        "gate_in_date": payload.gate_in_date.isoformat(),
        "free_time_days": payload.free_time_days,
        "free_time_deadline": deadline.isoformat(),
        "daily_demurrage_rate": payload.daily_demurrage_rate,
        "currency": payload.currency,
        "status": "FREE_TIME"
    }

    res = supabase.table("container_demurrage").insert(insert_data).execute()
    return {"status": "SUCCESS", "container": res.data[0]}

@router.get("/containers/overdue")
async def list_overdue_containers(
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    """
    Verifica e lista containers com prazo de Free Time estourado, calculando a sobreestadia (Demurrage).
    """
    res = supabase.table("container_demurrage")\
        .select("*, clients(name)")\
        .eq("tenant_id", str(tenant_id))\
        .is_("gate_out_empty_date", None)\
        .execute()

    now = datetime.utcnow()
    results = []

    for c in res.data:
        deadline = datetime.fromisoformat(c["free_time_deadline"].replace("Z", "+00:00"))
        if now > deadline.replace(tzinfo=None):
            overdue_days = (now - deadline.replace(tzinfo=None)).days
            demurrage = overdue_days * float(c["daily_demurrage_rate"])
            results.append({
                "container_number": c["container_number"],
                "shipping_line": c["shipping_line"],
                "client_name": c.get("clients", {}).get("name", "N/D"),
                "deadline": c["free_time_deadline"],
                "overdue_days": overdue_days,
                "currency": c["currency"],
                "demurrage_due": round(demurrage, 2),
                "status": "OVERDUE_DEMURRAGE"
            })

    return {"overdue_count": len(results), "containers": results}

