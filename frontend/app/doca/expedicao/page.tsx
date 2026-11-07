"use client";

import React, { useState } from "react";
import { Truck, Barcode, CheckSquare, FileText, AlertCircle, ShieldCheck } from "lucide-react";

interface CheckedSummary {
  product: string;
  quantity_checked: number;
  quantity_requested: number;
  is_item_completed: boolean;
}

export default function DocaExpedicaoPage() {
  const [orderId] = useState("c3d4e5f6-0000-0000-0000-000000000003");
  const [orderNumber] = useState("EXP-2024-8891");
  const [destination] = useState("Terminal Portuário Santos / Armazém 14");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("BRA2E19");
  const [sealNumber, setSealNumber] = useState("SANTOS-77129");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [lastCheck, setLastCheck] = useState<CheckedSummary | null>(null);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    setStatusMessage("Validando código...");
    setIsError(false);

    try {
      const res = await fetch("http://localhost:8000/api/v1/logistics/outbound/checkout/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_token"
        },
        body: JSON.stringify({
          order_id: orderId,
          barcode_scanned: scannedBarcode.trim(),
          quantity: 1,
          vehicle_plate: vehiclePlate,
          seal_number: sealNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao bipar item");

      setLastCheck(data);
      setStatusMessage(`Item conferido: ${data.product}`);
      setScannedBarcode("");
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err.message);
    }
  };

  const handleOpenPackingList = () => {
    window.open(`http://localhost:8000/api/v1/logistics/outbound/orders/${orderId}/packing-list`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto border-x border-slate-800 shadow-2xl">
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6 text-cyan-400" />
          <h1 className="font-bold text-lg tracking-wide uppercase">Doca 04 • Expedição</h1>
        </div>
        <button
          onClick={handleOpenPackingList}
          className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg font-bold"
        >
          <FileText className="w-3.5 h-3.5" />
          Romaneio
        </button>
      </header>

      <main className="p-4 flex-1 space-y-4 overflow-y-auto">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>ORDEM DE SAÍDA</span>
            <span className="font-mono text-cyan-400 font-bold">{orderNumber}</span>
          </div>
          <p className="text-sm font-semibold text-white">{destination}</p>
          <div className="flex gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex-1">
              <label className="text-[10px] text-slate-400 block uppercase">Placa do Veículo</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs font-mono font-bold uppercase text-slate-200"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-400 block uppercase">Lacre Recinto</label>
              <input
                type="text"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs font-mono font-bold uppercase text-slate-200"
              />
            </div>
          </div>
        </section>

        <form onSubmit={handleScanSubmit} className="space-y-3">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Barcode className="w-4 h-4 text-cyan-400" />
            CONFERÊNCIA CEGA (BIPE O CÓDIGO DO PRODUTO / LPN)
          </label>
          <input
            type="text"
            placeholder="Aguardando Leitor de Barras..."
            value={scannedBarcode}
            onChange={(e) => setScannedBarcode(e.target.value)}
            className="w-full bg-slate-900 border-2 border-cyan-500/50 rounded-xl p-4 text-lg font-mono font-bold text-white tracking-widest focus:outline-none focus:border-cyan-400"
          />
        </form>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-bold ${
              isError
                ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                : "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
            }`}
          >
            {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckSquare className="w-5 h-5 flex-shrink-0" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {lastCheck && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-slate-400 uppercase font-semibold">Último Item Bipado</p>
            <p className="text-sm font-bold text-white">{lastCheck.product}</p>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Progresso do Item:</span>
              <span className="font-mono font-bold text-emerald-400">
                {lastCheck.quantity_checked} / {lastCheck.quantity_requested}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full ${lastCheck.is_item_completed ? "bg-emerald-500" : "bg-cyan-500"}`}
                style={{
                  width: `${Math.min(100, (lastCheck.quantity_checked / lastCheck.quantity_requested) * 100)}%`
                }}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
        <button
          onClick={handleOpenPackingList}
          className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all"
        >
          <ShieldCheck className="w-5 h-5" />
          LIBERAR VEÍCULO & GERAR ROMANEIO
        </button>
      </footer>
    </div>
  );
}

