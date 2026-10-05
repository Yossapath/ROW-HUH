"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, RefreshCw, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

const HINTS: Record<string, string> = {
  manual: "กรุณาติดต่อผู้ดูแลระบบของกิลด์เพื่อเปิดใช้งานบัญชีอีกครั้ง",
  not_in_guild: "กรุณาเข้าร่วมเซิร์ฟเวอร์ Discord ของกิลด์ แล้วกด “ตรวจสอบอีกครั้ง”",
  missing_role: "กรุณาติดต่อผู้ดูแลเพื่อขอยศ HUH? ใน Discord แล้วกด “ตรวจสอบอีกครั้ง”",
};

export default function InactiveScreen() {
  const router = useRouter();
  const { inactive, setInactive, setUser, logout } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const recheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.data) {
        setUser(data.data);
        setInactive(null); // active again → dashboard renders automatically
      } else if (data.code === "INACTIVE") {
        setInactive({ message: data.error, reason: data.reason ?? null });
      } else {
        router.replace("/login");
      }
    } catch {
      /* keep showing the notice */
    } finally {
      setChecking(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-theme-surface border border-red-500/40 shadow-xl text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-500 mb-4">
          <ShieldOff className="w-8 h-8" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-500 mb-3">
          INACTIVE
        </div>
        <h1 className="text-xl font-bold text-theme-textHi mb-2">ไม่สามารถใช้งานเว็บได้</h1>
        <p className="text-sm text-theme-text mb-2">{inactive?.message}</p>
        <p className="text-xs text-theme-textLo mb-6">{HINTS[inactive?.reason ?? "manual"] ?? HINTS.manual}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={recheck}
            disabled={checking}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            ตรวจสอบอีกครั้ง
          </button>
          <button
            onClick={signOut}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-theme-hover border border-theme-border text-theme-text font-medium hover:bg-theme-border transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
