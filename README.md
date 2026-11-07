# GADAP Armazém - WMS Alfandegado & Multi-tenant

Sistema completo de WMS (Warehouse Management System) desenhado para operações de armazéns gerais e recintos alfandegados (portos secos, CLIA, EADI).

## 📍 Status do Roadmap
- [X] **PROMPT 01:** Fundação Multi-tenant e Core Operacional Logístico (DDL Idempotente + RLS)
- [X] **PROMPT 02:** WMS Execution Engine & Rastreabilidade de Estoque (LPN/Paletes, SKU, Movimentações e Triggers)
- [X] **PROMPT 03:** PWA Operacional de Doca & Faturamento de Extras Spot (FastAPI + Next.js Mobile-First)
- [X] **PROMPT 04:** Motor de Expedição (Outbound, Ordens de Picking, Conferência Cega e Packing List)
- [X] **PROMPT 05:** Smart Scheduling com IA (WhatsApp Parser) & Blindagem Aduaneira (3-Way Match Logístico)
- [ ] **PROMPT 06:** Módulo de Cobrança e Armazenagem Alfandegada (Demurrage, Tarifas Pro-Rata e Faturamento)

---

## 🏗 Arquitetura do Sistema

```
gadap_wms/
├── supabase/
│   └── migrations/
│       └── 20241107_master_init.sql       # Script DDL completo de todas as tabelas, RLS e triggers
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── inbound.py             # Doca de Entrada, Laudo PDF de Avaria (Zero-Storage), Extras
│   │   │   │   ├── outbound.py            # Picking, Conferência Cega e Packing List
│   │   │   │   └── scheduling_audit.py    # LLM Parser WhatsApp e 3-Way Match
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── auth.py                    # Extração Multi-tenant via JWT
│   │   │   └── supabase_client.py         # Cliente Supabase
│   │   └── main.py                        # FastAPI Server
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── doca/
    │   │   ├── recebimento/page.tsx       # PWA Mobile Doca (Câmera Nativa Zero-Storage + Faturamento Extra)
    │   │   └── expedicao/page.tsx         # PWA Doca de Expedição (Leitor de Barras + Romaneio)
    │   └── dashboard/
    │       ├── auditoria/page.tsx         # Auditoria Aduaneira Desktop (3-Way Match e Quarentena)
    │       └── scheduling/page.tsx        # Smart Scheduling via IA WhatsApp Parser
    ├── package.json
    └── tailwind.config.js
```

---

## 🚀 Como Executar

### 1. Banco de Dados (Supabase)
Execute o script `supabase/migrations/20241107_master_init.sql` no **SQL Editor** do Supabase Dashboard.

### 2. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Swagger UI disponível em: `http://localhost:8000/docs`

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Aplicação disponível em: `http://localhost:3000`
- Doca Recebimento: `http://localhost:3000/doca/recebimento`
- Doca Expedição: `http://localhost:3000/doca/expedicao`
- Auditoria 3-Way Match: `http://localhost:3000/dashboard/auditoria`
- Smart Scheduling: `http://localhost:3000/dashboard/scheduling`

