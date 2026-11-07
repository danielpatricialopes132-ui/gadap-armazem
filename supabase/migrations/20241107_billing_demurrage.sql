-- ============================================================================
-- PROJETO: GADAP Armazém (WMS Alfandegado & Geral)
-- ETAPA 07: Tarifação Aduaneira, Armazenagem Periódica & Demurrage
-- ============================================================================

-- 1. TABELA: BILLING_TABLES (Tabelas de Preços e Períodos de Armazenagem)
CREATE TABLE IF NOT EXISTS public.billing_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, -- NULL = Tabela Geral Padrão
    name VARCHAR(150) NOT NULL,
    free_days INT NOT NULL DEFAULT 7, -- Franquia de dias livres (Free Time de Armazenagem)
    period_days INT NOT NULL DEFAULT 10, -- Período de apuração (Decêndio = 10 dias, Quinzena = 15 dias)
    ad_valorem_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0050, -- % Ad Valorem sobre o valor CIF da mercadoria
    min_storage_fee NUMERIC(12, 2) NOT NULL DEFAULT 150.00,
    handling_in_rate NUMERIC(10, 4) NOT NULL DEFAULT 25.00, -- Movimentação de Entrada por Tonelada ou Volume
    handling_out_rate NUMERIC(10, 4) NOT NULL DEFAULT 25.00, -- Movimentação de Saída por Tonelada ou Volume
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. TABELA: CONTAINER_DEMURRAGE (Controle de Free Time de Containers)
CREATE TABLE IF NOT EXISTS public.container_demurrage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    container_number VARCHAR(11) NOT NULL, -- Padrão ISO 6346 (ex: MSCU1234567)
    shipping_line VARCHAR(100) NOT NULL, -- Armador (ex: Maersk, MSC, Hapag-Lloyd, CMA CGM)
    gate_in_date TIMESTAMPTZ NOT NULL,
    free_time_days INT NOT NULL DEFAULT 14,
    free_time_deadline TIMESTAMPTZ NOT NULL,
    gate_out_empty_date TIMESTAMPTZ, -- Data da devolução do vazio no porto/depot
    daily_demurrage_rate NUMERIC(10, 2) NOT NULL DEFAULT 120.00, -- Tarifa diária de sobreestadia (USD ou BRL)
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(30) NOT NULL DEFAULT 'FREE_TIME' 
        CHECK (status IN ('FREE_TIME', 'OVERDUE_DEMURRAGE', 'RETURNED_EMPTY', 'WAIVED')),
    total_demurrage_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. TABELA: STORAGE_INVOICES (Faturas Consolidadas de Armazenagem e Recinto)
CREATE TABLE IF NOT EXISTS public.storage_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    inbound_lot_id UUID REFERENCES public.inbound_lots(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    storage_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    handling_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    extras_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    demurrage_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'EMITTED', 'PAID', 'CANCELLED')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- RLS
ALTER TABLE public.billing_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_tables FORCE ROW LEVEL SECURITY;

ALTER TABLE public.container_demurrage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_demurrage FORCE ROW LEVEL SECURITY;

ALTER TABLE public.storage_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_invoices FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_tables_isolation ON public.billing_tables;
CREATE POLICY billing_tables_isolation ON public.billing_tables AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS container_demurrage_isolation ON public.container_demurrage;
CREATE POLICY container_demurrage_isolation ON public.container_demurrage AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS storage_invoices_isolation ON public.storage_invoices;
CREATE POLICY storage_invoices_isolation ON public.storage_invoices AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

