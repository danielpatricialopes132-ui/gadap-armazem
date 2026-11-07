"use client";

import React, { useState } from "react";
import { 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Container, 
  Calculator, 
  CheckCircle2, 
  FileSpreadsheet,
  Building2
} from "lucide-react";

export default function BillingDemurragePage() {
  const [cifValue, setCifValue] = useState<number>(450000.00);
  const [daysStored, setDaysStored] = useState<number>(24);
  const [grossWeight, setGrossWeight] = useState<number>(14.5);
  const [storageCalculation, setStorageCalculation] = useState<any>(null);

  const [overdueContainers] = useState([
    {
      container_number: "MSCU7821901",
      shipping_line: "MSC Mediterranean",
      client_name: "Samsung Eletrônica da Amazônia",
      deadline: "02/11/2026",
      overdue_days: 5,
      currency: "USD",
      demurrage_due: 600.00
    },
    {
      container_number: "MAEU4419208",
      shipping_line: "Maersk Line",
      client_name: "Huawei do Brasil Telecomunicações",
      deadline: "30/10/2026",
      overdue_days: 8,
      currency: "USD",
      demurrage_due: 960.00
    }
  ]);

  const handleSimulateStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/api/v1/logistics/billing/storage/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_token"
        },
        body: JSON.stringify({
          inbound_lot_id: "a1b2c3d4-0000-0000-0000-000000000001",
          cif_value: cifValue,
          days_stored: daysStored,
          gross_weight_ton: grossWeight
        })
      });
      const data = await res.json();
      setStorageCalculation(data);
    } catch (err: any) {
      alert("Erro no cálculo: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">
              Tarifação Alfandegada & Demurrage
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Apuração pro-rata de armazenagem decendial, Ad Valorem CIF e controle de sobreestadia de containers
          </p>
        </div>
      </header>

      {/* Grid: Simulador de Armazenagem + Alerta Demurrage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel 1: Simulador de Armazenagem Recinto */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Simulador de Armazenagem & Ad Valorem
          </h2>

          <form onSubmit={handleSimulateStorage} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">VALOR CIF DA CARGA (R$)</label>
              <input
                type="number"
                step="0.01"
                value={cifValue}
                onChange={(e) => setCifValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">DIAS NO ARMAZÉM</label>
                <input
                  type="number"
                  value={daysStored}
                  onChange={(e) => setDaysStored(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">PESO BRUTO (TON)</label>
                <input
                  type="number"
                  step="0.1"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-lg text-xs tracking-wider uppercase transition-all"
            >
              CALCULAR PERÍODOS DE ARMAZENAGEM
            </button>
          </form>

          {storageCalculation && (
            <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Períodos Decendiais Faturáveis:</span>
                <span className="font-bold text-white">{storageCalculation.billable_periods} período(s)</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Tarifa de Armazenagem Ad Valorem:</span>
                <span className="font-bold text-white">R$ {storageCalculation.storage_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Movimentação (Handling In/Out):</span>
                <span className="font-bold text-white">R$ {storageCalculation.handling_fee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black text-emerald-400">
                <span>TOTAL ESTIMADO:</span>
                <span className="text-lg">R$ {storageCalculation.total_estimated.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Painel 2: Controle Crítico de Demurrage */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Containers em Risco / Demurrage
            </h2>
            <span className="text-xs bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full font-bold border border-rose-500/30">
              {overdueContainers.length} Vencidos
            </span>
          </div>

          <div className="space-y-3">
            {overdueContainers.map((c, i) => (
              <div key={i} className="p-3.5 bg-slate-950 border border-rose-500/40 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-black text-sm text-white">{c.container_number}</span>
                    <p className="text-[11px] text-slate-400">{c.shipping_line} • {c.client_name}</p>
                  </div>
                  <span className="text-xs bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-700">
                    +{c.overdue_days} dias atraso
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Sobreestadia acumulada:</span>
                  <span className="font-mono font-black text-rose-400 text-sm">
                    {c.currency} ${c.demurrage_due.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

