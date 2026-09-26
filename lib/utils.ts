import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// ── Tailwind class merge ──────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Job class → color ─────────────────────────────────────────
export const JOB_COLORS: Record<string, string> = {
  "Lord Knight":    "#c13829",
  "Paladin":        "#e18028",
  "High Wizard":    "#2c7eb9",
  "Sniper":         "#d4a015",
  "Priest":         "#25ae62",
  "Champion":       "#15a083",
  "Assassin Cross": "#8b46af",
  "Merchant":       "#c2185d",
  "Gunslinger":     "#894517",
  "Druid":          "#41b388",
  "Biosmith":       "#607d8b",
  "Bard":           "#ff9800",
  "Dancer":         "#e91e63",
};

export const JOB_ICONS: Record<string, string> = {
  "Lord Knight":    "/class/Lord_Knight.png",
  "Paladin":        "/class/Paladin.png",
  "High Wizard":    "/class/High_Wizard.png",
  "Sniper":         "/class/Sniper.png",
  "Priest":         "/class/Priest.png",
  "Champion":       "/class/Champion.png",
  "Assassin Cross": "/class/Assassin_Cross.png",
  "Merchant":       "/class/Merchant.png",
  "Gunslinger":     "/class/Gunslinger.png",
  "Druid":          "/class/Druid.png",
  "Biosmith":       "/class/Biosmith.png",
  "Bard":           "/class/Bard.png",
  "Dancer":         "/class/Dancer.png",
};

export const JOB_LIST = Object.keys(JOB_COLORS);


// ── Booking time check (Bangkok timezone) ────────────────────
export function isBookingOpen(schedule?: {
  openDate?: string;
  openTime?: string;
  closeTime?: string;
  carryTeamsCount?: number;
  isClosed?: boolean;
} | null, now?: Date): { open: boolean; reason?: string } {
  // No schedule configured yet (or none of openDate/openTime/closeTime
  // set) means the admin hasn't restricted booking at all — default to
  // OPEN, not closed. This matches how the rest of the schedule form
  // treats an unset field as "no restriction" rather than "blocked".
  if (!schedule) {
    return { open: true };
  }

  if (schedule.isClosed) {
    return { open: false, reason: "⛔ ระบบจองดันเจี้ยนถูกปิดชั่วคราว" };
  }

  const isUnlimited = !schedule.openTime && !schedule.closeTime && !schedule.openDate;
  if (isUnlimited) {
    return { open: true };
  }

  if (!schedule.openDate || !schedule.openDate.trim()) {
    return { open: true };
  }

  const refDate = now ?? new Date();
  const nowBkk = new Date(
    refDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const todayStr = nowBkk.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const targetDate = schedule.openDate.trim();

  // If time is not restricted but date is set, check date only
  if (!schedule.openTime || !schedule.closeTime) {
    if (todayStr !== targetDate) {
      const parts = targetDate.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return {
          open: false,
          reason: `⏰ ยังไม่ถึงวันเปิดจอง (เปิดวันที่ ${d}/${m}/${y})`,
        };
      }
      return { open: false, reason: `⏰ ยังไม่ถึงวันเปิดจอง` };
    }
    return { open: true };
  }

  const [oh, om] = schedule.openTime.split(":").map(Number);
  const [ch, cm] = schedule.closeTime.split(":").map(Number);
  const openMins  = (isNaN(oh) ? 0 : oh) * 60 + (isNaN(om) ? 0 : om);
  const closeMins = (isNaN(ch) ? 23 : ch) * 60 + (isNaN(cm) ? 59 : cm);
  const nowMins   = nowBkk.getHours() * 60 + nowBkk.getMinutes();

  const isMidnightCrossing = closeMins < openMins;

  if (!isMidnightCrossing) {
    // Normal window (e.g. 09:00-22:00) — must be same day as targetDate
    if (todayStr !== targetDate) {
      const parts = targetDate.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return {
          open: false,
          reason: `⏰ ยังไม่ถึงวันเปิดจอง (เปิดวันที่ ${d}/${m}/${y})`,
        };
      }
      return { open: false, reason: `⏰ ยังไม่ถึงวันเปิดจอง` };
    }
    if (nowMins < openMins || nowMins > closeMins) {
      return {
        open: false,
        reason: `⏰ ยังไม่ถึงเวลาเปิดจอง (เปิด ${schedule.openTime} – ${schedule.closeTime} น.)`,
      };
    }
    return { open: true };
  }

  // Midnight-crossing window (e.g. 22:00-02:00)
  // Window spans: openDate at openTime  →  (openDate+1) at closeTime
  // Compute yesterday string in Bangkok time
  const yesterdayBkk = new Date(nowBkk);
  yesterdayBkk.setDate(yesterdayBkk.getDate() - 1);
  const yesterdayStr = yesterdayBkk.toLocaleDateString("en-CA");

  // Case A: today is the openDate — open if nowMins >= openMins
  if (todayStr === targetDate) {
    if (nowMins >= openMins) {
      return { open: true };
    }
    return {
      open: false,
      reason: `⏰ ยังไม่ถึงเวลาเปิดจอง (เปิด ${schedule.openTime} – ${schedule.closeTime} น.)`,
    };
  }

  // Case B: today is openDate+1 (the "second day" of the window) — open if nowMins <= closeMins
  if (yesterdayStr === targetDate) {
    if (nowMins <= closeMins) {
      return { open: true };
    }
    return {
      open: false,
      reason: `⏰ ยังไม่ถึงเวลาเปิดจอง (เปิด ${schedule.openTime} – ${schedule.closeTime} น.)`,
    };
  }

  // Otherwise: completely different day
  // Determine if it's before or after the window
  const targetParts = targetDate.split("-");
  const todayParts = todayStr.split("-");
  const targetMs = new Date(targetDate).getTime();
  const todayMs = new Date(todayStr).getTime();

  if (todayMs < targetMs) {
    if (targetParts.length === 3) {
      const [y, m, d] = targetParts;
      return {
        open: false,
        reason: `⏰ ยังไม่ถึงวันเปิดจอง (เปิดวันที่ ${d}/${m}/${y})`,
      };
    }
    return { open: false, reason: `⏰ ยังไม่ถึงวันเปิดจอง` };
  }

  // todayMs > targetMs + 1 day — past the window
  return {
    open: false,
    reason: `⏰ ยังไม่ถึงวันเปิดจอง`,
  };
}

// ── Timestamp helpers ─────────────────────────────────────────
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(ts: number): string {
  return new Date(ts).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatTimeOnly(ts: number): string {
  return new Date(ts).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
}



export function formatItemName(name: string, category?: string): string {
  if (category?.toLowerCase() === "relic") {
    const n = name.toLowerCase();
    
    if (n.includes("blade of destruction") || n.includes("ล้างผลาญ") || n.includes("radiant holy shield") || n.includes("พิทักษ์")) {
      let extra = name
        .replace(/blade of destruction/ig, "")
        .replace(/ล้างผลาญ/g, "")
        .replace(/radiant holy shield/ig, "")
        .replace(/พิทักษ์/g, "")
        .replace(/\(\s*\)/g, "")
        .trim();
      
      if (extra.startsWith("-")) extra = extra.substring(1).trim();

      if (n.includes("blade of destruction") || n.includes("ล้างผลาญ")) {
        return "ล้างผลาญ (Blade of Destruction)" + (extra ? " " + extra : "");
      }
      if (n.includes("radiant holy shield") || n.includes("พิทักษ์")) {
        return "พิทักษ์ (Radiant Holy Shield)" + (extra ? " " + extra : "");
      }
    }
  }
  return name;
}
