"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCw, 
  Search, 
  Building2,
  HelpCircle
} from "lucide-react";

interface AuditLot {
  id: string;
  document_number: string;
  client_name: string;
  fiscal_qty: number;
  dock_qty: number;
  expected_qty: number;
  status: "QUARANTINE" | "STORED" | "UNLOADING" | "SCHEDULED";
  divergence_type: string;
  updated_at: string;
}

export default function AuditoriaAduaneiraPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [auditingId, setAuditingId] = useState<string | null>(null);

  const [lots, setLots] = useState<AuditLot[]>([
    {
      id: "a1b2c3d4-1111-4444-8888-000000000001",
      document_number: "DI-24/0987654-1",
      client_name: "Samsung Eletrônica da Amazônia",
      fiscal_qty: 120,
      dock_qty: 118,
      expected_qty: 120,
      status: "QUARANTINE",
      divergence_type: "FALTA (-2 volumes)",
      updated_at: "10 min atrás"
    },
    {
      id: "b2c3d4e5-2222-4444-8888-000000000002",
      document_number: "NF-0049281-B",
      client_name: "Huawei do Brasil Telecomunicações",
      fiscal_qty: 45,
      dock_qty: 45,
      expected_qty: 45,
      status: "STORED",
      divergence_type: "CONFORME",
      updated_at: "35 min atrás"
    },
    {
      id: "c3d4e5f6-3333-4444-8888-000000000003",
      document_number: "DI-24/1102938-9",
      client_name: "Bayer CropScience S/A",
      fiscal_qty: 80,
      dock_qty: 84,
      expected_qty: 80,
      status: "QUARANTINE",
      divergence_type: "SOBRA (+4 volumes)",
      updated_at: "1 hora atrás"
    }
  ]);

  const handleRunAudit = async (lotId: string) => {
    setAuditingId(lotId);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/logistics/audit/match/${lotId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_token"
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao auditar lote");

      setLots((prev) =>
        prev.map((l) =>
          l.id === lotId
            ? {
                ...l,
                status: data.status,
                divergence_type: data.divergence_details.type,
                updated_at: "Agora"
              }
            : l
        )
      );
      alert(data.is_divergent ? "Divergência detectada! Lote retido em Quarentena Fiscal." : "Lote 100% Conforme.");
    } catch (err: any) {
      alert("Falha na auditoria: " + err.message);
    } finally {
      setAuditingId(null);
    }
  };

  const filteredLots = lots.filter(
    (l) =>
      l.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const quarantineCount = lots.filter((l) => l.status === "QUARANTINE").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Auditoria Aduaneira • 3-Way Match
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Cruzamento automatizado: Declaração de Importação / NF vs. Conferência de Doca vs. Ordem de Serviço
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-5 py-3 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase">Lotes em Quarentena:</span>
          </div>
          <span className="text-2xl font-black text-rose-500">{quarantineCount}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar por DI, NF ou Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Documento / Cliente</th>
                
                {/* 1ª Via Tooltip */}
                <th className="py-4 px-4 text-center">
                  <div className="inline-flex items-center gap-1 group relative cursor-help">
                    <span>1ª Via: NF / DI</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded-lg shadow-2xl z-30 font-normal normal-case">
                      Origem: Documento fiscal ou DI oficial registrado no SISCOMEX/ERP pelo importador.
                    </div>
                  </div>
                </th>

                {/* 2ª Via Tooltip */}
                <th className="py-4 px-4 text-center">
                  <div className="inline-flex items-center gap-1 group relative cursor-help">
                    <span>2ª Via: Recebido Doca</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded-lg shadow-2xl z-30 font-normal normal-case">
                      Origem: Quantidade física contada pelo operador no coletor/PWA de doca no momento da descarga.
                    </div>
                  </div>
                </th>

                {/* 3ª Via Tooltip */}
                <th className="py-4 px-4 text-center">
                  <div className="inline-flex items-center gap-1 group relative cursor-help">
                    <span>3ª Via: Esperado OS</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded-lg shadow-2xl z-30 font-normal normal-case">
                      Origem: Contrato logístico formalizado na Ordem de Serviço ou booking de agendamento de pátio.
                    </div>
                  </div>
                </th>

                <th className="py-4 px-6 text-center">Diagnóstico</th>
                <th className="py-4 px-6 text-center">Status Aduaneiro</th>
                <th className="py-4 px-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredLots.map((lot) => {
                const isQuarantine = lot.status === "QUARANTINE";
                return (
                  <tr
                    key={lot.id}
                    className={`transition-colors ${
                      isQuarantine ? "bg-rose-950/20 hover:bg-rose-950/30" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="font-mono font-bold text-white text-base">{lot.document_number}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {lot.client_name}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="font-mono font-bold text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
                        {lot.fiscal_qty} vol
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span
                        className={`font-mono font-black px-3 py-1 rounded-lg border ${
                          lot.dock_qty !== lot.fiscal_qty
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        }`}
                      >
                        {lot.dock_qty} vol
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="font-mono font-bold text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
                        {lot.expected_qty} vol
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                          isQuarantine
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isQuarantine ? <AlertOctagon className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {lot.divergence_type}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      {isQuarantine ? (
                        <div className="inline-block bg-rose-600 text-white font-black text-[11px] px-3 py-1 rounded shadow-md tracking-wider uppercase">
                          QUARENTENA FISCAL
                        </div>
                      ) : (
                        <div className="inline-block bg-slate-800 text-slate-300 font-bold text-[11px] px-3 py-1 rounded uppercase">
                          LIBERADO / ESTOCADO
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleRunAudit(lot.id)}
                        disabled={auditingId === lot.id}
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${auditingId === lot.id ? "animate-spin text-rose-500" : ""}`} />
                        Reauditar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
