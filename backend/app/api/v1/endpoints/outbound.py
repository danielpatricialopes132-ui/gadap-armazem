import io
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import reportlab.lib.pagesizes as pagesizes
from reportlab.pdfgen import canvas

from app.core.supabase_client import supabase
from app.core.auth import get_tenant_from_auth_header

router = APIRouter(prefix="/outbound", tags=["Expedição & Picking"])

class CompletePickingSchema(BaseModel):
    task_id: UUID
    quantity_picked: float = Field(..., gt=0)
    staging_position_id: Optional[UUID] = None

class BlindCheckoutScanSchema(BaseModel):
    order_id: UUID
    barcode_scanned: str
    quantity: float = Field(default=1.0, gt=0)
    vehicle_plate: Optional[str] = None
    seal_number: Optional[str] = None

@router.post("/pick/complete")
async def complete_picking_task(
    payload: CompletePickingSchema, 
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    task_res = supabase.table("picking_tasks")\
        .select("*")\
        .eq("id", str(payload.task_id))\
        .eq("tenant_id", str(tenant_id))\
        .execute()

    if not task_res.data:
        raise HTTPException(status_code=404, detail="Tarefa de picking não localizada")

    task = task_res.data[0]

    supabase.table("picking_tasks").update({
        "status": "COMPLETED",
        "picked_at": datetime.utcnow().isoformat(),
        "staging_position_id": str(payload.staging_position_id) if payload.staging_position_id else None
    }).eq("id", str(payload.task_id)).execute()

    item_res = supabase.table("outbound_order_items").select("quantity_picked").eq("id", task["order_item_id"]).execute()
    current_picked = float(item_res.data[0]["quantity_picked"]) if item_res.data else 0
    new_picked = current_picked + payload.quantity_picked

    supabase.table("outbound_order_items").update({
        "quantity_picked": new_picked
    }).eq("id", task["order_item_id"]).execute()

    return {"status": "SUCCESS", "message": "Item separado com sucesso"}

@router.post("/checkout/scan")
async def checkout_blind_scan(
    payload: BlindCheckoutScanSchema, 
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    prod_res = supabase.table("products")\
        .select("id, sku, description")\
        .eq("tenant_id", str(tenant_id))\
        .or_(f"barcode.eq.{payload.barcode_scanned},sku.eq.{payload.barcode_scanned}")\
        .execute()

    if not prod_res.data:
        raise HTTPException(status_code=400, detail="Código de barras não cadastrado no catálogo")

    product = prod_res.data[0]

    item_res = supabase.table("outbound_order_items")\
        .select("id, quantity_requested, quantity_checked")\
        .eq("order_id", str(payload.order_id))\
        .eq("product_id", product["id"])\
        .execute()

    if not item_res.data:
        raise HTTPException(status_code=400, detail="Este produto NÃO pertence a esta Ordem de Expedição!")

    item = item_res.data[0]
    new_checked = float(item["quantity_checked"]) + payload.quantity

    if new_checked > float(item["quantity_requested"]):
        raise HTTPException(status_code=400, detail="Quantidade conferida excede o total do pedido!")

    supabase.table("outbound_order_items").update({
        "quantity_checked": new_checked
    }).eq("id", item["id"]).execute()

    return {
        "status": "SUCCESS",
        "product": product["description"],
        "quantity_checked": new_checked,
        "quantity_requested": float(item["quantity_requested"]),
        "is_item_completed": new_checked == float(item["quantity_requested"])
    }

@router.get("/orders/{order_id}/packing-list")
async def generate_packing_list_pdf(
    order_id: UUID, 
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    order_res = supabase.table("outbound_orders").select("*, clients(name)").eq("id", str(order_id)).execute()
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    order = order_res.data[0]

    items_res = supabase.table("outbound_order_items").select("*, products(sku, description)").eq("order_id", str(order_id)).execute()

    pdf_buffer = io.BytesIO()
    pdf = canvas.Canvas(pdf_buffer, pagesize=pagesizes.A4)
    width, height = pagesizes.A4

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, height - 50, "GADAP ARMAZÉM - PACKING LIST / ROMANEIO DE SAÍDA")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, height - 70, f"Pedido: {order['order_number']} | Cliente: {order.get('clients', {}).get('name', 'N/D')}")
    pdf.drawString(50, height - 85, f"Destinatário: {order['destination_name']} | Doca: {order.get('dock_number', '01')}")
    pdf.drawString(50, height - 100, f"Data da Emissão: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    pdf.line(50, height - 110, width - 50, height - 110)

    y = height - 130
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, y, "SKU")
    pdf.drawString(140, y, "DESCRIÇÃO")
    pdf.drawString(380, y, "SOLICITADO")
    pdf.drawString(460, y, "CONFERIDO")
    pdf.line(50, y - 5, width - 50, y - 5)

    y -= 20
    pdf.setFont("Helvetica", 9)
    for it in items_res.data:
        sku = it.get("products", {}).get("sku", "")
        desc = it.get("products", {}).get("description", "")[:40]
        req = str(it["quantity_requested"])
        chk = str(it["quantity_checked"])

        pdf.drawString(50, y, sku)
        pdf.drawString(140, y, desc)
        pdf.drawString(380, y, req)
        pdf.drawString(460, y, chk)
        y -= 18

    pdf.line(50, 100, width - 50, 100)
    pdf.drawString(50, 85, "Liberado para carregamento. Vistoria e Portaria concluídas.")
    pdf.drawString(50, 60, "Assinatura do Conferente: ____________________________")
    pdf.drawString(320, 60, "Motorista: ____________________________")

    pdf.showPage()
    pdf.save()
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=packing_list_{order['order_number']}.pdf"}
    )

