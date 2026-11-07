"use client";

import React, { useState } from "react";
import { Sparkles, MessageSquare, Clock, Warehouse, CheckCircle } from "lucide-react";

export default function SmartSchedulingPage() {
  const [whatsappText, setWhatsappText] = useState(
    "Opa amigo bom dia, aqui é o Valdir da TransVale. Tamo chegando aí amanhã por volta das 14h com a carreta de Container DI 24/0987654-1 com 80 paletes de peças de reposição. Consegue liberar uma doca pra desova rápida?"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleParse = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/logistics/scheduling/parse-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_token"
        },
        body: JSON.stringify({
          message_text: whatsappText
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao processar mensagem");
      setResult(data);
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <header className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-amber-400" />
          <h1 className="text-2xl font-black text-white uppercase">Smart Scheduling • WhatsApp Parser (IA)</h1>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Extração automática de intenções de motoristas e despachantes com alocação inteligente de docas
        </p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          Mensagem Bruta Recebida (WhatsApp / E-mail / Transcrição OCR):
        </label>
        <textarea
          rows={4}
          value={whatsappText}
          onChange={(e) => setWhatsappText(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
        />

        <button
          onClick={handleParse}
          disabled={isLoading}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          {isLoading ? "Processando IA..." : "ANALISAR MENSAGEM & SUGERIR SLOT"}
        </button>
      </div>

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle className="w-5 h-5" />
            Extração Concluída com Confiança: {(result.confidence_score * 100).toFixed(0)}%
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block uppercase">Transportadora</span>
              <span className="text-base font-bold text-white">{result.carrier_name || "Identificada no texto"}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block uppercase">Documento / DI</span>
              <span className="text-base font-mono font-bold text-amber-400">{result.document_number}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block uppercase">Volumes Estimados</span>
              <span className="text-base font-bold text-white">{result.expected_volumes} volumes ({result.cargo_type})</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <span className="text-xs text-emerald-400 block uppercase font-bold flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5" /> Doca Sugerida
              </span>
              <span className="text-base font-black text-white">{result.suggested_dock}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 flex items-center gap-3">
            <Clock className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Janela / Slot Recomendado</p>
              <p className="text-base font-bold text-cyan-300">{result.suggested_time_slot}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

