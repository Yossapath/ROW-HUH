"use client";

import { useModalStore } from "@/stores/useModalStore";
import { AlertTriangle, X, CheckCircle2, Info } from "lucide-react";
import { useState, useEffect } from "react";

export function GlobalModal() {
  const { isOpen, options, close } = useModalStore();
  const [input, setInput] = useState("");

  useEffect(() => {
    if (isOpen) setInput("");
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = options.type === "danger";
  const isConfirm = options.type === "confirm" || isDanger;
  const requireInput = options.requireInput;

  const Icon = isDanger ? AlertTriangle : isConfirm ? Info : CheckCircle2;
  const iconColor = isDanger ? "text-red-600 dark:text-red-400" : isConfirm ? "text-sky-600 dark:text-sky-400" : "text-green-600 dark:text-green-400";
  const iconBg = isDanger ? "bg-red-100 dark:bg-red-950/60" : isConfirm ? "bg-sky-100 dark:bg-sky-950/60" : "bg-green-100 dark:bg-green-950/60";
  const btnColor = isDanger ? "bg-red-600 hover:bg-red-700 shadow-red-600/30" : "bg-sky-600 hover:bg-sky-700 shadow-sky-600/30";

  const handleConfirm = () => {
    if (requireInput && input.trim() !== requireInput) return;
    close(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative animate-in fade-in zoom-in duration-200">
        
        <button
          onClick={() => close(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{options.title}</h3>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] text-sm whitespace-pre-wrap text-slate-700 dark:text-gray-300">
          {options.message}
        </div>

        {requireInput && (
          <div className="space-y-2 pt-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-200">
              พิมพ์คำว่า <span className={`font-bold px-1.5 py-0.5 rounded ${isDanger ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50" : "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50"}`}>{requireInput}</span> ในช่องด้านล่างเพื่อยืนยัน:
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`พิมพ์ ${requireInput}`}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && input.trim() === requireInput && handleConfirm()}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#2D3342] bg-white dark:bg-[#1C1F27] text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400 dark:placeholder:text-[#6B7280]"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {isConfirm && (
            <button
              onClick={() => close(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              {options.cancelText || "ยกเลิก"}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={requireInput ? input.trim() !== requireInput : false}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
              (requireInput ? input.trim() === requireInput : true)
                ? `${btnColor} shadow-md cursor-pointer`
                : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
            }`}
          >
            {options.confirmText || (isConfirm ? "ยืนยัน" : "ตกลง")}
          </button>
        </div>
      </div>
    </div>
  );
}
