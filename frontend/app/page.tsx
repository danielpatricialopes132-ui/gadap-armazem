import Link from "next/link";
import { Package, ShieldAlert, Truck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="border-b border-slate-800 pb-6 text-center">
        <h1 className="text-3xl font-black text-white uppercase tracking-wider">
          GADAP Armazém • WMS
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Plataforma Logística Multi-tenant, PWA de Doca e Blindagem Aduaneira
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/doca/recebimento"
          className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-2xl space-y-3 transition-all hover:scale-[1.02] block"
        >
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Doca • Recebimento (PWA)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Conferência física mobile, registro de avarias via câmera nativa (Zero-Storage) e faturamento de extras spot.
          </p>
        </Link>

        <Link
          href="/doca/expedicao"
          className="p-6 bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-2xl space-y-3 transition-all hover:scale-[1.02] block"
        >
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Doca • Expedição & Checkout</h2>
          </div>
          <p className="text-xs text-slate-400">
            Conferência cega por leitor de código de barras, separação de picking e emissão de Packing List oficial.
          </p>
        </Link>

        <Link
          href="/dashboard/auditoria"
          className="p-6 bg-slate-900 border border-slate-800 hover:border-rose-500 rounded-2xl space-y-3 transition-all hover:scale-[1.02] block"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            <h2 className="text-lg font-bold text-white">Auditoria Aduaneira (3-Way Match)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Cruzamento automatizado NF/DI vs Doca vs OS com bloqueio imediato para Quarentena Fiscal.
          </p>
        </Link>

        <Link
          href="/dashboard/scheduling"
          className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-2xl space-y-3 transition-all hover:scale-[1.02] block"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Smart Scheduling com IA</h2>
          </div>
          <p className="text-xs text-slate-400">
            Parser de mensagens desestruturadas de WhatsApp com alocação inteligente de docas e horários.
          </p>
        </Link>
      </div>
    </main>
  );
}

