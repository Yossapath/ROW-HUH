"use client";
import { JOB_ICONS, JOB_COLORS } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef } from "react";
import { X, Swords, Shield, Activity, Calendar, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTH(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function nf(v: number | null | undefined): string {
  if (v == null) return "-";
  return Number(v).toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Radar Chart — drawn on <canvas> (no external library needed)
// ---------------------------------------------------------------------------

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
}

function drawRadarChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[], // 0–100
  isDark: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2 + 8;
  const R = Math.min(W, H) * 0.32;
  const N = labels.length;

  ctx.clearRect(0, 0, W, H);

  const gridColor  = isDark ? "#2D3342" : "#e2e8f0";
  const axisColor  = isDark ? "#3D4455" : "#cbd5e1";
  const textColor  = isDark ? "#8B93A7" : "#64748b";
  const fillColor  = isDark ? "rgba(99,179,237,0.22)" : "rgba(59,130,246,0.15)";
  const lineColor  = isDark ? "#63B3ED" : "#3b82f6";
  const dotColor   = isDark ? "#7ee787" : "#22c55e";

  // Grid rings (5 levels)
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const r = R * (ring / 5);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Axes
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    const lx = cx + Math.cos(a) * (R + 28);
    const ly = cy + Math.sin(a) * (R + 22);
    ctx.fillStyle = textColor;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = Math.cos(a) > 0.2 ? "left" : Math.cos(a) < -0.2 ? "right" : "center";
    ctx.textBaseline = Math.sin(a) > 0.2 ? "top" : Math.sin(a) < -0.2 ? "bottom" : "middle";
    ctx.fillText(labels[i], lx, ly);
  }

  // Data polygon
  ctx.beginPath();
  values.forEach((v, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const r = R * (v / 100);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Data dots
  values.forEach((v, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    const r = R * (v / 100);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Hook: draw radar whenever data changes
// ---------------------------------------------------------------------------

function useRadarCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  labels: string[],
  values: number[]
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isDark = document.documentElement.classList.contains("dark");
    drawRadarChart(canvas, labels, values, isDark);
  }, [canvasRef, labels, values]);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatData {
  cp: number | null;
  previousCp: number | null;
  cpDelta: number | null;
  cpPct: number | null;
  weekly: number | null;
  activity: number | null;
  historyPts: number | null;
  attendance: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    presentPercent: number;
    absentPercent: number;
    leavePercent: number;
    history: { date: string; status: string; note: string }[];
  } | null;
  dungeon: { totalRuns: number } | null;
}

function CPGrowthBadge({ delta, pct }: { delta: number | null; pct: number | null }) {
  if (delta === null || pct === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
        <Minus size={11} /> ยังไม่มีข้อมูล snapshot ก่อน
      </span>
    );
  }
  const positive = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
        positive
          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
      }`}
    >
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {positive ? "+" : ""}
      {nf(delta)} ({positive ? "+" : ""}
      {pct}%)
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------

interface MemberProfileModalProps {
  member: any;
  onClose: () => void;
}

export function MemberProfileModal({ member, onClose }: MemberProfileModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data, isLoading, error } = useQuery<StatData>({
    queryKey: ["member_stats", member.name],
    queryFn: async () => {
      const res = await axios.get(`/api/stats/member?name=${encodeURIComponent(member.name)}`);
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });

  // --- Compute radar scores (0–100) ---
  const attendanceRate = data?.attendance
    ? data.attendance.total > 0
      ? Math.round((data.attendance.present / data.attendance.total) * 100)
      : 0
    : 0;

  // Normalise weekly/activity relative to a reasonable max (guild top is unknown here,
  // so we cap at a practical ceiling to give a meaningful shape).
  const WEEKLY_CAP   = 7000;
  const ACTIVITY_CAP = 1500;
  const radarValues = [
    clamp100(((data?.weekly   ?? 0) / WEEKLY_CAP)   * 100), // แต้มสนับสนุน
    clamp100(((data?.activity ?? 0) / ACTIVITY_CAP) * 100), // กิจกรรม
    clamp100(attendanceRate),                                 // % เข้าร่วมวอร์
    clamp100(0),                                              // Guild League (placeholder — no data yet)
    clamp100(0),                                              // Mirror World  (placeholder — no data yet)
  ];

  const radarLabels = ["สนับสนุน", "กิจกรรม", "เข้าร่วม", "GVG", "Mirror"];

  useRadarCanvas(canvasRef, radarLabels, radarValues);

  if (!member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1C1F27] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2D3342] bg-slate-50 dark:bg-[#232733] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Job icon avatar */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-slate-500 dark:text-[#8B93A7] font-bold text-lg shrink-0 overflow-hidden"
              style={{ background: JOB_COLORS?.[member.job] ?? "#2D3342" }}
            >
              {member.job && JOB_ICONS?.[member.job] ? (
                <img src={JOB_ICONS[member.job]} alt={member.job} className="w-8 h-8 object-contain" />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">{member.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-[#8B93A7]">
                <span className="flex items-center gap-1">
                  {member.job && JOB_ICONS?.[member.job] && (
                    <img src={JOB_ICONS[member.job]} alt={member.job} className="w-4 h-4 object-contain inline-block drop-shadow-sm" />
                  )}
                  <span className="font-bold text-slate-800 dark:text-white">{member.job || "-"}</span>
                </span>
                <span>•</span>
                <span>Gear: {member.power ? member.power.toLocaleString() : "-"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 shrink-0 text-slate-400 hover:text-slate-600 dark:text-[#8B93A7] dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-[#2D3342] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Body ───────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">

          {/* ── CP + Weekly Stats Row ─────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CP */}
            <div className="col-span-2 sm:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#1E2A3E] dark:to-[#1A2235] border border-blue-100 dark:border-[#2D3D5A] rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">คะแนนอุปกรณ์ (CP)</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">
                    {isLoading ? (
                      <span className="text-slate-400 text-xl">กำลังโหลด...</span>
                    ) : (
                      nf(data?.cp ?? member.power)
                    )}
                  </p>
                </div>
                <Zap size={22} className="text-blue-400 dark:text-blue-500 shrink-0 mt-1" />
              </div>
              <div className="mt-2">
                {isLoading ? null : (
                  <CPGrowthBadge delta={data?.cpDelta ?? null} pct={data?.cpPct ?? null} />
                )}
              </div>
            </div>

            {/* Weekly แต้มสนับสนุน */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-1">
                <Activity size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-amber-600/70 dark:text-amber-400/70 leading-tight">แต้มสนับสนุนสัปดาห์</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {isLoading ? "..." : nf(data?.weekly ?? member.weekly)}
              </span>
            </div>

            {/* Dungeon runs */}
            <div className="bg-[#0b3d63]/5 dark:bg-[#3B66D1]/10 border border-[#0b3d63]/10 dark:border-[#3B66D1]/20 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-1">
              <div className="w-8 h-8 rounded-full bg-[#0b3d63]/10 dark:bg-[#3B66D1]/20 flex items-center justify-center mb-1">
                <Shield size={15} className="text-[#0b3d63] dark:text-[#82A0F5]" />
              </div>
              <span className="text-[11px] font-bold text-[#0b3d63]/70 dark:text-[#82A0F5]/70 leading-tight">รอบดันเจี้ยนสะสม</span>
              <span className="text-xl font-black text-[#0b3d63] dark:text-white tabular-nums">
                {isLoading ? "..." : (data?.dungeon?.totalRuns ?? "0")}
              </span>
            </div>
          </div>

          {/* ── Radar Chart + Quick Stats ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Radar */}
            <div className="bg-slate-50 dark:bg-[#181C25] border border-slate-100 dark:border-[#2D3342] rounded-xl p-3 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-500 dark:text-[#8B93A7] mb-2 uppercase tracking-wider self-start">กราฟสถิติรวม</p>
              <canvas
                ref={canvasRef}
                width={260}
                height={220}
                className="w-full max-w-[260px]"
              />
              <p className="text-[10px] text-slate-400 dark:text-[#555E72] mt-1 text-center">
                * GVG / Mirror ยังไม่มีข้อมูล API ในระบบ
              </p>
            </div>

            {/* Quick stat list */}
            <div className="flex flex-col gap-2">
              {[
                { label: "แต้มสะสมทั้งหมด",  value: isLoading ? "..." : nf(data?.historyPts) },
                { label: "แต้มกิจกรรมสัปดาห์", value: isLoading ? "..." : nf(data?.activity ?? member.activity) },
                { label: "CP ก่อนหน้า",       value: isLoading ? "..." : nf(data?.previousCp) },
                {
                  label: "เข้าร่วมวอร์",
                  value: isLoading
                    ? "..."
                    : data?.attendance
                    ? `${data.attendance.present} / ${data.attendance.total} (${data.attendance.presentPercent}%)`
                    : "-",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#181C25] border border-slate-100 dark:border-[#2D3342]"
                >
                  <span className="text-xs font-bold text-slate-500 dark:text-[#8B93A7]">{label}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── War Attendance Stats ──────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-[#2D3342] pb-2">
              <Swords size={16} className="text-emerald-500" />
              สถิติเข้าร่วมกิลด์วอร์
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลดข้อมูล...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-400 text-sm">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
            ) : !data?.attendance ? (
              <div className="text-center py-8 text-slate-400 text-sm">ไม่พบข้อมูลสถิติ</div>
            ) : (
              <>
                {/* Progress bars */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-500 dark:text-[#8B93A7]">
                      เข้าร่วมทั้งหมด: {data.attendance.total} ครั้ง
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {data.attendance.presentPercent}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-[#2D3342]">
                    <div style={{ width: `${data.attendance.presentPercent}%` }} className="bg-emerald-500 h-full" title="มา" />
                    <div style={{ width: `${data.attendance.leavePercent}%` }}   className="bg-amber-400 h-full"   title="ลา" />
                    <div style={{ width: `${data.attendance.absentPercent}%` }}  className="bg-red-500 h-full"    title="ขาด" />
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> มา: {data.attendance.present}
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <div className="w-2 h-2 rounded-full bg-amber-400" /> ลา: {data.attendance.leave}
                    </div>
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                      <div className="w-2 h-2 rounded-full bg-red-500" /> ขาด: {data.attendance.absent}
                    </div>
                  </div>
                </div>

                {/* History list */}
                <div className="mt-2 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-[#8B93A7] mb-1 uppercase tracking-wider">
                    ประวัติวอร์ย้อนหลัง
                  </h4>
                  {data.attendance.history.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs">ยังไม่มีประวัติการเช็คชื่อ</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2 border border-slate-100 dark:border-[#2D3342] rounded-xl p-2 bg-slate-50/50 dark:bg-[#232733]/50">
                      {data.attendance.history.map((log, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1C1F27] border border-slate-100 dark:border-[#2D3342] shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-slate-400" />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 dark:text-white">
                                {formatDateTH(log.date)}
                              </span>
                              {log.note && (
                                <span className="text-[10px] text-slate-400 max-w-[200px] truncate">
                                  {log.note}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                              log.status === "มา"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : log.status === "ขาด"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
