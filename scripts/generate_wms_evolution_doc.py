import os
from datetime import datetime

DOC_CONTENT = f"""# GADAP Armazém - Documento de Evolução WMS & Core Aduaneiro
**Gerado em:** {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}  
**Versão:** 2.0.0-WMS  
**Status do Projeto:** Homologado / Doca, Expedição, IA Scheduling e Blindagem Aduaneira

---

## 1. Visão Geral da Arquitetura Logística

O sistema **GADAP Armazém** opera como uma plataforma WMS (Warehouse Management System) Multi-tenant, com suporte completo a Recintos Alfandegados (EADI, CLIAs, Portos Secos) e Centros de Distribuição Gerais. O isolamento de dados é estrito por Armazém/Galpão através de Row Level Security (RLS) no PostgreSQL/Supabase, acionado pela função `public.get_current_tenant()`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA GADAP WMS                           │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│    PWA DE CAMPO     │      BACKEND FASTAPI     │    SUPABASE DB + RLS  │
│  (Mobile-First)     │       (Microsserviço)    │     (PostgreSQL)      │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ • Doca Recebimento  │ • Inbound & Zero-Storage │ • Isolamento Tenant   │
│ • Câmera Avarias    │ • Extras Billing Spot    │ • Mapa 3D Posições    │
│ • Expedição Cega    │ • LLM Smart Scheduling   │ • Ledger Movimentação │
│ • Academy Treinamento│ • 3-Way Match Aduaneiro │ • Triggers de Ocupação│
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 2. Dicionário de Dados do Core Logístico

| Tabela | Responsabilidade Primária | Regra de Segurança / RLS |
| :--- | :--- | :--- |
| `companies` | Tenants / Galpões / Recintos Alfandegados | `id = public.get_current_tenant()` |
| `users` | Operadores de Doca, Conferentes, Backoffice | `tenant_id = public.get_current_tenant()` |
| `clients` | Depositantes / Importadores / Donos da Carga | `tenant_id = public.get_current_tenant()` |
| `warehouse_positions` | Mapa 3D (Zone, Aisle, Rack, Level) com status de ocupação | `tenant_id = public.get_current_tenant()` |
| `inbound_lots` | Lotes de entrada, DI/NF, volumes previstos e contados | `tenant_id = public.get_current_tenant()` |
| `warehouse_extras_billing` | Faturamento imediato de serviços spot na doca | `tenant_id = public.get_current_tenant()` |
| `pallets_lpn` | Unidades de carga com código GS1/SSCC e posição atual | `tenant_id = public.get_current_tenant()` |
| `inventory` | Saldo detalhado por lote, validade (FEFO) e reservas | `tenant_id = public.get_current_tenant()` |
| `stock_movements` | Ledger imutável de transferências, putaway e picking | `tenant_id = public.get_current_tenant()` |
| `outbound_orders` | Ordens de expedição e carregamento | `tenant_id = public.get_current_tenant()` |
| `picking_tasks` | Tarefas de separação de mercadoria | `tenant_id = public.get_current_tenant()` |
| `outbound_checkouts` | Registro de conferência cega e lacres de portaria | `tenant_id = public.get_current_tenant()` |

---

## 3. Regra de Negócio: Blindagem Aduaneira (3-Way Match)

A blindagem fiscal e aduaneira visa impedir autuações da Receita Federal com base no **Art. 107 do Decreto-Lei 37/66**. O algoritmo cruza três vias obrigatórias:
1. **1ª Via (Fiscal/Documental):** Declaração de Importação (DI) ou Nota Fiscal de Entrada.
2. **2ª Via (Conferência Física):** Quantidade real aferida na doca pelo coletor de dados.
3. **3ª Via (Ordem de Serviço):** Quantidade formalizada no agendamento/booking de pátio.

### Política de Quarentena Fiscal
- **Conforme:** Se `Via 1 == Via 2 == Via 3`, o lote segue automaticamente para armazenamento e putaway (`STORED`).
- **Divergente (Falta ou Sobra):** Se houver discrepância quantitativa, o lote transiciona imediatamente para o estado `QUARANTINE`.
- **Bloqueio Físico no WMS:** Fica estritamente vetada qualquer movimentação para porta-paletes ou picking até emissão de retificação da DI ou laudo conjunto de vistoria aduaneira.

---

## 4. Smart Scheduling com Inteligência Artificial

O Smart Scheduling utiliza LLM para processamento de linguagem natural focado em mensagens informais de motoristas e despachantes aduaneiros (WhatsApp / E-mail / Transcrição de OCR):
- **Extração Semântica:** Identifica transportadora, número do documento, horário de previsão (resolvendo datas relativas) e quantidade de volumes.
- **Dimensionamento Logístico:** Define o tempo necessário de operação e aloca docas especializadas (ex: Doca Pesada para containers e volumes > 50, ou Doca Climatizada para perecíveis/refrigerados).
- **Resiliência:** Mecanismo de fallback por regex/NLP garante triagem mesmo em oscilações do serviço externo de IA.

---

## 5. Diretrizes do PWA de Doca (Zero-Storage)

Para preservar a privacidade e otimizar custos de infraestrutura:
- A captura de avarias opera na câmera traseira nativa (`capture="environment"`).
- A imagem é processada e codificada em Base64 no cliente.
- O backend compila instantaneamente o **Laudo Técnico de Avaria** em PDF através de buffers em memória (`io.BytesIO`) e envia o documento para download/impressão.
- Nenhum arquivo de imagem é persistido em buckets ou no sistema de arquivos local.
"""

def generate_doc():
    target_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "GADAP_WMS_Evolution.md"))
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(DOC_CONTENT)
    print(f"Documento gerado com sucesso em: {target_path}")

if __name__ == "__main__":
    generate_doc()

