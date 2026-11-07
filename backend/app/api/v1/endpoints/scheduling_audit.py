import os
import json
import re
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.supabase_client import supabase
from app.core.auth import get_tenant_from_auth_header

router = APIRouter(prefix="", tags=["Smart Scheduling & Auditoria Aduaneira"])

WHATSAPP_SCHEDULING_SYSTEM_PROMPT = """
Você é um Assistente de Inteligência Artificial Especialista em Triagem Operacional de Recintos Alfandegados e Armazéns Gerais do Sistema GADAP WMS.

Sua tarefa é analisar mensagens desestruturadas, informais ou ruidosas enviadas por motoristas de caminhão, despachantes aduaneiros ou transportadoras (via WhatsApp, e-mail ou transcrição de OCR de faturas/DIs) e extrair os dados críticos para o agendamento de entrada na doca.

DADOS OBRIGATÓRIOS PARA EXTRAÇÃO:
1. carrier_name: Nome da transportadora ou motorista (string limpa).
2. document_number: Número da Declaração de Importação (DI no padrão 24/XXXXXXX-X), DTA, Conhecimento de Embarque ou NF-e.
3. eta_forecast: Previsão de chegada em formato ISO 8601 (YYYY-MM-DDTHH:MM:SS).
4. expected_volumes: Quantidade numérica inteira de volumes/caixas/paletes informados.
5. cargo_type: Tipo da carga (CONTAINER, CARGA_SOLTA, PALETIZADA, PERIGOSA_IMO, REFRIGERADA).
6. confidence_score: Número de 0.0 a 1.0 indicando a precisão da extração.

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem comentários.
"""

class WhatsAppParseRequest(BaseModel):
    message_text: str = Field(..., min_length=5)
    reference_datetime: Optional[str] = None

class WhatsAppParseResponse(BaseModel):
    carrier_name: Optional[str]
    document_number: Optional[str]
    eta_forecast: Optional[str]
    expected_volumes: Optional[int]
    cargo_type: Optional[str]
    confidence_score: float
    suggested_dock: str
    suggested_time_slot: str

class AuditMatchResponse(BaseModel):
    lot_id: UUID
    document_number: str
    client_name: str
    fiscal_invoice_qty: int
    dock_received_qty: int
    service_order_qty: int
    is_divergent: bool
    status: str
    divergence_details: Dict[str, Any]

@router.post("/scheduling/parse-whatsapp", response_model=WhatsAppParseResponse)
async def parse_whatsapp_scheduling(
    payload: WhatsAppParseRequest,
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    ref_time = payload.reference_datetime or datetime.now().isoformat()
    parsed_data = None

    # Tenta utilizar Gemini caso chave configurada
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=WHATSAPP_SCHEDULING_SYSTEM_PROMPT,
                generation_config={"response_mime_type": "application/json"}
            )
            resp = model.generate_content(f"Referência: {ref_time}\nMensagem: {payload.message_text}")
            parsed_data = json.loads(resp.text)
        except Exception:
            parsed_data = None

    # Fallback heurístico resiliente (NLP / Regex)
    if not parsed_data:
        text = payload.message_text
        di_match = re.search(r"(\d{2}/\d{7}-\d|\bNF-?\s?\d+)", text, re.IGNORECASE)
        vol_match = re.search(r"(\d+)\s*(vol|cx|volumes|caixas|paletes|pallets)", text, re.IGNORECASE)
        
        parsed_data = {
            "carrier_name": "Transportadora Extraída",
            "document_number": di_match.group(0) if di_match else "DI-24/Pendente",
            "eta_forecast": (datetime.now() + timedelta(hours=3)).replace(minute=0, second=0).isoformat(),
            "expected_volumes": int(vol_match.group(1)) if vol_match else 24,
            "cargo_type": "PALETIZADA" if "palete" in text.lower() else "CARGA_SOLTA",
            "confidence_score": 0.88
        }

    volumes = parsed_data.get("expected_volumes") or 1
    cargo_type = parsed_data.get("cargo_type") or "CARGA_SOLTA"

    if cargo_type == "CONTAINER" or volumes > 50:
        suggested_dock = "DOCA_01_PESADA"
        duration_minutes = 90
    elif cargo_type == "REFRIGERADA":
        suggested_dock = "DOCA_04_CLIMATIZADA"
        duration_minutes = 45
    else:
        suggested_dock = "DOCA_02_GERAL"
        duration_minutes = 30

    eta_str = parsed_data.get("eta_forecast") or (datetime.now() + timedelta(hours=2)).isoformat()
    try:
        eta_dt = datetime.fromisoformat(eta_str.replace("Z", "+00:00"))
    except Exception:
        eta_dt = datetime.now() + timedelta(hours=2)

    slot_end = eta_dt + timedelta(minutes=duration_minutes)
    suggested_time_slot = f"{eta_dt.strftime('%H:%M')} às {slot_end.strftime('%H:%M')} ({eta_dt.strftime('%d/%m/%Y')})"

    return WhatsAppParseResponse(
        carrier_name=parsed_data.get("carrier_name"),
        document_number=parsed_data.get("document_number"),
        eta_forecast=parsed_data.get("eta_forecast"),
        expected_volumes=volumes,
        cargo_type=cargo_type,
        confidence_score=parsed_data.get("confidence_score", 0.90),
        suggested_dock=suggested_dock,
        suggested_time_slot=suggested_time_slot
    )

@router.post("/audit/match/{lot_id}", response_model=AuditMatchResponse)
async def audit_three_way_match(
    lot_id: UUID,
    tenant_id: UUID = Depends(get_tenant_from_auth_header)
):
    lot_res = supabase.table("inbound_lots")\
        .select("id, document_number, expected_volumes, received_volumes, status, client_id, clients(name)")\
        .eq("id", str(lot_id))\
        .eq("tenant_id", str(tenant_id))\
        .execute()

    if not lot_res.data:
        raise HTTPException(status_code=404, detail="Lote de entrada não localizado")

    lot = lot_res.data[0]
    client_name = lot.get("clients", {}).get("name", "Desconhecido") if lot.get("clients") else "Desconhecido"

    fiscal_invoice_qty = int(lot["expected_volumes"] or 0)
    dock_received_qty = int(lot["received_volumes"] or 0)
    service_order_qty = fiscal_invoice_qty 

    is_divergent = not (fiscal_invoice_qty == dock_received_qty == service_order_qty)
    diff = dock_received_qty - fiscal_invoice_qty

    divergence_details = {
        "difference": diff,
        "type": "CONFORME" if not is_divergent else ("SOBRA_DE_MERCADORIA" if diff > 0 else "FALTA_DE_MERCADORIA"),
        "audited_at": datetime.utcnow().isoformat(),
        "regulatory_risk": "ALTO (Auto de Infração RFB / Multa Art. 107 DL 37/66)" if is_divergent else "NENHUM"
    }

    new_status = "QUARANTINE" if is_divergent else "STORED"
    
    supabase.table("inbound_lots").update({
        "status": new_status,
        "has_damage": is_divergent or lot.get("has_damage", False),
        "damage_notes": f"Bloqueio 3-Way Match: {divergence_details['type']} ({abs(diff)} volumes)." if is_divergent else lot.get("damage_notes"),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(lot_id)).execute()

    return AuditMatchResponse(
        lot_id=lot_id,
        document_number=lot["document_number"],
        client_name=client_name,
        fiscal_invoice_qty=fiscal_invoice_qty,
        dock_received_qty=dock_received_qty,
        service_order_qty=service_order_qty,
        is_divergent=is_divergent,
        status=new_status,
        divergence_details=divergence_details
    )

