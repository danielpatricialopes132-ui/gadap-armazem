"use client";

import React, { useState, useRef } from "react";
import { 
  Camera, 
  AlertTriangle, 
  PlusCircle, 
  CheckCircle, 
  Package, 
  DollarSign, 
  X, 
  HelpCircle,
  Info
} from "lucide-react";

export default function DocaRecebimentoPage() {
  const [inboundLotId] = useState("a1b2c3d4-0000-0000-0000-000000000001");
  const [clientId] = useState("b2c3d4e5-0000-0000-0000-000000000002");
  const [documentNumber] = useState("DI-24/0987654-1");
  const [receivedVolumes, setReceivedVolumes] = useState<number>(24);
  const [hasDamage, setHasDamage] = useState(false);
  const [damageNotes, setDamageNotes] = useState("");
  const [damagePhotoBase64, setDamagePhotoBase64] = useState<string | null>(null);

  // Modal Extras
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [serviceDescription, setServiceDescription] = useState("Paletização PBR c/ Filme Stretch");
  const [extraAmount, setExtraAmount] = useState<number>(180.00);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [extraSuccessMsg, setExtraSuccessMsg] = useState<string | null>(null);

  // Modal Ajuda Contextual Flutuante
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDamagePhotoBase64(reader.result as string);
        setHasDamage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmReceipt = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/logistics/inbound/receive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_token"
        },
        body: JSON.stringify({
          inbound_lot_id: inboundLotId,
          received_volumes: receivedVolumes,
          has_damage: hasDamage,
          damage_notes: damageNotes,
          damage_photo_base64: damagePhotoBase64
        })
      });

      if (!response.ok) throw new Error("Falha no registro da doca");

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        alert("Recebimento concluído com sucesso na doca!");
      }
    } catch (err: any) {
      alert("Erro na operação: " + err.message);
    }
  };

  const handleChargeExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBillingLoading(true);
    setExtraSuccessMsg(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/logistics/extras/bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer mock_token"
        },
        body: JSON.stringify({
          inbound_lot_id: inboundLotId,
          client_id: clientId,
          service_description: serviceDescription,
          amount: extraAmount
        })
      });
      if (!res.ok) throw new Error("Falha ao lançar extra");
      setExtraSuccessMsg("Serviço lançado para faturamento com sucesso!");
      setTimeout(() => {
        setIsExtraModalOpen(false);
        setExtraSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert("Erro ao faturar extra: " + err.message);
    } finally {
      setIsBillingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto border-x border-slate-800 shadow-2xl relative">
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-400" />
          <h1 className="font-bold text-lg tracking-wide uppercase">Doca 02 • Entrada</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 transition-colors"
            title="Ajuda e Instruções"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 font-medium">
            Ao Vivo
          </span>
        </div>
      </header>

      <main className="p-4 flex-1 space-y-4 overflow-y-auto pb-20">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider">DOCUMENTO / DI</p>
              <p className="text-xl font-black text-white">{documentNumber}</p>
            </div>
            <button
              onClick={() => setIsExtraModalOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-lg font-bold active:scale-95 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              Lançar Serviço Extra
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">
              VOLUMES FÍSICOS CONFERIDOS
            </label>
            <input
              type="number"
              value={receivedVolumes}
              onChange={(e) => setReceivedVolumes(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-2xl font-black text-center text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${hasDamage ? "text-rose-500" : "text-slate-500"}`} />
              Registro de Avaria na Carga
            </h2>
            <input
              type="checkbox"
              checked={hasDamage}
              onChange={(e) => setHasDamage(e.target.checked)}
              className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
            />
          </div>

          {hasDamage && (
            <div className="space-y-3 pt-2">
              <textarea
                placeholder="Descreva a avaria (ex: Palete quebrado, embalagem molhada...)"
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
              />

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {damagePhotoBase64 ? (
                <div className="relative rounded-lg overflow-hidden border border-rose-500/50">
                  <img src={damagePhotoBase64} alt="Foto da Avaria" className="w-full h-44 object-cover" />
                  <button
                    onClick={() => setDamagePhotoBase64(null)}
                    className="absolute top-2 right-2 bg-slate-950/80 p-1.5 rounded-full text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="bg-slate-900/90 text-center text-[10px] text-slate-400 py-1">
                    Foto em memória (Zero-Storage). Será gerado PDF e descartada.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-rose-500/40 rounded-xl flex flex-col items-center justify-center gap-2 text-rose-400 bg-rose-500/5 active:bg-rose-500/10 transition-colors"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Fotografar Avaria (Câmera)</span>
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Botão Flutuante de Ajuda Contextual */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-24 right-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold p-3.5 rounded-full shadow-2xl z-30 flex items-center justify-center border-2 border-cyan-300"
        aria-label="Ajuda do PWA"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      <footer className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
        <button
          onClick={handleConfirmReceipt}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
        >
          <CheckCircle className="w-5 h-5" />
          CONFIRMAR RECEBIMENTO
        </button>
      </footer>

      {/* Modal Ajuda Contextual */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-cyan-500/40 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm flex items-center gap-2 text-cyan-400 uppercase">
                <Info className="w-4 h-4" />
                Instruções Rápidas da Doca
              </h3>
              <button onClick={() => setIsHelpOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">Cobrança de Serviços Extras Spot:</span>
                Sempre que a mercadoria exigir mão de obra extra não prevista (ex: desova manual de container, troca de palete ou stretch), clique no botão <b>Lançar Serviço Extra</b> para registrar o custo diretamente na fatura do cliente.
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">Registro de Avarias (Zero-Storage):</span>
                Fotos tiradas pela câmera traseira são processadas em memória e anexadas ao Laudo PDF para ressalva imediata com a transportadora.
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">Validação das 3 Vias:</span>
                A contagem digitada será confrontada com a Nota/DI. Divergências de sobra ou falta enviarão a carga automaticamente para Quarentena Fiscal.
              </div>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Faturamento de Extras */}
      {isExtraModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2 text-amber-400">
                <DollarSign className="w-5 h-5" />
                Cobrar Serviço Extra
              </h3>
              <button onClick={() => setIsExtraModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChargeExtra} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Tipo de Serviço Extra</label>
                <select
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Paletização PBR c/ Filme Stretch">Paletização PBR c/ Filme Stretch</option>
                  <option value="Desova Manual de Container">Desova Manual de Container</option>
                  <option value="Etiquetagem EAN/Alfandegária">Etiquetagem EAN / Alfandegária</option>
                  <option value="Troca de Palete Avariado">Troca de Palete Avariado</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Valor do Serviço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {extraSuccessMsg && (
                <p className="text-xs text-emerald-400 font-semibold text-center">{extraSuccessMsg}</p>
              )}

              <button
                type="submit"
                disabled={isBillingLoading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-lg text-sm active:scale-98 transition-all"
              >
                {isBillingLoading ? "Processando..." : "LANÇAR NO FATURAMENTO"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
