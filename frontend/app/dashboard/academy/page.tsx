"use client";

import React, { useState } from "react";
import { 
  GraduationCap, 
  Smartphone, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle, 
  Play, 
  BookOpen, 
  Clock, 
  Award,
  ChevronRight,
  HelpCircle
} from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  category: "Doca" | "IA & Backoffice" | "Aduana & Fiscal";
  duration: string;
  description: string;
  icon: React.ReactNode;
  badgeColor: string;
  steps: string[];
}

export default function AcademyPage() {
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  const modules: TrainingModule[] = [
    {
      id: "doca-pwa",
      title: "Recebimento cego no PWA de Doca",
      category: "Doca",
      duration: "12 min",
      description: "Operação prática no smartphone ou coletor: conferência de volumes físicos, registro de avaria com captura nativa de fotos (Zero-Storage) e lançamento imediato de extras spot (paletização, filme stretch).",
      icon: <Smartphone className="w-6 h-6 text-emerald-400" />,
      badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      steps: [
        "1. Selecione a doca ativa e insira o número do documento/DI da carga.",
        "2. Digite os volumes físicos conferidos.",
        "3. Se houver danos, marque a caixa de avaria e capture a foto diretamente da câmera.",
        "4. Clique em 'Lançar Serviço Extra' para cobrar paletes PBR ou aplicação de stretch.",
        "5. Confirme o recebimento para emitir o laudo com ressalva em PDF."
      ]
    },
    {
      id: "ia-whatsapp",
      title: "IA para romaneios de WhatsApp",
      category: "IA & Backoffice",
      duration: "8 min",
      description: "Como a Inteligência Artificial do GADAP WMS interpreta áudios transcritos e mensagens informais de motoristas para gerar agendamentos de doca automaticamente.",
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      steps: [
        "1. Cole a mensagem bruta do WhatsApp ou OCR no campo de triagem.",
        "2. Clique em 'Analisar Mensagem & Sugerir Slot'.",
        "3. O LLM extrai a transportadora, o número da DI/NF, a previsão de chegada e a quantidade de volumes.",
        "4. O sistema dimensiona o tempo de descarga e seleciona a doca adequada (Geral, Pesada ou Climatizada).",
        "5. Confirme a janela para agendar e reservar a vaga no pátio."
      ]
    },
    {
      id: "quarentena-fiscal",
      title: "Gestão de Quarentena Fiscal",
      category: "Aduana & Fiscal",
      duration: "15 min",
      description: "Entendendo o 3-Way Match: cruzamento das 3 vias (NF/DI vs Doca vs Ordem de Serviço) para proteger o armazém contra multas do Art. 107 do Decreto-Lei 37/66 da Receita Federal.",
      icon: <ShieldAlert className="w-6 h-6 text-rose-500" />,
      badgeColor: "bg-rose-500/10 text-rose-300 border-rose-500/30",
      steps: [
        "1. Acesse o painel desktop de Auditoria Aduaneira.",
        "2. Monitore o painel de alerta de lotes com discrepâncias quantitativas.",
        "3. Compare as colunas de 1ª Via (NF/DI), 2ª Via (Doca) e 3ª Via (OS).",
        "4. Cargas em Quarentena Fiscal têm bloqueio físico automático para movimentação.",
        "5. Providencie a retificação da DI junto ao despachante ou realize nova auditoria."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto space-y-8 font-sans">
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">
              GADAP Academy • Treinamento WMS
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manuais operacionais, trilhas de capacitação de campo e procedimentos aduaneiros
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-300">
          <Award className="w-4 h-4 text-cyan-400" />
          <span>Certificação Operacional WMS 2.0</span>
        </div>
      </header>

      {/* Grid de Cards de Treinamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((m) => (
          <div
            key={m.id}
            onClick={() => setSelectedModule(m)}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-xl space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  {m.icon}
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${m.badgeColor}`}>
                  {m.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-white leading-snug">{m.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {m.duration}
              </span>
              <span className="text-cyan-400 font-bold flex items-center gap-1 hover:underline">
                Acessar Guia <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Painel de Passo a Passo do Módulo Selecionado */}
      {selectedModule && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                {selectedModule.icon}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{selectedModule.title}</h2>
                <p className="text-xs text-slate-400">{selectedModule.category} • Duração estimada: {selectedModule.duration}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedModule(null)}
              className="text-slate-400 hover:text-white text-xs font-bold bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800"
            >
              Fechar
            </button>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" /> Roteiro Passo a Passo de Execução:
            </h4>
            <div className="space-y-2 pt-1">
              {selectedModule.steps.map((st, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{st}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

