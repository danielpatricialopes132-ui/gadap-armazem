-- ============================================================================
-- PROJETO: GADAP Armazém (WMS Alfandegado & Geral)
-- SCRIPT MESTRE DE IMPLANTAÇÃO DDL & RLS (Etapas 01 a 05)
-- SUPABASE: qwihbotlqxpufqsbibvm.supabase.co
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função de extração do Tenant via JWT claims
CREATE OR REPLACE FUNCTION public.get_current_tenant()
RETURNS UUID AS $$
DECLARE
    claim_tenant TEXT;
BEGIN
    claim_tenant := COALESCE(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
        current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'company_id',
        current_setting('request.jwt.claims', true)::jsonb ->> 'company_id'
    );

    IF claim_tenant IS NULL OR claim_tenant = '' THEN
        RETURN NULL;
    END IF;

    RETURN claim_tenant::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 1. COMPANIES (Armazéns / Galpões / Recintos)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    bonded_warehouse_code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. USERS (Operadores, Conferentes, Fiscais, Backoffice e Admin)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('DOCA', 'BACKOFFICE', 'ADMIN', 'OPERADOR', 'CONFERENTE', 'SUPERVISOR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. CLIENTS (Donos da Carga / Depositantes / Importadores)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_clients_tenant_document UNIQUE (tenant_id, document)
);

-- 4. WAREHOUSE_POSITIONS (Mapa 3D do Galpão / Endereçamento Logístico)
CREATE TABLE IF NOT EXISTS public.warehouse_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    zone VARCHAR(50) NOT NULL,
    aisle VARCHAR(20) NOT NULL,
    rack VARCHAR(20) NOT NULL,
    level VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'EMPTY' CHECK (status IN ('EMPTY', 'OCCUPIED', 'RESERVED', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_warehouse_address UNIQUE (tenant_id, zone, aisle, rack, level)
);

-- 5. INBOUND_LOTS (Lotes de Entrada / Doca de Recebimento)
CREATE TABLE IF NOT EXISTS public.inbound_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    document_number VARCHAR(100) NOT NULL,
    expected_volumes INT NOT NULL DEFAULT 1 CHECK (expected_volumes > 0),
    received_volumes INT DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED' 
        CHECK (status IN ('SCHEDULED', 'IN_YARD', 'UNLOADING', 'QUARANTINE', 'STORED', 'COMPLETED', 'CANCELLED')),
    has_damage BOOLEAN NOT NULL DEFAULT FALSE,
    damage_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. WAREHOUSE_EXTRAS_BILLING (Faturamento Imediato de Serviços de Doca)
CREATE TABLE IF NOT EXISTS public.warehouse_extras_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    inbound_lot_id UUID NOT NULL REFERENCES public.inbound_lots(id) ON DELETE CASCADE,
    service_description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'BILLED', 'PAID', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. PRODUCTS (Catálogo de SKUs por Tenant / Depositante)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    description TEXT NOT NULL,
    ncm VARCHAR(10),
    unit_of_measure VARCHAR(10) NOT NULL DEFAULT 'UN',
    net_weight NUMERIC(12, 4) DEFAULT 0,
    gross_weight NUMERIC(12, 4) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_products_tenant_sku UNIQUE (tenant_id, client_id, sku)
);

-- 8. PALLETS_LPN (License Plate Numbers / Unidades de Carga)
CREATE TABLE IF NOT EXISTS public.pallets_lpn (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    lpn_code VARCHAR(100) NOT NULL,
    current_position_id UUID REFERENCES public.warehouse_positions(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'IN_RECEIVING' 
        CHECK (status IN ('IN_RECEIVING', 'STORED', 'IN_TRANSIT', 'PICKED', 'STAGED', 'SHIPPED', 'SCRAPPED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_pallets_lpn_code UNIQUE (tenant_id, lpn_code)
);

-- 9. INVENTORY (Estoque Detalhado)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    pallet_id UUID NOT NULL REFERENCES public.pallets_lpn(id) ON DELETE RESTRICT,
    position_id UUID REFERENCES public.warehouse_positions(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    inbound_lot_id UUID NOT NULL REFERENCES public.inbound_lots(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100),
    manufacturing_date DATE,
    expiration_date DATE,
    quantity_on_hand NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_inventory_reserved_le_on_hand CHECK (quantity_reserved <= quantity_on_hand)
);

-- 10. STOCK_MOVEMENTS (Ledger e Rastreabilidade)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    pallet_id UUID NOT NULL REFERENCES public.pallets_lpn(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    from_position_id UUID REFERENCES public.warehouse_positions(id) ON DELETE RESTRICT,
    to_position_id UUID REFERENCES public.warehouse_positions(id) ON DELETE RESTRICT,
    quantity NUMERIC(14, 4) NOT NULL CHECK (quantity > 0),
    movement_type VARCHAR(50) NOT NULL 
        CHECK (movement_type IN ('INBOUND_PUTAWAY', 'INTERNAL_TRANSFER', 'PICKING_REPLENISHMENT', 'OUTBOUND_DISPATCH', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')),
    operator_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 11. OUTBOUND_ORDERS (Ordens de Saída)
CREATE TABLE IF NOT EXISTS public.outbound_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    order_number VARCHAR(100) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_document VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' 
        CHECK (status IN ('CREATED', 'ALLOCATED', 'PICKING', 'CHECKOUT_READY', 'LOADED', 'SHIPPED', 'CANCELLED')),
    dock_number VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_outbound_orders_number UNIQUE (tenant_id, order_number)
);

-- 12. OUTBOUND_ORDER_ITEMS (Itens Requisitados)
CREATE TABLE IF NOT EXISTS public.outbound_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.outbound_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity_requested NUMERIC(14, 4) NOT NULL CHECK (quantity_requested > 0),
    quantity_picked NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_picked >= 0),
    quantity_checked NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantity_checked >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. PICKING_TASKS (Tarefas de Separação)
CREATE TABLE IF NOT EXISTS public.picking_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.outbound_orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.outbound_order_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    source_pallet_id UUID NOT NULL REFERENCES public.pallets_lpn(id) ON DELETE RESTRICT,
    source_position_id UUID NOT NULL REFERENCES public.warehouse_positions(id) ON DELETE RESTRICT,
    staging_position_id UUID REFERENCES public.warehouse_positions(id) ON DELETE RESTRICT,
    quantity_to_pick NUMERIC(14, 4) NOT NULL CHECK (quantity_to_pick > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    picked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 14. OUTBOUND_CHECKOUTS (Conferência Cega de Doca)
CREATE TABLE IF NOT EXISTS public.outbound_checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.outbound_orders(id) ON DELETE RESTRICT,
    barcode_scanned VARCHAR(100) NOT NULL,
    quantity_scanned NUMERIC(14, 4) NOT NULL DEFAULT 1 CHECK (quantity_scanned > 0),
    checker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    seal_number VARCHAR(100),
    vehicle_plate VARCHAR(20),
    driver_document VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- TRIGGER DE ATUALIZAÇÃO AUTOMÁTICA DE STATUS DE POSIÇÃO
CREATE OR REPLACE FUNCTION public.fn_sync_warehouse_position_status()
RETURNS TRIGGER AS $$
DECLARE
    v_occupied_count INT;
    v_target_pos UUID;
BEGIN
    FOR v_target_pos IN 
        SELECT DISTINCT p FROM unnest(ARRAY[OLD.current_position_id, NEW.current_position_id]) AS p WHERE p IS NOT NULL
    LOOP
        SELECT COUNT(*) INTO v_occupied_count
        FROM public.pallets_lpn
        WHERE current_position_id = v_target_pos
          AND status IN ('STORED', 'IN_RECEIVING');

        IF v_occupied_count > 0 THEN
            UPDATE public.warehouse_positions
            SET status = 'OCCUPIED'
            WHERE id = v_target_pos;
        ELSE
            UPDATE public.warehouse_positions
            SET status = 'EMPTY'
            WHERE id = v_target_pos;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_position_status ON public.pallets_lpn;
CREATE TRIGGER trg_sync_position_status
AFTER INSERT OR UPDATE OF current_position_id, status OR DELETE
ON public.pallets_lpn
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_warehouse_position_status();

-- RLS FORÇADO EM TODAS AS TABELAS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_positions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_lots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_extras_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_extras_billing FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pallets_lpn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallets_lpn FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.picking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_checkouts FORCE ROW LEVEL SECURITY;

-- POLÍTICAS RESTRICTIVE MULTI-TENANT
DROP POLICY IF EXISTS companies_isolation ON public.companies;
CREATE POLICY companies_isolation ON public.companies AS RESTRICTIVE FOR ALL
USING (id = public.get_current_tenant()) WITH CHECK (id = public.get_current_tenant());

DROP POLICY IF EXISTS users_isolation ON public.users;
CREATE POLICY users_isolation ON public.users AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS clients_isolation ON public.clients;
CREATE POLICY clients_isolation ON public.clients AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS warehouse_positions_isolation ON public.warehouse_positions;
CREATE POLICY warehouse_positions_isolation ON public.warehouse_positions AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS inbound_lots_isolation ON public.inbound_lots;
CREATE POLICY inbound_lots_isolation ON public.inbound_lots AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS extras_billing_isolation ON public.warehouse_extras_billing;
CREATE POLICY extras_billing_isolation ON public.warehouse_extras_billing AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS products_isolation ON public.products;
CREATE POLICY products_isolation ON public.products AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS pallets_lpn_isolation ON public.pallets_lpn;
CREATE POLICY pallets_lpn_isolation ON public.pallets_lpn AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS inventory_isolation ON public.inventory;
CREATE POLICY inventory_isolation ON public.inventory AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS stock_movements_isolation ON public.stock_movements;
CREATE POLICY stock_movements_isolation ON public.stock_movements AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS outbound_orders_isolation ON public.outbound_orders;
CREATE POLICY outbound_orders_isolation ON public.outbound_orders AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS outbound_order_items_isolation ON public.outbound_order_items;
CREATE POLICY outbound_order_items_isolation ON public.outbound_order_items AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS picking_tasks_isolation ON public.picking_tasks;
CREATE POLICY picking_tasks_isolation ON public.picking_tasks AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

DROP POLICY IF EXISTS outbound_checkouts_isolation ON public.outbound_checkouts;
CREATE POLICY outbound_checkouts_isolation ON public.outbound_checkouts AS RESTRICTIVE FOR ALL
USING (tenant_id = public.get_current_tenant()) WITH CHECK (tenant_id = public.get_current_tenant());

