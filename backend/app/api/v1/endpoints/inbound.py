import base64
import io
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import reportlab.lib.pagesizes as pagesizes
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from app.core.supabase_client import supabase
from app.core.auth import get_tenant_from_auth_header

router = APIRouter(prefix="/inbound", tags=["Logística de Doca & Recebimento"])

class InboundReceiveSchema(BaseModel):
    inbound_lot_id: UUID
    received_volumes: int = Field(..., gt=0)
    has_damage: bool = False
    damage_notes: Optional[str] = None
    damage_photo_base64: Optional[str] = None

class ExtraBillSchema(BaseModel):
    inbound_lot_id: UUID
    client_id: UUID
    service_description: str = Field(..., min_length=3)
    amount: float = Field(..., gt=0)

@router.post("/receive")
async def receive_inbound_lot(
    payload: InboundReceiveSchema, 
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    """
    Registra conferência física na doca. Se houver avarias com imagem Base64, 
    gera e retorna o Termo de Avaria em PDF 'on-the-fly' sem salvar o arquivo em disco/bucket (Zero-Storage).
    """
    update_data = {
        "received_volumes": payload.received_volumes,
        "has_damage": payload.has_damage,
        "damage_notes": payload.damage_notes,
        "status": "UNLOADING" if not payload.has_damage else "QUARANTINE",
        "updated_at": datetime.utcnow().isoformat()
    }

    try:
        res = supabase.table("inbound_lots")\
            .update(update_data)\
            .eq("id", str(payload.inbound_lot_id))\
            .eq("tenant_id", str(tenant_id))\
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no banco: {str(e)}")

    if not res.data:
        raise HTTPException(status_code=404, detail="Lote de entrada não encontrado para o Armazém")

    lot = res.data[0]

    # Se houver avaria documentada com foto, gera laudo PDF Zero-Storage
    if payload.has_damage and payload.damage_photo_base64:
        pdf_buffer = io.BytesIO()
        pdf = canvas.Canvas(pdf_buffer, pagesize=pagesizes.A4)
        width, height = pagesizes.A4

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(50, height - 50, "GADAP ARMAZÉM - LAUDO DE RECEBIMENTO COM RESSALVA")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(50, height - 70, f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        pdf.drawString(50, height - 85, f"Lote ID: {lot['id']} | Documento/DI: {lot['document_number']}")
        pdf.drawString(50, height - 100, f"Volumes Declarados: {lot['expected_volumes']} | Volumes Conferidos: {payload.received_volumes}")
        pdf.drawString(50, height - 115, f"Ressalva / Avaria: {payload.damage_notes or 'Sem observações adicionais'}")

        try:
            image_bytes = base64.b64decode(payload.damage_photo_base64.split(",")[-1])
            image_reader = ImageReader(io.BytesIO(image_bytes))
            pdf.drawImage(image_reader, 50, height - 450, width=500, height=320, preserveAspectRatio=True)
            pdf.drawString(50, height - 465, "Registro fotográfico da Doca - Descartado após emissão deste laudo (Zero-Storage).")
        except Exception as e:
            pdf.drawString(50, height - 300, f"[Erro ao processar imagem de avaria: {str(e)}]")

        pdf.showPage()
        pdf.save()
        pdf_buffer.seek(0)

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=laudo_avaria_{lot['document_number']}.pdf"}
        )

    return {"status": "SUCCESS", "message": "Recebimento confirmado na doca", "lot": lot}

@router.post("/extras/bill")
@router.post("/bill", include_in_schema=False)
async def bill_warehouse_extra(
    payload: ExtraBillSchema, 
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    """
    Lança serviço extra executado na hora diretamente no faturamento pendente do cliente.
    """
    insert_payload = {
        "tenant_id": str(tenant_id),
        "client_id": str(payload.client_id),
        "inbound_lot_id": str(payload.inbound_lot_id),
        "service_description": payload.service_description,
        "amount": payload.amount,
        "status": "PENDING"
    }

    try:
        res = supabase.table("warehouse_extras_billing").insert(insert_payload).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar extra: {str(e)}")

    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao registrar serviço extra")

    return {
        "status": "SUCCESS",
        "message": "Serviço extra lançado com sucesso para faturamento",
        "entry": res.data[0]
    }

