"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ScrollText,
  Search,
  Trash2,
  Filter,
  CalendarOff,
  Swords,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { JOB_COLORS, formatTimestamp, formatDateOnly, formatTimeOnly } from "@/lib/utils";
import type { SystemLog, LeaveRecord, DungeonQueue } from "@/types";

// ── Module badge config ────────────────────────────────────────
const MODULE_COLORS: Record<string, string> = {
  dungeon:    "bg-purple-100 text-purple-700",
  attendance: "bg-green-100 text-green-700",
  leave:      "bg-yellow-100 text-yellow-700",
  roster:     "bg-blue-100 text-blue-700",
  teams:      "bg-orange-100 text-orange-700",
  auth:       "bg-slate-100 text-slate-600",
};

function moduleBadgeClass(mod: string) {
  const key = mod.toLowerCase();
  for (const k of Object.keys(MODULE_COLORS)) {
    if (key.includes(k)) return MODULE_COLORS[k];
  }
  return "bg-slate-100 text-slate-600";
}

function QueueStatusBadge({ status }: { status: string }) {
  if (status === "waiting")
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">รอคิว</span>;
  if (status === "active")
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">กำลังลง</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">เสร็จแล้ว</span>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4 px-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <ScrollText size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">{message}</p>
    </div>
  );
}

const ROWS_PER_PAGE = 50;

export default function LogPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [search, setSearch] = useState("");

  // Tab 0 — System Log
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFetched, setLogsFetched] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("all");

  // Tab 1 — Leave
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leavesFetched, setLeavesFetched] = useState(false);
  const [leaveDateFilter, setLeaveDateFilter] = useState("");
  const [leaveTab, setLeaveTab] = useState<"leave" | "offline">("leave");

  // Tab 2 — Dungeon Queue
  const [queues, setQueues] = useState<DungeonQueue[]>([]);
  const [queuesLoading, setQueuesLoading] = useState(false);
  const [queuesFetched, setQueuesFetched] = useState(false);

  const [rosterMembers, setRosterMembers] = useState<{name:string, power?:number}[]>([]);

  // ── Fetch on tab switch ──────────────────────────────────────
  useEffect(() => {
    if (activeTab === 0 && isAdmin && !logsFetched) {
      setLogsLoading(true);
      fetch("/api/logs")
        .then((r) => r.json())
        .then((d) => { setLogs(d.data ?? []); setLogsFetched(true); })
        .catch(() => setLogs([]))
        .finally(() => setLogsLoading(false));
    }
  }, [activeTab, isAdmin, logsFetched]);

  useEffect(() => {
    if (activeTab === 1 && !leavesFetched) {
      setLeavesLoading(true);
      Promise.all([
        fetch("/api/leave?type=all").then((r) => r.json()),
        fetch("/api/roster").then((r) => r.json())
      ])
        .then(([leavesRes, rosterRes]) => {
          setLeaves(leavesRes.data ?? []);
          setLeavesFetched(true);
          
          if (rosterRes.data) {
            const members: {name:string, power?:number}[] = [];
            Object.values(rosterRes.data as Record<string, {name:string, power?:number}[]>).forEach(arr => {
              if (Array.isArray(arr)) arr.forEach(m => members.push({ name: m.name, power: m.power }));
            });
            setRosterMembers(members);
          }
        })
        .catch(() => setLeaves([]))
        .finally(() => setLeavesLoading(false));
    }
  }, [activeTab, leavesFetched]);

  useEffect(() => {
    if (activeTab === 2 && !queuesFetched) {
      setQueuesLoading(true);
      fetch(`/api/dungeon/queues?type=${isAdmin ? 'all' : 'history'}`)
        .then((r) => r.json())
        .then((d) => { setQueues(d.data ?? []); setQueuesFetched(true); })
        .catch(() => setQueues([]))
        .finally(() => setQueuesLoading(false));
    }
  }, [activeTab, queuesFetched]);

  // ── Delete leave ─────────────────────────────────────────────
  async function handleDeleteLeave(id: string) {
    if (!window.confirm("ยืนยันลบรายการนี้?")) return;
    try {
      await fetch("/api/leave", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch { /* silently fail */ }
  }

  // ── Clear queues ─────────────────────────────────────────────
  async function handleClearQueues() {
    if (!window.confirm("ยืนยันลบประวัติการจองดันเจี้ยนที่สำเร็จแล้วทั้งหมด?")) return;
    try {
      await fetch("/api/dungeon/queues", { method: "DELETE" });
      setQueues((prev) => prev.filter(q => q.status !== "done"));
    } catch { /* silently fail */ }
  }

  // ── Filter helpers ───────────────────────────────────────────
  const q = search.toLowerCase();

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (moduleFilter !== "all") {
      list = list.filter((l) => l.module.toLowerCase().includes(moduleFilter));
    }
    if (q) {
      list = list.filter(
        (l) =>
          l.module.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.actor.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          l.detail.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, q, moduleFilter]);

  const leaveLogs = useMemo(() => {
    return logs.filter(l => l.module.toLowerCase() === "leave").sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / ROWS_PER_PAGE));
  const pagedLogs = filteredLogs.slice((logPage - 1) * ROWS_PER_PAGE, logPage * ROWS_PER_PAGE);

  const filteredLeaves = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    let list = leaves.filter(l => {
      if (l.date && l.date > todayStr) return false;
      if (leaveDateFilter && l.date !== leaveDateFilter) return false;
      return true;
    });

    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.reason ?? "").toLowerCase().includes(q) ||
          (l.date ?? "").includes(q) ||
          (l.day ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [leaves, q, leaveDateFilter]);

  const groupedLeavesArray = useMemo(() => {
    const map = new Map<string, typeof filteredLeaves>();
    for (const l of filteredLeaves) {
      const d = l.date || "ไม่ระบุวันที่";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(l);
    }
    return Array.from(map.entries()).map(([date, list]) => {
      const offlineList = list.filter(l => (l.reason ?? "").toLowerCase().includes("ออฟไลน์") || (l.reason ?? "").toLowerCase().includes("offline"));
      const leaveList = list.filter(l => !((l.reason ?? "").toLowerCase().includes("ออฟไลน์") || (l.reason ?? "").toLowerCase().includes("offline")));
      return { date, offlineList, leaveList };
    });
  }, [filteredLeaves]);

  const filteredQueues = useMemo(() => {
    const list = q
      ? queues.filter(
          (qr) =>
            qr.name.toLowerCase().includes(q) ||
            qr.job.toLowerCase().includes(q) ||
            qr.status.toLowerCase().includes(q)
        )
      : queues;
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [queues, q]);

  const moduleOptions = useMemo(() => {
    const mods = new Set(logs.map((l) => l.module.toLowerCase()));
    return Array.from(mods).sort();
  }, [logs]);

  const TABS = ["System Log", "ลา/ออฟไลน์", "จองคิวดันเจี้ยน"];

  return (
    <div
      className="space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-4 lg:py-8 lg:px-12 xl:px-24 2xl:px-32 relative"
      style={{ zoom: 0.85 }}
    >
      {/* ── Header Card ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] p-5 mb-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0b3d63] flex items-center justify-center flex-shrink-0">
            <ScrollText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">ประวัติระบบ</h1>
            <p className="text-sm text-slate-500 dark:text-[#8B93A7]">ดูประวัติการทำรายการทั้งหมด</p>
          </div>
        </div>
        <div className="relative w-full md:w-auto">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLogPage(1); }}
            className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-[#2D3342] bg-white dark:bg-[#272C38] text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4D73CD] dark:focus:ring-[#4D73CD] font-medium w-full md:w-72 text-sm placeholder:text-slate-400 dark:placeholder:text-[#6B7280]"
          />
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i as 0 | 1 | 2)}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
              activeTab === i
                ? "bg-[#0b3d63] dark:bg-[#272C38] text-white dark:text-white dark:border dark:border-[#4D73CD]/30 shadow-md"
                : "bg-white dark:bg-[#232733] text-slate-600 dark:text-[#8B93A7] border border-slate-200 dark:border-[#2D3342] hover:bg-slate-50 dark:hover:bg-[#2A2F3E]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab 0: System Log ────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-hidden">
          {!isAdmin ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <ShieldOff size={48} className="opacity-30" />
              <p className="font-bold text-lg">ไม่มีสิทธิ์เข้าถึง</p>
              <p className="text-sm">เฉพาะ Admin และ Owner เท่านั้น</p>
            </div>
          ) : logsLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-[#2D3342]">
                <span className="font-bold text-slate-700 dark:text-white">รายการทั้งหมด</span>
                <span className="text-sm text-slate-400 ml-auto">
                  {filteredLogs.length} รายการ
                </span>
              </div>

              {filteredLogs.length === 0 ? (
                <EmptyState message="ไม่มีประวัติที่ค้นหา" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-[#272C38] text-slate-500 dark:text-[#8B93A7] font-bold text-xs uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-3 text-left whitespace-nowrap">วันที่</th>
                          <th className="px-4 py-3 text-left whitespace-nowrap">เวลา</th>
                          <th className="px-4 py-3 text-left">Module</th>
                          <th className="px-4 py-3 text-left">Action</th>
                          <th className="px-4 py-3 text-left">ผู้ทำ</th>
                          <th className="px-4 py-3 text-left">Target</th>
                          <th className="px-4 py-3 text-left">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1e3550]">
                        {pagedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#2A2F3E] transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-[#8B93A7] font-mono text-xs">
                              {formatDateOnly(log.timestamp)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-[#8B93A7] font-mono text-xs">
                              {formatTimeOnly(log.timestamp)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${moduleBadgeClass(log.module)}`}>
                                {log.module}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-white whitespace-nowrap">
                              {log.action}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-white whitespace-nowrap">{log.actor}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-white whitespace-nowrap">{log.target}</td>
                            <td className="px-4 py-3 text-slate-500 dark:text-[#8B93A7] max-w-xs truncate" title={log.detail}>
                              {log.detail}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalLogPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-[#2D3342]">
                      <span className="text-sm text-slate-400">
                        หน้า {logPage} / {totalLogPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={logPage <= 1}
                          onClick={() => setLogPage((p) => p - 1)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-[#2D3342] hover:bg-slate-50 dark:hover:bg-[#2A2F3E] text-slate-600 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          disabled={logPage >= totalLogPages}
                          onClick={() => setLogPage((p) => p + 1)}
                          className="p-2 rounded-lg border border-slate-200 dark:border-[#2D3342] hover:bg-slate-50 dark:hover:bg-[#2A2F3E] text-slate-600 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab 1: ลาออฟไลน์ ─────────────────────────────────── */}
      {activeTab === 1 && (
        <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-[#2D3342]">
            <div className="flex items-center gap-2">
              <CalendarOff size={18} className="text-yellow-500" />
              <span className="font-bold text-slate-700 dark:text-white">ประวัติ การลา/ออฟไลน์</span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1C1F27] p-1 rounded-xl">
              <button 
                onClick={() => setLeaveTab("leave")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${leaveTab === "leave" ? "bg-white dark:bg-[#2D3342] text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"}`}
              >
                แจ้งลา
              </button>
              <button 
                onClick={() => setLeaveTab("offline")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${leaveTab === "offline" ? "bg-white dark:bg-[#2D3342] text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"}`}
              >
                ออฟไลน์
              </button>
            </div>

            <div className="sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="date" 
                value={leaveDateFilter} 
                onChange={e => setLeaveDateFilter(e.target.value)} 
                className="border border-slate-200 dark:border-[#2D3342] rounded-lg px-2 py-1 text-sm bg-white dark:bg-[#272C38] text-slate-700 dark:text-white outline-none flex-1 sm:flex-none" 
              />
              {leaveDateFilter && (
                <button onClick={() => setLeaveDateFilter("")} className="text-xs text-red-400 hover:text-red-500 whitespace-nowrap">ล้าง</button>
              )}
            </div>
          </div>

          {leavesLoading ? (
            <LoadingSkeleton />
          ) : groupedLeavesArray.length === 0 ? (
            <EmptyState message="ไม่มีรายการประวัติ" />
          ) : (
            <div className="p-6 space-y-8">
              {groupedLeavesArray.map((group) => {
                const targetList = leaveTab === "leave" ? group.leaveList : group.offlineList;
                if (targetList.length === 0) return null;
                
                return (
                  <div key={group.date} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white bg-slate-100 dark:bg-[#2A2F3E] px-4 py-2 rounded-xl inline-flex border border-slate-200 dark:border-[#2D3342]">
                        วันที่ {group.date}
                      </h4>
                      <div className="h-px bg-slate-200 dark:bg-[#2D3342] flex-1"></div>
                    </div>

                    <div className="pl-2">
                      <div className="mb-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${leaveTab === "leave" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                          {leaveTab === "leave" ? "แจ้งลา" : "ออฟไลน์"} ({targetList.length})
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#2D3342] bg-white dark:bg-[#272C38]">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-[#2A2F3E] text-slate-500 dark:text-[#8B93A7] font-bold text-xs uppercase tracking-wide border-b border-slate-200 dark:border-[#2D3342]">
                              <tr>
                                <th className="px-4 py-3 text-center w-10">#</th>
                                <th className="px-4 py-3 text-left">ชื่อ</th>
                                <th className="px-4 py-3 text-left">ค่าพลัง</th>
                                <th className="px-4 py-3 text-left">อาชีพ</th>
                                <th className="px-4 py-3 text-left">วัน</th>
                                <th className="px-4 py-3 text-left">เหตุผล</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">วันที่แจ้ง</th>
                                <th className="px-4 py-3 text-left whitespace-nowrap">เวลาแจ้ง</th>
                                {isAdmin && <th className="px-4 py-3 text-center w-16">ลบ</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1e3550]">
                              {targetList.map((leave, idx) => {
                                const power = rosterMembers.find(m => m.name === leave.name)?.power;
                                return (
                                <tr key={leave.id} className="hover:bg-slate-50 dark:hover:bg-[#323847] transition-colors">
                                  <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-white">{leave.name}</td>
                                  <td className="px-4 py-3">
                                    {(power && power > 0) ? <span className="text-xs font-bold text-amber-500">{power.toLocaleString()}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    {leave.job ? <span className="text-[11px] text-white px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: JOB_COLORS[leave.job] || "#475569" }}>{leave.job}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-white">
                                    {leave.day ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-[#8B93A7] max-w-xs truncate" title={leave.reason}>
                                    {leave.reason ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                                    {formatDateOnly(leave.timestamp)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                                    {formatTimeOnly(leave.timestamp)}
                                  </td>
                                  {isAdmin && (
                                    <td className="px-4 py-3 text-right">
                                      <button onClick={() => handleDeleteLeave(leave.id)} className="text-red-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                                )
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Show empty state if the chosen tab has 0 items across all dates */}
              {groupedLeavesArray.every(g => (leaveTab === "leave" ? g.leaveList.length : g.offlineList.length) === 0) && (
                <EmptyState message={`ไม่มีประวัติ${leaveTab === "leave" ? "การลา" : "ออฟไลน์"}`} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: จองคิวดันเจี้ยน ───────────────────────────── */}
      {activeTab === 2 && (
        <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-[#2D3342]">
            <Swords size={18} className="text-purple-500" />
            <span className="font-bold text-slate-700 dark:text-white">ประวัติการจองคิวดันเจี้ยน</span>
            {isAdmin && (
              <button 
                onClick={handleClearQueues}
                className="ml-4 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-xs font-bold transition-colors"
              >
                Clear Log
              </button>
            )}
            <span className="text-sm text-slate-400 ml-auto">{filteredQueues.length} รายการ</span>
          </div>

          {queuesLoading ? (
            <LoadingSkeleton />
          ) : filteredQueues.length === 0 ? (
            <EmptyState message="ไม่มีรายการจองคิว" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-[#272C38] text-slate-500 dark:text-[#8B93A7] font-bold text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">#</th>
                    <th className="px-4 py-3 text-left">ชื่อ</th>
                    <th className="px-4 py-3 text-left">อาชีพ</th>
                    <th className="px-4 py-3 text-right">พลัง</th>
                    <th className="px-4 py-3 text-center">รอบ</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">วันที่จอง</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">เวลาจอง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1e3550]">
                  {filteredQueues.map((qr, idx) => (
                    <tr key={qr.id} className="hover:bg-slate-50 dark:hover:bg-[#2A2F3E] transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-white">{qr.name}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: JOB_COLORS[qr.job] ?? "#94a3b8" }}
                          />
                          <span className="text-slate-600 dark:text-white font-medium">{qr.job}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-white font-mono tabular-nums">
                        {qr.power.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          qr.rounds === 2
                            ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white"
                        }`}>
                          {qr.rounds === 2 ? "รอบ 1+2" : "รอบ 1"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <QueueStatusBadge status={qr.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {formatDateOnly(qr.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {formatTimeOnly(qr.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
