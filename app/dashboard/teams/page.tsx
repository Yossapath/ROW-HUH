"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Shield, Users, Loader2, GripVertical, Lock, Unlock, X, ChevronLeft, ChevronRight, LayoutGrid, Wand2, ChevronDown, Plus, Trash2, Edit2, Check, CheckCircle2, Search, Download, AlertCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { JOB_COLORS, JOB_LIST } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { allocateTeams, AllocatorResult } from "@/lib/team-allocator";
import html2canvas from "html2canvas";
import GVGExportLayout from "@/components/GVGExportLayout";

type Member = { id: string; name: string; job: string; power: number };
type Column = { id: string; title: string; memberIds: (string | null)[]; type: "main" | "sub" | "unassigned"; locked: boolean };
type Zone = { id: string; name: string; type: "main" | "sub"; teamOrder: string[] };
type DataState = {
  members: Record<string, Member>;
  columns: Record<string, Column>;
  zones: Zone[];
  offlineIds: string[];
};

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function buildDefaultColumns(prefix: string, type: "main" | "sub", count: number, startNum: number, cols: Record<string, Column>) {
  const order: string[] = [];
  for (let i = 0; i < count; i++) {
    const num = startNum + i;
    const id = `${prefix}-${num}`;
    order.push(id);
    if (!cols[id]) {
      cols[id] = { id, title: type === "main" ? `เธ—เธตเธก ${num}` : `เธ—เธตเธกเธฃเธญเธ ${num}`, memberIds: [null, null, null, null, null], type, locked: false };
    }
  }
  return order;
}

function migrateToZones(savedData: any, cols: Record<string, Column>): Zone[] {
  if (savedData?.zones && Array.isArray(savedData.zones) && savedData.zones.length > 0) {
    const hasSub = (savedData.zones as Zone[]).some(z => z.type === "sub");
    if (!hasSub) {
      return [...(savedData.zones as Zone[]), { id: "zone-sub-1", name: "เธชเธเธฒเธกเธฃเธญเธ", type: "sub", teamOrder: [] }];
    }
    return savedData.zones as Zone[];
  }
  const zones: Zone[] = [];
  const z1 = savedData?.mainZone1Order ?? [];
  const z2 = savedData?.mainZone2Order ?? [];
  const sub = savedData?.subOrder ?? [];
  zones.push({ id: "zone-main-1", name: "เนเธเธ 1", type: "main", teamOrder: z1.length > 0 ? z1 : buildDefaultColumns("main", "main", 6, 1, cols) });
  zones.push({ id: "zone-main-2", name: "เนเธเธ 2", type: "main", teamOrder: z2.length > 0 ? z2 : buildDefaultColumns("main", "main", 6, 7, cols) });
  zones.push({ id: "zone-sub-1", name: "เธชเธเธฒเธกเธฃเธญเธ", type: "sub", teamOrder: sub.length > 0 ? sub : buildDefaultColumns("sub", "sub", 6, 1, cols) });
  return zones;
}

export default function TeamsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const [data, setData] = useState<DataState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");
  const [serverVersion, setServerVersion] = useState<number>(0);
  const [hasConflict, setHasConflict] = useState<boolean>(false);
  const [conflictMessage, setConflictMessage] = useState<string>("");
  const initialLoadRef = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState<"main" | "sub" | "leave">("main");
  const [unassignedFilterJobs, setUnassignedFilterJobs] = useState<string[]>([]);
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);
  const jobFilterDropdownRef = useRef<HTMLDivElement>(null);
  const [isUnassignedCollapsed, setIsUnassignedCollapsed] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoModalText, setAutoModalText] = useState("");
  const [previewResult, setPreviewResult] = useState<AllocatorResult | null>(null);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [offlineSearch, setOfflineSearch] = useState("");
  const [isOfflineDropdownOpen, setIsOfflineDropdownOpen] = useState(false);
  const offlineDropdownRef = useRef<HTMLDivElement>(null);

  // Player search feature
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  // Zone editing state
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState("");

  // Clear team confirmation modal state
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // PNG Export state
  const exportLayoutRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPNG = async () => {
    if (!exportLayoutRef.current || isExporting) return;
    if (!data) {
      alert("เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธชเธณเธซเธฃเธฑเธเธเธฒเธฃ Export");
      return;
    }

    // Data Consistency Check (Section 13)
    const targetZones = data.zones.filter((z) => z.type === (activeTab === "sub" ? "sub" : "main"));
    const assignedMemberSet = new Set<string>();
    const duplicateMembers: string[] = [];
    let totalAssignedInZones = 0;

    for (const zone of targetZones) {
      for (const colId of zone.teamOrder) {
        const col = data.columns[colId];
        if (!col) continue;
        for (const memId of col.memberIds) {
          if (!memId) continue;
          totalAssignedInZones++;
          if (assignedMemberSet.has(memId)) {
            duplicateMembers.push(data.members[memId]?.name || memId);
          } else {
            assignedMemberSet.add(memId);
          }
          if (!data.members[memId]) {
            alert(`เนเธกเนเธชเธฒเธกเธฒเธฃเธ– Export เนเธ”เน เน€เธเธทเนเธญเธเธเธฒเธเธเนเธญเธกเธนเธฅเธ—เธตเธกเนเธกเนเธชเธกเธเธนเธฃเธ“เน (เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธเธนเนเน€เธฅเนเธ: ${memId})`);
            return;
          }
        }
      }
    }

    if (totalAssignedInZones === 0) {
      alert("เนเธกเนเธชเธฒเธกเธฒเธฃเธ– Export เนเธ”เน เน€เธเธทเนเธญเธเธเธฒเธเธขเธฑเธเนเธกเนเธกเธตเธเธฒเธฃเธเธฑเธ”เธชเธกเธฒเธเธดเธเธฅเธเนเธเธ—เธตเธก");
      return;
    }

    if (duplicateMembers.length > 0) {
      alert(`เนเธกเนเธชเธฒเธกเธฒเธฃเธ– Export เนเธ”เน เน€เธเธทเนเธญเธเธเธฒเธเธเธเธชเธกเธฒเธเธดเธเธเนเธณเนเธเธซเธฅเธฒเธขเธ—เธตเธก: ${duplicateMembers.join(", ")}`);
      return;
    }

    setIsExporting(true);
    try {
      // Allow brief delay for full render
      await new Promise((resolve) => setTimeout(resolve, 150));
      const element = exportLayoutRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f8fafc",
      });

      const dateStr = new Date().toISOString().split("T")[0];
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      // UX 5: Include tab name in filename so user can distinguish main vs sub exports
      const tabLabel = activeTab === "sub" ? "เธชเธเธฒเธกเธฃเธญเธ" : "เธชเธเธฒเธกเธซเธฅเธฑเธ";
      link.download = `GVG-${tabLabel}-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export PNG", err);
      alert("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธชเธฃเนเธฒเธเธ เธฒเธ PNG");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    function handleClickOutside(event: MouseEvent) {
      if (offlineDropdownRef.current && !offlineDropdownRef.current.contains(event.target as Node)) setIsOfflineDropdownOpen(false);
      if (jobFilterDropdownRef.current && !jobFilterDropdownRef.current.contains(event.target as Node)) setIsJobFilterOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rosterRes, teamsRes, leaveRes] = await Promise.all([
        axios.get("/api/roster"),
        axios.get("/api/teams"),
        axios.get("/api/leave").catch(() => ({ data: [] }))
      ]);
      const rosterPayload = rosterRes.data;
      const savedTeams = teamsRes.data;
      const membersMap: Record<string, Member> = {};
      if (leaveRes.data) setLeaveRecords(leaveRes.data.data || leaveRes.data || []);

      if (savedTeams && typeof savedTeams.version === "number") {
        setServerVersion(savedTeams.version);
      } else {
        setServerVersion(0);
      }
      setHasConflict(false);
      setConflictMessage("");

      if (rosterPayload.ok && rosterPayload.data) {
        Object.entries(rosterPayload.data).forEach(([jobName, members]: [string, any]) => {
          if (Array.isArray(members)) {
            members.forEach(m => { 
              // Parse power safely (remove commas, handle NaN)
              let parsedPower = typeof m.power === 'string' ? Number(m.power.replace(/,/g, '')) : Number(m.power);
              if (isNaN(parsedPower)) parsedPower = 0;
              membersMap[m.name] = { id: m.name, name: m.name, job: jobName, power: parsedPower }; 
            });
          }
        });
      }

      const cols: Record<string, Column> = {};
      let zones: Zone[] = [];
      let unassignedMembers = new Set(Object.keys(membersMap));
      const offlineIds: string[] = savedTeams?.offlineIds || [];

      if (savedTeams && savedTeams.columns) {
        // New format
        Object.assign(cols, savedTeams.columns);
        zones = migrateToZones(savedTeams, cols);
      } else if (savedTeams && savedTeams.data && Array.isArray(savedTeams.data)) {
        // Legacy API format
        const processGroup = (groupsObj: any, prefix: string, type: "main" | "sub") => {
          const order: string[] = [];
          let num = 1;
          Object.keys(groupsObj).sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0)).forEach(teamKey => {
            const colId = `${prefix}-${num}`;
            order.push(colId);
            const validIds: (string | null)[] = [null, null, null, null, null];
            (groupsObj[teamKey] as any[]).forEach((m, idx) => {
              if (idx < 5 && m && m.name && membersMap[m.name]) { validIds[idx] = m.name; unassignedMembers.delete(m.name); }
            });
            cols[colId] = { id: colId, title: `${type === "main" ? "เธ—เธตเธก" : "เธ—เธตเธกเธฃเธญเธ"} ${num}`, memberIds: validIds, type, locked: false };
            num++;
          });
          return order;
        };
        const allMain = processGroup(savedTeams.data[0]?.teams || {}, "main", "main");
        const subOrder = processGroup(savedTeams.data[1]?.teams || {}, "sub", "sub");
        zones = [
          { id: "zone-main-1", name: "เนเธเธ 1", type: "main", teamOrder: allMain.slice(0, 6) },
          { id: "zone-main-2", name: "เนเธเธ 2", type: "main", teamOrder: allMain.slice(6, 12) },
          { id: "zone-sub-1", name: "เธชเธเธฒเธกเธฃเธญเธ", type: "sub", teamOrder: subOrder },
        ];
      } else if (savedTeams && savedTeams.main && savedTeams.main.length > 0) {
        // Semi-new format
        const createCols = (groups: any[][], prefix: string, type: "main" | "sub", startIdx = 1) => {
          const order: string[] = [];
          groups.forEach((group, idx) => {
            const num = startIdx + idx;
            const colId = `${prefix}-${num}`;
            order.push(colId);
            const validIds: (string | null)[] = [null, null, null, null, null];
            group.forEach((m: any, mIdx: number) => {
              if (mIdx < 5 && m && m.name && membersMap[m.name]) { validIds[mIdx] = m.name; unassignedMembers.delete(m.name); }
            });
            cols[colId] = { id: colId, title: `${type === "main" ? "เธ—เธตเธก" : "เธ—เธตเธกเธฃเธญเธ"} ${num}`, memberIds: validIds, type, locked: false };
          });
          return order;
        };
        const allMain = createCols(savedTeams.main || [], "main", "main", 1);
        const subOrder = createCols(savedTeams.sub || [], "sub", "sub", 1);
        zones = migrateToZones({ mainZone1Order: allMain.slice(0, 6), mainZone2Order: allMain.slice(6, 12), subOrder }, cols);
      } else {
        zones = migrateToZones({}, cols);
      }

      if (!cols["unassigned"]) cols["unassigned"] = { id: "unassigned", title: "เธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธ”เธ—เธตเธก", memberIds: [], type: "unassigned", locked: false };

      const assignedIds = new Set<string>();
      zones.forEach(z => z.teamOrder.forEach(colId => {
        if (cols[colId]) cols[colId].memberIds.forEach(id => { if (id) assignedIds.add(id); });
      }));

      const unassignedIds = Object.keys(membersMap).filter(id => !assignedIds.has(id) && !offlineIds.includes(id));
      cols["unassigned"] = { id: "unassigned", title: "เธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธ”เธ—เธตเธก", memberIds: unassignedIds, type: "unassigned", locked: false };

      if (offlineIds.length > 0) {
        Object.keys(cols).forEach(colId => {
          if (colId === "unassigned") return;
          cols[colId].memberIds = cols[colId].memberIds.map(id => (id && offlineIds.includes(id) ? null : id));
        });
      }

      setData({ members: membersMap, columns: cols, zones, offlineIds });
    } catch {
      alert("เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async (currentData: DataState) => {
    if (!isAdmin) return;
    if (hasConflict) return; // Prevent overwriting when conflict is unhandled
    setSaveStatus("saving");
    try {
      const mainZones = currentData.zones.filter(z => z.type === "main");
      const subZones = currentData.zones.filter(z => z.type === "sub");
      const payload = {
        version: serverVersion,
        members: currentData.members,
        columns: currentData.columns,
        zones: currentData.zones,
        mainZone1Order: mainZones[0]?.teamOrder || [],
        mainZone2Order: mainZones[1]?.teamOrder || [],
        subOrder: subZones.flatMap(z => z.teamOrder),
        offlineIds: currentData.offlineIds,
        data: [
          {
            title: "เธชเธเธฒเธกเธซเธฅเธฑเธ",
            teams: mainZones.flatMap(z => z.teamOrder).reduce((acc, colId, idx) => {
              const col = currentData.columns[colId];
              acc[`เธ—เธตเธก ${idx + 1}`] = col ? col.memberIds.map(id => id && currentData.members[id] ? currentData.members[id] : { name: "", job: "", power: 0 }) : Array(5).fill({ name: "", job: "", power: 0 });
              return acc;
            }, {} as Record<string, any>)
          },
          {
            title: "เธชเธเธฒเธกเธฃเธญเธ",
            teams: subZones.flatMap(z => z.teamOrder).reduce((acc, colId, idx) => {
              const col = currentData.columns[colId];
              acc[`เธ—เธตเธกเธฃเธญเธ ${idx + 1}`] = col ? col.memberIds.map(id => id && currentData.members[id] ? currentData.members[id] : { name: "", job: "", power: 0 }) : Array(5).fill({ name: "", job: "", power: 0 });
              return acc;
            }, {} as Record<string, any>)
          }
        ]
      };
      const res = await axios.put("/api/teams", payload);
      const nextVer = res.data?.version ?? res.data?.data?.version ?? (serverVersion + 1);
      setServerVersion(nextVer);
      setSaveStatus("saved");
      setSaveErrorMsg("");
      setHasConflict(false);
      setConflictMessage("");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      console.error("Save error:", err.response?.data || err);
      const isConflict = err.response?.status === 409 || err.response?.data?.conflict;
      if (isConflict) {
        setSaveStatus("error");
        setHasConflict(true);
        const conflictMsg = err.response?.data?.error || "เธเนเธญเธกเธนเธฅเธ—เธตเธกเนเธเธฃเธฐเธเธเธกเธตเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธเธเธฒเธ Admin เธ—เนเธฒเธเธญเธทเนเธ เธซเธฃเธทเธญเธกเธตเธชเธกเธฒเธเธดเธเนเธเนเธเธฅเธฒ เธเธฃเธธเธ“เธฒเธฃเธตเน€เธเธฃเธเธเนเธญเธกเธนเธฅเธฅเนเธฒเธชเธธเธ”เธเนเธญเธเธ—เธณเธเธฒเธฃเนเธเนเนเธ";
        setSaveErrorMsg(conflictMsg);
        setConflictMessage(conflictMsg);
      } else {
        setSaveStatus("error");
        setSaveErrorMsg(err.response?.data?.error || err.message || "Unknown error");
      }
    }
  }, [isAdmin, serverVersion, hasConflict]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  const [isDragging, setIsDragging] = useState(false);

  // Auto-save trigger
  useEffect(() => {
    if (!isMounted || !data || !isAdmin) return;
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      handleSaveRef.current(data);
    }, 1500); // Debounce auto-save
    return () => clearTimeout(timer);
  }, [data, isMounted, isAdmin]);

  // โ”€โ”€ Player Search โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const handleSearchPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerSearchQuery.trim() || !data) return;
    
    const q = playerSearchQuery.trim().toLowerCase();
    // Bug Fix: search on member.name explicitly (handles edge cases where key โ  name)
    const targetMember = Object.values(data.members).find(m => m.name.toLowerCase().includes(q));
    const targetId = targetMember?.id;
    
    if (targetId) {
      // Find where they are assigned
      const assignedEl = document.getElementById(`member-assigned-${targetId}`);
      if (assignedEl) {
        assignedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        assignedEl.classList.add('ring-4', 'ring-pink-500', 'animate-pulse', 'z-50', 'relative');
        setTimeout(() => assignedEl.classList.remove('ring-4', 'ring-pink-500', 'animate-pulse', 'z-50', 'relative'), 3000);
      } else {
        const unassignedEl = document.getElementById(`member-unassigned-${targetId}`);
        if (unassignedEl) {
           setIsUnassignedCollapsed(false);
           setTimeout(() => {
             const uEl = document.getElementById(`member-unassigned-${targetId}`);
             if (uEl) {
               uEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
               uEl.classList.add('ring-4', 'ring-pink-500', 'animate-pulse', 'z-50', 'relative');
               setTimeout(() => uEl.classList.remove('ring-4', 'ring-pink-500', 'animate-pulse', 'z-50', 'relative'), 3000);
             }
           }, 150);
        } else if (data.offlineIds.includes(targetId)) {
           setActiveTab("leave");
           alert(`เธเธนเนเน€เธฅเนเธ ${targetMember?.name ?? targetId} เธญเธขเธนเนเนเธเธชเธ–เธฒเธเธฐเธฅเธฒ/เธญเธญเธเนเธฅเธเน`);
        }
      }
      setPlayerSearchQuery(""); // clear after search
    } else {
      alert("เนเธกเนเธเธเธเธนเนเน€เธฅเนเธเธ—เธตเนเธเนเธเธซเธฒ");
    }
  };

  // โ”€โ”€ Derived values โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const mainPlayerCount = !data ? 0 : data.zones
    .filter(z => z.type === "main")
    .flatMap(z => z.teamOrder)
    .reduce((sum, colId) => {
      const col = data.columns[colId];
      return sum + (col ? col.memberIds.filter(id => id !== null).length : 0);
    }, 0);

  const mainTeamCount = !data ? 0 : data.zones
    .filter(z => z.type === "main")
    .reduce((sum, z) => sum + z.teamOrder.length, 0);

  const canAddMainTeam = mainPlayerCount < 60 && mainTeamCount < 12;

  // โ”€โ”€ Zone management โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const addZone = (type: "main" | "sub") => {
    if (!data) return;
    const id = `zone-${genId()}`;
    const zoneCount = data.zones.filter(z => z.type === type).length;
    const name = type === "main" ? `เนเธเธ ${zoneCount + 1}` : `เธชเธเธฒเธกเธฃเธญเธ ${zoneCount + 1}`;
    setData({ ...data, zones: [...data.zones, { id, name, type, teamOrder: [] }] });
  };

    const renameTeam = (colId: string, newTitle: string) => {
    if (!data) return;
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: { ...prev.columns, [colId]: { ...prev.columns[colId], title: newTitle } }
      };
    });
  };

  const autoRunTeamNumbers = () => {
    if (!data || !confirm("ต้องการให้ระบบเรียงลำดับเลขทีมใหม่ (ทีม 1, ทีม 2, ...) เรียงตามโซนใช่หรือไม่?")) return;
    setData(prev => {
      if (!prev) return prev;
      const newCols = { ...prev.columns };
      let mainCounter = 1;
      let subCounter = 1;
      prev.zones.forEach(z => {
        z.teamOrder.forEach(colId => {
          if (newCols[colId]) {
            newCols[colId].title = z.type === 'main' ? 'ทีม ' + (mainCounter++) : 'ทีมรอง ' + (subCounter++);
          }
        });
      });
      return { ...prev, columns: newCols };
    });
  };

  const deleteZone = (zoneId: string) => {
    if (!data) return;
    const zone = data.zones.find(z => z.id === zoneId);
    if (!zone) return;
    if (zone.teamOrder.length > 0) {
      if (!confirm(`เนเธเธเธเธตเนเธกเธต ${zone.teamOrder.length} เธ—เธตเธก เธ•เนเธญเธเธเธฒเธฃเธฅเธเนเธเธเนเธฅเธฐเธขเนเธฒเธขเธชเธกเธฒเธเธดเธเธ—เธฑเนเธเธซเธกเธ”เธเธฅเธฑเธเนเธเธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธ” เนเธเนเธซเธฃเธทเธญเนเธกเน?`)) return;
    }
    const newData = { ...data };
    const newCols = { ...newData.columns };
    const unassignedIds = [...newCols["unassigned"].memberIds] as string[];
    zone.teamOrder.forEach(colId => {
      const col = newCols[colId];
      if (col) { col.memberIds.forEach(id => { if (id) unassignedIds.push(id); }); delete newCols[colId]; }
    });
    newCols["unassigned"] = { ...newCols["unassigned"], memberIds: unassignedIds };
    setData({ ...newData, columns: newCols, zones: newData.zones.filter(z => z.id !== zoneId) });
  };

  const renameZone = (zoneId: string, name: string) => {
    if (!data || !name.trim()) return;
    setData({ ...data, zones: data.zones.map(z => z.id === zoneId ? { ...z, name: name.trim() } : z) });
    setEditingZoneId(null);
  };

  const addTeamToZone = (zoneId: string) => {
    if (!data) return;
    const zone = data.zones.find(z => z.id === zoneId);
    if (!zone) return;
    if (zone.type === "main" && !canAddMainTeam) { alert("เธชเธเธฒเธกเธซเธฅเธฑเธเธกเธตเธเธฃเธ 60 เธเธ (12 เธ—เธตเธก) เนเธฅเนเธง"); return; }
    const allTeamNums = Object.keys(data.columns)
      .filter(id => id.startsWith(zone.type === "main" ? "main-" : "sub-"))
      .map(id => parseInt(id.split("-")[1])).filter(n => !isNaN(n));
    const nextNum = allTeamNums.length > 0 ? Math.max(...allTeamNums) + 1 : 1;
    const colId = `${zone.type === "main" ? "main" : "sub"}-${nextNum}-${genId().slice(0, 4)}`;
    const title = zone.type === "main" ? `เธ—เธตเธก ${nextNum}` : `เธ—เธตเธกเธฃเธญเธ ${nextNum}`;
    setData({
      ...data,
      columns: { ...data.columns, [colId]: { id: colId, title, memberIds: [null, null, null, null, null], type: zone.type, locked: false } },
      zones: data.zones.map(z => z.id === zoneId ? { ...z, teamOrder: [...z.teamOrder, colId] } : z),
    });
  };

  const removeTeamFromZone = (zoneId: string, colId: string) => {
    if (!data) return;
    const col = data.columns[colId];
    if (!col) return;
    if (col.locked) { alert("เธ—เธตเธกเธเธตเนเธ–เธนเธเธฅเนเธญเธเธญเธขเธนเน เธเธฅเธ”เธฅเนเธญเธเธเนเธญเธเธฅเธ"); return; }
    const newCols = { ...data.columns };
    const unassignedIds = [...newCols["unassigned"].memberIds] as string[];
    col.memberIds.forEach(id => { if (id) unassignedIds.push(id); });
    delete newCols[colId];
    newCols["unassigned"] = { ...newCols["unassigned"], memberIds: unassignedIds };
    setData({ ...data, columns: newCols, zones: data.zones.map(z => z.id === zoneId ? { ...z, teamOrder: z.teamOrder.filter(id => id !== colId) } : z) });
  };

  // โ”€โ”€ Auto-match โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const handlePullTop60 = () => {
    if (!data) return;
    const all = Object.values(data.members)
      .filter(m => !data.offlineIds.includes(m.id))
      .sort((a, b) => b.power - a.power);
    const priests = all.filter(m => m.job === "Priest").slice(0, 12);
    const priestCount = priests.length;
    // UX 2: Compensate โ€” if fewer than 12 Priests, fill remaining slots with top NonPriests
    const nonPriestSlots = 60 - priestCount;
    const nonPriests = all.filter(m => m.job !== "Priest").slice(0, nonPriestSlots);
    const top60 = [...priests, ...nonPriests].sort((a, b) => b.power - a.power);
    setAutoModalText(top60.map(m => m.name).join("\n"));
    if (priestCount < 12) {
      // Warn inline โ€” the allocator will also show a PRIEST_MISSING warning in preview
      console.warn(`[handlePullTop60] Priest เธเนเธญเธขเธเธงเนเธฒ 12 เธเธ (เธกเธตเนเธเน ${priestCount} เธเธ) โ€” เน€เธ•เธดเธก NonPriest เธเธ”เน€เธเธข`);
    }
  };

  const handleProcessAutoMatch = () => {
    if (!data) return;
    const names = autoModalText.split("\n").map(n => n.trim()).filter(Boolean);
    const mainZones = data.zones.filter(z => z.type === "main");
    const subZones = data.zones.filter(z => z.type === "sub");
    const result = allocateTeams({
      members: data.members as any,
      columns: data.columns as any,
      mainZone1Order: mainZones[0]?.teamOrder || [],
      mainZone2Order: mainZones[1]?.teamOrder || [],
      subOrder: subZones.flatMap(z => z.teamOrder),
      offlineIds: data.offlineIds || [],
      mainFieldNames: names,
    });
    setPreviewResult(result);
  };

  const handleApplyAllocation = () => {
    if (!previewResult || !data) return;
    const mainZones = data.zones.filter(z => z.type === "main");
    const subZones = data.zones.filter(z => z.type === "sub");
    const newZones = data.zones.map(z => {
      if (z.type === "main" && z.id === mainZones[0]?.id) return { ...z, teamOrder: previewResult.mainZone1Order };
      if (z.type === "main" && z.id === mainZones[1]?.id) return { ...z, teamOrder: previewResult.mainZone2Order };
      if (z.type === "sub" && z.id === subZones[0]?.id) return { ...z, teamOrder: previewResult.subOrder };
      return z;
    });
    setData({ ...data, columns: previewResult.columns as any, zones: newZones });
    setPreviewResult(null);
    setIsAutoModalOpen(false);
  };

  const handleConfirmClearAll = () => {
    if (!data || isClearing) return;
    setIsClearing(true);
    try {
      const newData = { ...data, columns: { ...data.columns } };
      const unassignedIds = [...newData.columns["unassigned"].memberIds] as string[];
      Object.keys(newData.columns).forEach(colId => {
        if (colId === "unassigned" || newData.columns[colId].locked) return;
        newData.columns[colId].memberIds.forEach(id => { if (id) unassignedIds.push(id); });
        newData.columns[colId] = { ...newData.columns[colId], memberIds: [null, null, null, null, null] };
      });
      newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: unassignedIds };
      setData(newData);
      setIsClearConfirmOpen(false);
    } finally {
      setIsClearing(false);
    }
  };

  const toggleLock = (colId: string) => {
    if (!data) return;
    setData({ ...data, columns: { ...data.columns, [colId]: { ...data.columns[colId], locked: !data.columns[colId].locked } } });
  };

  const clearTeam = (colId: string) => {
    if (!data || data.columns[colId].locked) return;
    const newData = { ...data, columns: { ...data.columns } };
    const unassignedIds = [...newData.columns["unassigned"].memberIds] as string[];
    newData.columns[colId].memberIds.forEach(id => { if (id) unassignedIds.push(id); });
    newData.columns[colId] = { ...newData.columns[colId], memberIds: [null, null, null, null, null] };
    newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: unassignedIds };
    setData(newData);
  };

  const removeMember = (colId: string, memberId: string) => {
    if (!data || data.columns[colId].locked) return;
    const newData = { ...data, columns: { ...data.columns } };
    const idx = newData.columns[colId].memberIds.indexOf(memberId);
    if (idx !== -1) newData.columns[colId].memberIds[idx] = null;
    newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: [memberId, ...newData.columns["unassigned"].memberIds as string[]] };
    setData(newData);
  };

  const markAsOffline = (memberId: string) => {
    if (!data || !memberId) return;
    const newData = { ...data, columns: { ...data.columns } };
    if (!newData.offlineIds.includes(memberId)) newData.offlineIds = [...newData.offlineIds, memberId];
    newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: newData.columns["unassigned"].memberIds.filter(id => id !== memberId) };
    Object.keys(newData.columns).forEach(colId => {
      if (colId === "unassigned") return;
      const idx = newData.columns[colId].memberIds.indexOf(memberId);
      if (idx !== -1) newData.columns[colId] = { ...newData.columns[colId], memberIds: newData.columns[colId].memberIds.map((id, i) => i === idx ? null : id) };
    });
    setData(newData);
  };

  const removeFromOffline = (memberId: string) => {
    if (!data || !memberId) return;
    const newData = { ...data, columns: { ...data.columns } };
    newData.offlineIds = newData.offlineIds.filter(id => id !== memberId);
    if (newData.members[memberId] && !newData.columns["unassigned"].memberIds.includes(memberId)) {
      newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: [memberId, ...newData.columns["unassigned"].memberIds as string[]] };
    }
    setData(newData);
  };

    const onDragStart = () => {
    setIsDragging(true);
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    if (!data) return;
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    const newData = { ...data, zones: [...data.zones], columns: { ...data.columns } };

    // Team reordering between zones
    if (type === "TEAM") {
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;
      const srcZoneIdx = newData.zones.findIndex(z => z.id === source.droppableId);
      const dstZoneIdx = newData.zones.findIndex(z => z.id === destination.droppableId);
      if (srcZoneIdx === -1 || dstZoneIdx === -1) return;
      // Bug Fix: prevent dragging a team across zone types (main โ” sub)
      if (newData.zones[srcZoneIdx].type !== newData.zones[dstZoneIdx].type) return;
      const srcZone = { ...newData.zones[srcZoneIdx], teamOrder: [...newData.zones[srcZoneIdx].teamOrder] };
      const dstZone = srcZoneIdx === dstZoneIdx ? srcZone : { ...newData.zones[dstZoneIdx], teamOrder: [...newData.zones[dstZoneIdx].teamOrder] };
      srcZone.teamOrder.splice(source.index, 1);
      dstZone.teamOrder.splice(destination.index, 0, draggableId);
      newData.zones[srcZoneIdx] = srcZone;
      if (srcZoneIdx !== dstZoneIdx) newData.zones[dstZoneIdx] = dstZone;
      setData(newData);
      return;
    }

    // Member drag
    if (source.droppableId === "unassigned" && destination.droppableId === "unassigned") {
      const ids = Array.from(newData.columns["unassigned"].memberIds);
      const realIdx = ids.indexOf(draggableId);
      if (realIdx !== -1) { ids.splice(realIdx, 1); ids.splice(destination.index, 0, draggableId); }
      newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: ids };
      setData(newData);
      return;
    }

    const isSourceUnassigned = source.droppableId === "unassigned";
    const [sourceColId, sourceSlotIdxStr] = source.droppableId.split("::");
    const sourceSlotIdx = parseInt(sourceSlotIdxStr);
    const isDestUnassigned = destination.droppableId === "unassigned";
    const [destColId, destSlotIdxStr] = destination.droppableId.split("::");
    const destSlotIdx = parseInt(destSlotIdxStr);

    if (!isSourceUnassigned && newData.columns[sourceColId]?.locked) return;
    if (!isDestUnassigned && newData.columns[destColId]?.locked) return;

    if (isSourceUnassigned && !isDestUnassigned) {
      const realSrcIdx = newData.columns["unassigned"].memberIds.indexOf(draggableId);
      if (realSrcIdx !== -1) newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: [...newData.columns["unassigned"].memberIds].filter((_, i) => i !== realSrcIdx) };
      const cur = [...newData.columns[destColId].memberIds];
      if (cur[destSlotIdx] !== null) {
        cur.splice(destSlotIdx, 0, draggableId);
        const nullIdx = cur.findIndex((v, i) => i > destSlotIdx && v === null);
        if (nullIdx !== -1) cur.splice(nullIdx, 1);
        else {
          // Bug Fix: find last real member (non-null) to kick โ€” avoid accidentally popping null
          const lastMemberIdx = cur.reduce((lastIdx, v, i) => (v !== null ? i : lastIdx), -1);
          const kicked = lastMemberIdx !== -1 ? cur[lastMemberIdx] : null;
          if (lastMemberIdx !== -1) cur.splice(lastMemberIdx, 1);
          if (kicked) newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: [kicked, ...newData.columns["unassigned"].memberIds as string[]] };
        }
      } else { cur[destSlotIdx] = draggableId; }
      newData.columns[destColId] = { ...newData.columns[destColId], memberIds: cur.slice(0, 5) };
    } else if (!isSourceUnassigned && isDestUnassigned) {
      const memberToMove = newData.columns[sourceColId].memberIds[sourceSlotIdx];
      newData.columns[sourceColId] = { ...newData.columns[sourceColId], memberIds: newData.columns[sourceColId].memberIds.map((v, i) => i === sourceSlotIdx ? null : v) };
      if (memberToMove) newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: [...newData.columns["unassigned"].memberIds.slice(0, destination.index), memberToMove, ...newData.columns["unassigned"].memberIds.slice(destination.index)] };
    } else if (!isSourceUnassigned && !isDestUnassigned) {
      const memberA = newData.columns[sourceColId].memberIds[sourceSlotIdx];
      if (sourceColId === destColId) {
        const cur = [...newData.columns[destColId].memberIds];
        cur.splice(sourceSlotIdx, 1);
        cur.splice(destSlotIdx, 0, memberA);
        while (cur.length < 5) cur.push(null);
        newData.columns[destColId] = { ...newData.columns[destColId], memberIds: cur.slice(0, 5) };
      } else {
        newData.columns[sourceColId] = { ...newData.columns[sourceColId], memberIds: newData.columns[sourceColId].memberIds.map((v, i) => i === sourceSlotIdx ? null : v) };
        const dst = [...newData.columns[destColId].memberIds];
        dst.splice(destSlotIdx, 0, memberA);
        const nullIdx = dst.findIndex((v, i) => i > destSlotIdx && v === null);
        if (nullIdx !== -1) dst.splice(nullIdx, 1);
        else {
          // Bug Fix: find last real member (non-null) to kick โ€” avoid accidentally popping null
          const lastMemberIdx = dst.reduce((lastIdx, v, i) => (v !== null ? i : lastIdx), -1);
          const kicked = lastMemberIdx !== -1 ? dst[lastMemberIdx] : null;
          if (lastMemberIdx !== -1) dst.splice(lastMemberIdx, 1);
          if (kicked) newData.columns["unassigned"] = { ...newData.columns["unassigned"], memberIds: [kicked, ...newData.columns["unassigned"].memberIds as string[]] };
        }
        newData.columns[destColId] = { ...newData.columns[destColId], memberIds: dst.slice(0, 5) };
      }
    }
    setData(newData);
  };

  if (!isMounted || isLoading) return <div className="flex h-screen items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅ...</div>;
  if (!data) return null;

  const filteredUnassignedIds = (data.columns["unassigned"]?.memberIds as string[] || []).filter(id => {
    if (!id || !data.members[id]) return false;
    if (unassignedFilterJobs.length > 0 && !unassignedFilterJobs.includes(data.members[id]?.job)) return false;
    if (unassignedSearch && !data.members[id]?.name?.toLowerCase().includes(unassignedSearch.toLowerCase())) return false;
    return true;
  });

  const AutoMatchModal = () => {
    // Modal implementation omitted for brevity
    if (!isAutoModalOpen) return null;
    const names = autoModalText.split("\n").map(n => n.trim()).filter(n => n);
    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-theme-panel rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-theme-border animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-theme-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-theme-text">{previewResult ? "เธ•เธฑเธงเธญเธขเนเธฒเธเธเธฅเธเธฒเธฃเธเธฑเธ”เธ—เธตเธกเธญเธฑเธ•เนเธเธกเธฑเธ•เธด (Preview)" : "เธเธณเธซเธเธ”เธฃเธฒเธขเธเธทเนเธญเธชเธเธฒเธกเธซเธฅเธฑเธ (60 เธเธ)"}</h3>
            <button onClick={() => { setIsAutoModalOpen(false); setPreviewResult(null); }} className="text-theme-textSecondary hover:text-theme-text"><X size={20} /></button>
          </div>
          {previewResult ? (
            <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-3">เธเธฅเธเธฒเธฃเธเธณเธเธงเธ“เธเธฒเธฃเธเธฑเธ”เธ—เธตเธก</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-[#232733] p-3 rounded-lg border border-emerald-200/50 dark:border-[#2D3342]">
                    <span className="text-slate-500 dark:text-slate-400 block text-xs">เธชเธเธฒเธกเธซเธฅเธฑเธ</span>
                    <span className="font-bold text-xl text-slate-800 dark:text-white">{previewResult.stats.mainTotal} / 60 เธเธ</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 block mt-1">เธกเธต Priest {previewResult.stats.priestFullTeams} เธ—เธตเธก</span>
                  </div>
                  <div className="bg-white dark:bg-[#232733] p-3 rounded-lg border border-emerald-200/50 dark:border-[#2D3342]">
                    <span className="text-slate-500 dark:text-slate-400 block text-xs">เธชเธเธฒเธกเธฃเธญเธ</span>
                    <span className="font-bold text-xl text-slate-800 dark:text-white">{previewResult.stats.subTotal} เธเธ</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">เธเธฑเธ”เนเธ”เน {previewResult.stats.subTeams} เธ—เธตเธก</span>
                  </div>
                </div>
              </div>
              {previewResult.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-bold mb-1">เธเธณเน€เธ•เธทเธญเธ:</div>
                  {previewResult.warnings.map((w, i) => <div key={i}>โ€ข {w.message}</div>)}
                </div>
              )}
              <p className="text-xs text-slate-500">เธเธ” &quot;เธขเธทเธเธขเธฑเธเธเธณเนเธเนเธเนเธเธฒเธ&quot; เน€เธเธทเนเธญเนเธ—เธเธ—เธตเนเธเธฒเธฃเธเธฑเธ”เธ—เธตเธก (เธขเธฑเธเธชเธฒเธกเธฒเธฃเธ–เธเธฃเธฑเธเธเนเธญเธเธเธฑเธเธ—เธถเธเธเธฃเธดเธ)</p>
            </div>
          ) : (
            <div className="p-4 flex-1 flex flex-col gap-4">
              <p className="text-sm text-theme-textSecondary">เธฃเธฐเธเธธเธฃเธฒเธขเธเธทเนเธญ 60 เธเธ เธชเธณเธซเธฃเธฑเธเธชเธเธฒเธกเธซเธฅเธฑเธ (เธเธฃเธฃเธ—เธฑเธ”เธฅเธฐ 1 เธเธทเนเธญ)</p>
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-3 text-sm text-[#0b3d63] dark:text-white flex items-start gap-2">
                <span className="font-bold">เธเธณเนเธเธฐเธเธณ:</span> เธเธฐเธเธฑเธ”เน€เธฅเธทเธญเธ Priest 12 เธเธเธชเธณเธซเธฃเธฑเธเธชเธเธฒเธกเธซเธฅเธฑเธเนเธซเนเธญเธฑเธ•เนเธเธกเธฑเธ•เธด
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-theme-text">เธ•เธฃเธงเธเธเธ: {names.length} / 60 เธเธ</span>
                <button onClick={handlePullTop60} className="text-[#0b3d63] dark:text-white font-bold text-sm bg-[#0b3d63]/10 dark:bg-[#3B66D1]/20 px-4 py-1.5 rounded-lg hover:bg-[#0b3d63]/20 transition-colors border border-[#0b3d63]/20">เธ”เธถเธ 60 เธเธฅเธฑเธเธชเธนเธเธชเธธเธ”</button>
              </div>
              <textarea className="w-full h-[250px] bg-theme-bg border border-theme-border rounded-lg p-3 text-sm text-theme-text font-mono resize-none focus:ring-2 focus:ring-[#4D73CD] outline-none" value={autoModalText} onChange={e => setAutoModalText(e.target.value)} placeholder="เธงเธฒเธเธฃเธฒเธขเธเธทเนเธญเธ—เธตเนเธเธตเน (1 เธเธฃเธฃเธ—เธฑเธ”เธ•เนเธญ 1 เธเธทเนเธญ)" />
            </div>
          )}
          <div className="p-4 border-t border-theme-border flex items-center justify-end gap-3 bg-theme-bg/50">
            {previewResult ? (
              <>
                <button onClick={() => setPreviewResult(null)} className="px-5 py-2 rounded-lg font-bold text-theme-textSecondary hover:bg-theme-border/50 transition-colors border border-theme-border bg-theme-panel text-sm">เธเธฅเธฑเธเนเธเนเธเนเนเธ</button>
                <button onClick={handleApplyAllocation} className="px-5 py-2 rounded-lg font-bold text-white bg-[#10b981] hover:bg-[#059669] transition-colors shadow-sm text-sm">เธขเธทเธเธขเธฑเธเธเธณเนเธเนเธเนเธเธฒเธ</button>
              </>
            ) : (
              <>
                <button onClick={() => setIsAutoModalOpen(false)} className="px-5 py-2 rounded-lg font-bold text-theme-textSecondary hover:bg-theme-border/50 transition-colors border border-theme-border bg-theme-panel text-sm">เธขเธเน€เธฅเธดเธ</button>
                <button onClick={handleProcessAutoMatch} className="px-5 py-2 rounded-lg font-bold text-white bg-[#3B66D1] hover:bg-[#4D73CD] transition-colors shadow-sm text-sm">เธเธฃเธฐเธกเธงเธฅเธเธฅ (Preview)</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ZoneHeader = ({ zone }: { zone: Zone }) => {
    const isEditing = editingZoneId === zone.id;
    const mainCap = zone.type === "main" && !canAddMainTeam;
    return (
      <div className="flex items-center gap-3 mb-4">
        <LayoutGrid size={18} className="text-[#0b3d63] dark:text-white shrink-0" />
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input autoFocus value={editingZoneName} onChange={e => setEditingZoneName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") renameZone(zone.id, editingZoneName); if (e.key === "Escape") setEditingZoneId(null); }} className="font-bold text-lg bg-white dark:bg-[#272C38] border border-[#4D73CD] rounded-lg px-2 py-0.5 text-slate-800 dark:text-white outline-none" />
            <button onClick={() => renameZone(zone.id, editingZoneName)} className="text-emerald-500 hover:text-emerald-600"><Check size={18} /></button>
            <button onClick={() => setEditingZoneId(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
        ) : (
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex-1">{zone.name}</h2>
        )}
        <span className="text-xs bg-slate-100 dark:bg-[#272C38] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">{zone.teamOrder.length} เธ—เธตเธก</span>
        {isAdmin && !isEditing && (
          <button onClick={() => { setEditingZoneId(zone.id); setEditingZoneName(zone.name); }} className="text-slate-400 hover:text-[#3B66D1] transition-colors" title="เนเธเนเธเธทเนเธญเนเธเธ"><Edit2 size={15} /></button>
        )}
        {isAdmin && (
          <button onClick={() => addTeamToZone(zone.id)} disabled={mainCap} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${mainCap ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-[#272C38] text-slate-400" : "bg-[#0b3d63] dark:bg-[#3B66D1] text-white hover:bg-[#0d4b7a] dark:hover:bg-[#4D73CD]"}`} title={mainCap ? "เธชเธเธฒเธกเธซเธฅเธฑเธเน€เธ•เนเธก 60 เธเธ (12 เธ—เธตเธก)" : "เน€เธเธดเนเธกเธ—เธตเธกเนเธเนเธเธเธเธตเน"}>
            <Plus size={13} /> เน€เธเธดเนเธกเธ—เธตเธก
          </button>
        )}
        {isAdmin && (
          <button onClick={() => deleteZone(zone.id)} className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors" title="เธฅเธเนเธเธเธเธตเน"><Trash2 size={15} /></button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-3 sm:p-4 lg:py-6 lg:px-6 2xl:px-8 relative">
      <AutoMatchModal />

      {/* Header */}
      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] p-4 sm:p-5 mb-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0b3d63] dark:bg-[#3B66D1] shadow-sm"><Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">เธเธฑเธ”เธ—เธตเธก GVG</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B93A7]">{isAdmin ? "เธฅเธฒเธเนเธฅเธฐเธงเธฒเธเน€เธเธทเนเธญเธเธฑเธ”เธ—เธตเธก (เธฃเธฐเธเธเธเธฑเธเธ—เธถเธเธญเธฑเธ•เนเธเธกเธฑเธ•เธด)" : "เธฃเธฒเธขเธเธทเนเธญเนเธฅเธฐเธชเธกเธฒเธเธดเธเธ—เธตเธกเธชเธณเธซเธฃเธฑเธเธเธดเธฅเธ”เนเธงเธญเธฃเน"}</p>
            </div>
          </div>
        </div>
        
        {/* New Player Search Bar for everyone */}
                {/* New Player Search Bar for everyone */}
        <div className="flex-1 max-w-sm w-full relative">
          <form onSubmit={handleSearchPlayer} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              value={playerSearchQuery}
              onChange={e => setPlayerSearchQuery(e.target.value)}
              placeholder="ค้นหาตำแหน่งผู้เล่น..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#3B66D1] text-slate-800 dark:text-white"
            />
          </form>
          {playerSearchQuery.trim() !== "" && (
            <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-hidden">
              {(() => {
                const q = playerSearchQuery.trim().toLowerCase();
                const matches = data ? Object.values(data.members).filter(m => m.name.toLowerCase().includes(q)).sort((a,b) => a.name.localeCompare(b.name)).slice(0, 5) : [];
                if (matches.length === 0) return <div className="p-3 text-sm text-slate-500 text-center">ไม่พบชื่อผู้เล่น</div>;
                return matches.map(m => (
                  <div key={m.id} onClick={() => { setPlayerSearchQuery(m.name); setTimeout(() => handleSearchPlayer({preventDefault:()=>({})} as any), 50); }} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#343B4B] cursor-pointer text-sm font-bold text-slate-800 dark:text-white flex justify-between items-center border-b border-slate-100 dark:border-[#2D3342] last:border-0">
                    <span>{m.name}</span>
                    <span className="text-[10px] text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: JOB_COLORS[m.job] || "#475569" }}>{m.job}</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-end flex-wrap">
            <div className="flex flex-col sm:flex-row items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-50 dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] mr-2 transition-all" title={saveErrorMsg}>
              {saveStatus === 'idle' && <span className="text-slate-500 font-bold">เธเธฃเนเธญเธกเนเธเนเธเธฒเธ</span>}
              {saveStatus === 'saving' && <span className="text-[#3B66D1] flex items-center gap-1 font-bold"><Loader2 className="w-4 h-4 animate-spin"/> เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...</span>}
              {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1 font-bold"><CheckCircle2 className="w-4 h-4"/> เธเธฑเธเธ—เธถเธเธญเธฑเธ•เนเธเธกเธฑเธ•เธดเนเธฅเนเธง</span>}
              {saveStatus === 'error' && <span className="text-red-500 flex items-center gap-1 font-bold cursor-pointer"><X className="w-4 h-4"/> เธเธฑเธเธ—เธถเธเนเธกเนเธชเธณเน€เธฃเนเธ</span>}
              {saveStatus === 'error' && saveErrorMsg && <span className="text-xs text-red-400 truncate max-w-[150px]">({saveErrorMsg})</span>}
            </div>
            {/* UX 1: Auto-match button restored */}
            <button onClick={() => setIsAutoModalOpen(true)} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[#272C38] text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 rounded-xl font-bold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors text-xs sm:text-sm shadow-sm">
              <Wand2 size={16} /> เธเธฑเธ”เธ—เธตเธกเธญเธฑเธ•เนเธเธกเธฑเธ•เธด
            </button>
            <button onClick={() => setIsClearConfirmOpen(true)} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[#272C38] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs sm:text-sm shadow-sm">
              <Trash2 size={16} /> เธฅเนเธฒเธเธ—เธตเธก
            </button>
            <button onClick={handleExportPNG} disabled={isExporting} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-[#272C38] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-xl font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-xs sm:text-sm shadow-sm disabled:opacity-50">
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
              {isExporting ? "เธเธณเธฅเธฑเธเธญเธญเธเน€เธญเธเธชเธฒเธฃ..." : "Export PNG"}
            </button>
          </div>
        )}
      </div>

      {hasConflict && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <span className="font-semibold">{conflictMessage || "เธเนเธญเธกเธนเธฅเธ—เธตเธกเนเธเธฃเธฐเธเธเธกเธตเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธเธเธฒเธ Admin เธ—เนเธฒเธเธญเธทเนเธ เธซเธฃเธทเธญเธกเธตเธชเธกเธฒเธเธดเธเนเธเนเธเธฅเธฒ เธฃเธฐเธเธเธฃเธฐเธเธฑเธเธเธฒเธฃเธเธฑเธเธ—เธถเธเธ—เธฑเธเธเธฑเนเธงเธเธฃเธฒเธงเน€เธเธทเนเธญเธเนเธญเธเธเธฑเธเธเนเธญเธกเธนเธฅเธชเธนเธเธซเธฒเธข"}</span>
          </div>
          <button
            onClick={() => {
              fetchData();
              setHasConflict(false);
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm flex-shrink-0 transition-all shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> เธฃเธตเน€เธเธฃเธเน€เธเธทเนเธญเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธฅเนเธฒเธชเธธเธ”
          </button>
        </div>
      )}

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Unassigned Panel */}
          {isAdmin && !isUnassignedCollapsed && (
            <div className="w-full lg:w-[260px] 2xl:w-[280px] flex-shrink-0 bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] h-[400px] lg:h-[calc(100vh-2rem)] flex flex-col lg:sticky top-4 z-20">
              <div className="p-3 border-b border-slate-100 dark:border-[#2D3342] bg-slate-50/70 dark:bg-[#272C38]/50 rounded-t-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm"><Users size={16} /> เธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธ” ({data.columns["unassigned"].memberIds.length})</h2>
                  <button onClick={() => setIsUnassignedCollapsed(true)} className="text-slate-400 dark:text-[#8B93A7] hover:text-slate-700 bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] rounded-lg p-1"><ChevronLeft size={14} /></button>
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="เธเนเธเธซเธฒเธเธทเนเธญ..." value={unassignedSearch} onChange={e => setUnassignedSearch(e.target.value)} className="w-full bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#4D73CD]" />
                  <div className="relative" ref={jobFilterDropdownRef}>
                    <button type="button" onClick={() => setIsJobFilterOpen(prev => !prev)} className={`w-full flex items-center justify-between bg-white dark:bg-[#272C38] border ${unassignedFilterJobs.length > 0 ? "border-[#3B66D1] dark:border-[#4D73CD]" : "border-slate-200 dark:border-[#2D3342]"} rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-[#2A2F3E]`}>
                      <div className="flex items-center gap-1.5 truncate">{unassignedFilterJobs.length === 0 ? <span className="text-slate-600 dark:text-[#8B93A7]">เธ—เธธเธเธญเธฒเธเธตเธ ({data.columns["unassigned"].memberIds.length})</span> : <span className="truncate text-[#0b3d63] dark:text-[#82A0F5]">{unassignedFilterJobs.length === 1 ? unassignedFilterJobs[0] : `${unassignedFilterJobs.length} เธญเธฒเธเธตเธ`}</span>}</div>
                      <div className="flex items-center gap-1 shrink-0">
                        {unassignedFilterJobs.length > 0 && <span onClick={e => { e.stopPropagation(); setUnassignedFilterJobs([]); }} className="hover:text-red-500 text-slate-400 p-0.5 rounded cursor-pointer"><X size={12} /></span>}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isJobFilterOpen ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {isJobFilterOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto space-y-1">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 dark:border-[#2D3342] text-[11px]">
                          <button type="button" onClick={() => setUnassignedFilterJobs([])} className="font-bold hover:underline text-slate-500">เน€เธฅเธทเธญเธเธ—เธฑเนเธเธซเธกเธ”</button>
                          {unassignedFilterJobs.length > 0 && <button type="button" onClick={() => setUnassignedFilterJobs([])} className="text-red-500 hover:underline text-[10px] font-bold">เธฅเนเธฒเธ</button>}
                        </div>
                        {JOB_LIST.map(job => {
                          const isChecked = unassignedFilterJobs.includes(job);
                          const count = (data.columns["unassigned"].memberIds as string[]).filter(id => data.members[id]?.job === job).length;
                          return (
                            <label key={job} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#272C38] cursor-pointer text-xs select-none">
                              <div className="flex items-center gap-2"><input type="checkbox" checked={isChecked} onChange={() => setUnassignedFilterJobs(prev => prev.includes(job) ? prev.filter(j => j !== job) : [...prev, job])} className="rounded border-slate-300 text-[#3B66D1]" /><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: JOB_COLORS[job] || "#475569" }} /><span className={`truncate font-medium ${isChecked ? "font-bold text-[#0b3d63] dark:text-[#82A0F5]" : "text-slate-700 dark:text-slate-300"}`}>{job}</span></div>
                              <span className="text-[10px] font-mono text-slate-400">{count}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Droppable droppableId="unassigned" type="MEMBER">
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto p-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? "bg-blue-50/50 dark:bg-[#3B66D1]/25" : ""}`}>
                    {filteredUnassignedIds.map((id, index) => <MemberCard key={id} member={data.members[id]} index={index} />)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )}

          {isAdmin && isUnassignedCollapsed && (
            <div className="w-full lg:w-12 flex-shrink-0 bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] h-12 lg:h-[calc(100vh-2rem)] flex flex-row lg:flex-col items-center justify-between lg:justify-start px-4 lg:px-0 py-2 lg:py-4 sticky top-4 z-10 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#2A2F3E]" onClick={() => setIsUnassignedCollapsed(false)}>
              <div className="flex items-center gap-2"><Users size={18} className="text-slate-400" /><span className="lg:hidden font-bold text-xs text-slate-700 dark:text-slate-300">เนเธชเธ”เธเธฃเธฒเธขเธเธทเนเธญเธ—เธตเนเธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธ”</span></div>
              <div className="flex items-center gap-2"><span className="bg-[#0b3d63] dark:bg-[#3B66D1] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{data.columns["unassigned"].memberIds.length}</span><ChevronRight size={18} className="text-slate-400 lg:mt-4" /></div>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col w-full">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 bg-white dark:bg-[#232733] p-1.5 rounded-xl border border-slate-200 dark:border-[#2D3342] shadow-sm self-start overflow-x-auto max-w-full">
              <button onClick={() => setActiveTab("main")} className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === "main" ? "bg-[#0b3d63] dark:bg-[#3B66D1] text-white shadow-sm" : "text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-[#2A2F3E]"}`}>
                เธชเธเธฒเธกเธซเธฅเธฑเธ ({mainPlayerCount}/60 เธเธ)
              </button>
              <button onClick={() => setActiveTab("sub")} className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === "sub" ? "bg-[#0b3d63] dark:bg-[#3B66D1] text-white shadow-sm" : "text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-[#2A2F3E]"}`}>
                เธชเธเธฒเธกเธฃเธญเธ ({data.zones.filter(z => z.type === "sub").flatMap(z => z.teamOrder).reduce((s, colId) => s + (data.columns[colId]?.memberIds?.filter(id => id !== null)?.length || 0), 0)} เธเธ)
              </button>
              {isAdmin && <button onClick={() => setActiveTab("leave")} className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${activeTab === "leave" ? "bg-red-600 text-white shadow-sm" : "text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-[#2A2F3E]"}`}>เธฅเธฒ/เธญเธญเธเนเธฅเธเน</button>}
            </div>

            <div className="flex-1">
              {activeTab === "main" && (
                <div className="space-y-10 pb-12 bg-[#f0f6fc] dark:bg-[#1C1F27] print-export-padding">
                  {/* 60-player progress bar */}
                  <div className="bg-white dark:bg-[#232733] rounded-xl border border-slate-200 dark:border-[#2D3342] p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-sm font-bold text-slate-700 dark:text-white whitespace-nowrap">เธชเธเธฒเธกเธซเธฅเธฑเธ {mainPlayerCount}/60 เธเธ</span>
                    <div className="flex-1 bg-slate-100 dark:bg-[#272C38] rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${mainPlayerCount >= 60 ? "bg-emerald-500" : mainPlayerCount >= 45 ? "bg-amber-400" : "bg-[#3B66D1]"}`} style={{ width: `${Math.min(100, (mainPlayerCount / 60) * 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${mainPlayerCount >= 60 ? "text-emerald-500" : "text-slate-500"}`}>{mainPlayerCount >= 60 ? "เน€เธ•เนเธก โ“" : `เน€เธซเธฅเธทเธญ ${60 - mainPlayerCount} เธ—เธตเน`}</span>
                  </div>

                  {data.zones.filter(z => z.type === "main").map(zone => (
                    <div key={zone.id}>
                      <ZoneHeader zone={zone} />
                      <Droppable droppableId={zone.id} direction="horizontal" type="TEAM" isDropDisabled={!isAdmin}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 xl:gap-6 min-h-[100px]">
                            {zone.teamOrder.map((colId, index) => data.columns[colId] ? (
                              <TeamCard key={colId} column={data.columns[colId]} members={data.members} index={index} toggleLock={toggleLock} clearTeam={clearTeam} removeMember={removeMember} isAdmin={isAdmin} onRemoveFromZone={isAdmin ? () => removeTeamFromZone(zone.id, colId) : undefined} renameTeam={renameTeam} />
                            ) : null)}
                            {provided.placeholder}
                            {zone.teamOrder.length === 0 && <div className="col-span-full flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#2D3342] text-slate-400 text-sm">เธขเธฑเธเนเธกเนเธกเธตเธ—เธตเธกเนเธเนเธเธเธเธตเน โ€” เธเธ” &quot;เน€เธเธดเนเธกเธ—เธตเธก&quot;</div>}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}

                  {isAdmin && (
                    <button onClick={() => addZone("main")} disabled={!canAddMainTeam} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors border ${canAddMainTeam ? "border-[#3B66D1] text-[#3B66D1] dark:text-[#82A0F5] hover:bg-[#3B66D1]/10" : "border-slate-200 text-slate-400 cursor-not-allowed"}`}>
                      <Plus size={16} /> เธชเธฃเนเธฒเธเนเธเธเนเธซเธกเน (เธชเธเธฒเธกเธซเธฅเธฑเธ)
                    </button>
                  )}
                </div>
              )}

              {activeTab === "sub" && (
                <div className="space-y-10 pb-12 bg-[#f0f6fc] dark:bg-[#1C1F27] print-export-padding">
                  {data.zones.filter(z => z.type === "sub").map(zone => (
                    <div key={zone.id}>
                      <ZoneHeader zone={zone} />
                      <Droppable droppableId={zone.id} direction="horizontal" type="TEAM" isDropDisabled={!isAdmin}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 xl:gap-6 min-h-[100px]">
                            {zone.teamOrder.map((colId, index) => data.columns[colId] ? (
                              <TeamCard key={colId} column={data.columns[colId]} members={data.members} index={index} toggleLock={toggleLock} clearTeam={clearTeam} removeMember={removeMember} isAdmin={isAdmin} onRemoveFromZone={isAdmin ? () => removeTeamFromZone(zone.id, colId) : undefined} renameTeam={renameTeam} />
                            ) : null)}
                            {provided.placeholder}
                            {zone.teamOrder.length === 0 && <div className="col-span-full flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#2D3342] text-slate-400 text-sm">เธขเธฑเธเนเธกเนเธกเธตเธ—เธตเธก โ€” เธเธ” &quot;เน€เธเธดเนเธกเธ—เธตเธก&quot;</div>}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                  {isAdmin && (
                    <button onClick={() => addZone("sub")} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors border border-[#3B66D1] text-[#3B66D1] dark:text-[#82A0F5] hover:bg-[#3B66D1]/10">
                      <Plus size={16} /> เธชเธฃเนเธฒเธเนเธเธเนเธซเธกเน (เธชเธเธฒเธกเธฃเธญเธ)
                    </button>
                  )}
                </div>
              )}

              {activeTab === "leave" && (
                <div className="pb-12 space-y-12">
                  <div>
                    <h2 className="text-lg font-bold text-theme-danger flex items-center gap-2 mb-4"><X size={18} /> เธฃเธฒเธขเธเธทเนเธญเธเธนเนเน€เธฅเนเธเธญเธญเธเนเธฅเธเน</h2>
                    <div className="bg-theme-panel rounded-xl border border-theme-border p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1" ref={offlineDropdownRef}>
                          <div className="bg-theme-bg border border-theme-border rounded-lg px-4 py-2 flex items-center justify-between cursor-pointer" onClick={() => setIsOfflineDropdownOpen(true)}>
                            <input type="text" placeholder="+ เธเนเธเธซเธฒเธเธนเนเน€เธฅเนเธเน€เธเธทเนเธญเธ—เธณเนเธซเนเธญเธญเธเนเธฅเธเน..." className="bg-transparent border-none outline-none text-sm font-bold text-theme-text w-full" value={offlineSearch} onChange={e => { setOfflineSearch(e.target.value); setIsOfflineDropdownOpen(true); }} onFocus={() => setIsOfflineDropdownOpen(true)} />
                          </div>
                          {isOfflineDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-theme-panel border border-theme-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                              {Object.values(data.members).filter(m => !data.offlineIds.includes(m.id)).filter(m => m.name.toLowerCase().includes(offlineSearch.toLowerCase()) || m.job.toLowerCase().includes(offlineSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                                <div key={m.id} className="px-4 py-2.5 hover:bg-theme-bg cursor-pointer text-sm font-bold text-theme-text flex justify-between items-center border-b border-theme-divider last:border-0" onClick={() => { markAsOffline(m.id); setOfflineSearch(""); setIsOfflineDropdownOpen(false); }}>
                                  <span>{m.name}</span><span className="text-[10px] text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: JOB_COLORS[m.job] || "#475569" }}>{m.job}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {data.offlineIds.length === 0 ? <div className="text-center py-8 text-theme-textMuted font-bold border-2 border-dashed border-theme-divider rounded-lg">เนเธกเนเธกเธตเธเธนเนเน€เธฅเนเธเธญเธญเธเนเธฅเธเน</div> : (
                        <div className="flex flex-wrap gap-3">
                          {data.offlineIds.map(id => {
                            const m = data.members[id];
                            if (!m) return null;
                            return (
                              <div key={id} className="flex items-center gap-2 bg-theme-bg/80 border border-theme-border rounded-full py-1.5 pl-3 pr-1.5 shadow-sm">
                                <span className="text-sm font-bold text-theme-text">{m.name}</span>
                                <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: JOB_COLORS[m.job] || "#475569" }}>{m.job}</span>
                                <button onClick={() => removeFromOffline(id)} className="p-1 hover:bg-theme-danger hover:text-white rounded-full text-theme-textSecondary transition-colors"><X size={14} /></button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-theme-text flex items-center gap-2 mb-4"><LayoutGrid size={18} className="text-[#0b3d63]" /> เธเธฑเธเธ—เธถเธเธเธฒเธฃเธฅเธฒ</h2>
                    {leaveRecords.length === 0 ? <div className="text-center p-12 bg-theme-panel rounded-xl text-theme-textMuted border border-theme-border font-bold">เนเธกเนเธกเธตเธเนเธญเธกเธนเธฅเธเธฒเธฃเธฅเธฒ</div> : (
                      <div className="bg-theme-panel rounded-xl border border-theme-border overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-theme-bg/50 border-b border-theme-divider text-xs uppercase tracking-wider text-theme-textMuted">
                            <tr><th className="p-4 font-bold">เธเธทเนเธญเนเธเน€เธเธก</th><th className="p-4 font-bold">เธงเธฑเธเธ—เธตเนเธฅเธฒ</th><th className="p-4 font-bold">เน€เธซเธ•เธธเธเธฅ</th><th className="p-4 font-bold w-20 text-center">เธเธฑเธ”เธเธฒเธฃ</th></tr>
                          </thead>
                          <tbody className="divide-y divide-theme-divider">
                            {leaveRecords.map((r: any, i) => (
                              <tr key={r.id || i} className="hover:bg-theme-bg/30">
                                <td className="p-4 font-bold text-theme-text">{r.name}</td>
                                <td className="p-4 font-bold text-theme-textSecondary">{r.date || r.day}</td>
                                <td className="p-4 text-sm text-theme-textMuted">{r.reason || "-"}</td>
                                <td className="p-4 text-center">
                                  <button onClick={async () => { if (confirm(`เธฅเธเธฃเธฒเธขเธเธฒเธฃเธฅเธฒเธเธญเธ ${r.name}?`)) { try { await axios.delete("/api/leave", { data: { id: r.id } }); setLeaveRecords(prev => prev.filter(rec => rec.id !== r.id)); } catch { alert("เธฅเธเนเธกเนเธชเธณเน€เธฃเนเธ"); } } }} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg"><X size={16} /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Clear Team Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-[#2D3342] animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเนเธฒเธเธ—เธตเธก?
              </h3>
              <p className="text-sm text-slate-600 dark:text-[#8B93A7] leading-relaxed">
                เธชเธกเธฒเธเธดเธเธ—เธฑเนเธเธซเธกเธ”เธเธฐเธ–เธนเธเธเธณเธญเธญเธเธเธฒเธเธเธฒเธฃเธเธฑเธ”เธ—เธตเธก เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธ”เธณเน€เธเธดเธเธเธฒเธฃเธ•เนเธญเธซเธฃเธทเธญเนเธกเน?
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-[#272C38]/50 border-t border-slate-100 dark:border-[#2D3342] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#343B4B] transition-colors"
              >
                เธขเธเน€เธฅเธดเธ
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClearAll}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isClearing ? <Loader2 size={16} className="animate-spin" /> : null}
                {isClearing ? "เธเธณเธฅเธฑเธเธฅเนเธฒเธเธ—เธตเธก..." : "เธขเธทเธเธขเธฑเธเธฅเนเธฒเธเธ—เธตเธก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offscreen GVG Export Layout for PNG generation */}
      <div
        style={{
          position: "fixed",
          left: isExporting ? 0 : "-99999px",
          top: isExporting ? 0 : "-99999px",
          zIndex: isExporting ? 99998 : -9999,
          opacity: isExporting ? 1 : 0,
          pointerEvents: "none",
          width: "2200px",
          overflow: "hidden",
        }}
      >
        <GVGExportLayout
          ref={exportLayoutRef}
          zones={data.zones.filter((z) => z.type === (activeTab === "sub" ? "sub" : "main"))}
          columns={data.columns}
          members={data.members}
          title={activeTab === "sub" ? "GVG TEAM SETUP (เธชเธเธฒเธกเธฃเธญเธ)" : "GVG TEAM SETUP"}
        />
      </div>

      {/* Fullscreen loading indicator during PNG generation */}
      {isExporting && (
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
          <div className="text-lg font-bold">เธเธณเธฅเธฑเธเธชเธฃเนเธฒเธเธ เธฒเธเธชเธฃเธธเธ GVG (PNG 1 เธซเธเนเธฒเธเธฃเธฐเธ”เธฒเธฉ)...</div>
          <div className="text-xs text-slate-400">เธเธฃเธธเธ“เธฒเธฃเธญเธชเธฑเธเธเธฃเธนเน เธฃเธฐเธเธเธเธณเธฅเธฑเธเน€เธฃเธเน€เธ”เธญเธฃเนเธ เธฒเธเธเธงเธฒเธกเธฅเธฐเน€เธญเธตเธขเธ”เธชเธนเธ</div>
        </div>
      )}
    </div>
  );
}

function TeamCard({
  column, members, index, toggleLock, clearTeam, removeMember, isAdmin = false, onRemoveFromZone, renameTeam}: {
  column: Column; members: Record<string, Member>; index: number;
  toggleLock: (id: string) => void; clearTeam: (id: string) => void;
  removeMember: (colId: string, memId: string) => void;
  isAdmin?: boolean; onRemoveFromZone?: () => void; renameTeam?: (id: string, t: string) => void;}) {
  const isFull = (column?.memberIds || []).filter(id => id).length === 5;
  const totalPower = (column?.memberIds || []).reduce((sum, id) => sum + (id ? (members[id]?.power || 0) : 0), 0);
  const isSub = column?.type === "sub";

  return (
    <Draggable draggableId={column.id} index={index} isDragDisabled={!isAdmin}>
      {(providedTeam, snapshotTeam) => (
        <div ref={providedTeam.innerRef} {...providedTeam.draggableProps} className={`bg-white dark:bg-[#232733] rounded-2xl shadow-sm border overflow-hidden ${snapshotTeam.isDragging ? "shadow-xl ring-2 ring-[#0b3d63] dark:ring-[#4D73CD] border-[#0b3d63] dark:border-[#4D73CD] z-50" : "border-slate-200 dark:border-[#2D3342]"} ${column.locked ? "opacity-95 border-amber-400 dark:border-amber-500" : ""}`}>
          <div className={`${isSub ? "bg-[#154a72] dark:bg-[#1E2536]" : "bg-[#0b3d63] dark:bg-[#252E42]"} p-3.5 text-white flex items-center justify-between border-b border-transparent dark:border-[#2D3342]`} {...(isAdmin ? providedTeam.dragHandleProps : {})}>
            <div className="flex items-center gap-2">
              {isAdmin && <GripVertical size={16} className="opacity-50 cursor-grab active:cursor-grabbing" />}
                            <h3 
                className="font-bold text-sm tracking-wide cursor-pointer hover:underline flex items-center gap-1" 
                onClick={() => {
                  if (!isAdmin || !renameTeam) return;
                  const newTitle = prompt("ตั้งชื่อทีม:", column.title);
                  if (newTitle && newTitle.trim() !== "") renameTeam(column.id, newTitle.trim());
                }}
                title={isAdmin ? "คลิกเพื่อเปลี่ยนชื่อทีม" : ""}
              >
                {column.title} {isAdmin && <Edit2 size={12} className="opacity-40" />}
              </h3>
              <span className="text-xs bg-black/20 px-2 py-0.5 rounded-md font-mono">{totalPower.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isFull ? "bg-emerald-500 text-white" : "bg-white/20 text-white"}`}>{isFull ? "เธเธฃเธ 5/5" : `${(column?.memberIds || []).filter(id => id).length}/5`}</span>
              {isAdmin && (
                <>
                  <button onClick={() => toggleLock(column.id)} className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${column.locked ? "bg-amber-400 text-slate-900" : "bg-white/15 hover:bg-white/25 text-white"}`}>{column.locked ? <Lock size={12} /> : <Unlock size={12} />} {column.locked ? "เธฅเนเธญเธ" : "เธเธฅเธ”เธฅเนเธญเธ"}</button>
                  <button onClick={() => clearTeam(column.id)} className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-md transition-colors disabled:opacity-40" disabled={column.locked} title="เธฅเนเธฒเธเธ—เธตเธก"><X size={12} strokeWidth={3} /></button>
                  {onRemoveFromZone && <button onClick={onRemoveFromZone} className="bg-white/10 hover:bg-red-500/80 text-white p-1 rounded-md transition-colors" title="เธฅเธเธ—เธตเธกเธญเธญเธเธเธฒเธเนเธเธ"><Trash2 size={12} /></button>}
                </>
              )}
            </div>
          </div>

          <div className={`grid ${isAdmin ? "grid-cols-[30px_minmax(0,1fr)_85px_50px_22px] sm:grid-cols-[36px_minmax(0,1fr)_115px_60px_24px]" : "grid-cols-[30px_minmax(0,1fr)_85px_50px] sm:grid-cols-[36px_minmax(0,1fr)_115px_60px]"} gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-[#272C38]/60 border-b border-slate-100 dark:border-[#2D3342] text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-[#8B93A7]`}>
            <div></div><div>เธเธทเนเธญ</div><div className="text-center">เธญเธฒเธเธตเธ</div><div className="text-right">เธเนเธฒเธเธฅเธฑเธ</div>{isAdmin && <div></div>}
          </div>

          <div className="p-2 min-h-[220px] flex flex-col gap-1.5 relative bg-white dark:bg-[#232733]">
            {Array.from({ length: 5 }).map((_, slotIdx) => {
              const memberId = column?.memberIds?.[slotIdx];
              const droppableId = `${column.id}::${slotIdx}`;
              return (
                <Droppable key={droppableId} droppableId={droppableId} type="MEMBER" isDropDisabled={!isAdmin || column.locked}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`h-[38px] rounded-xl border ${snapshot.isDraggingOver ? "bg-blue-50 dark:bg-[#3B66D1]/25 border-[#0b3d63] dark:border-[#4D73CD]" : "border-transparent bg-slate-50/70 dark:bg-[#272C38]/40"} flex items-center relative transition-colors`}>
                      {!memberId && !snapshot.isDraggingOver && <div className="absolute inset-0 border border-dashed border-slate-200 dark:border-[#2D3342] rounded-xl flex items-center justify-center pointer-events-none"><span className="text-[10px] text-slate-400 font-bold tracking-wider">เธงเนเธฒเธ {slotIdx + 1}</span></div>}
                      {memberId && (
                        <Draggable draggableId={memberId} index={0} isDragDisabled={!isAdmin || column.locked}>
                          {(prov, snap) => {
                            const m = members[memberId];
                            const color = (m?.job && JOB_COLORS[m.job]) || "#475569";
                            const rowContent = (
                              <div id={`member-assigned-${memberId}`} ref={prov.innerRef} {...prov.draggableProps} className={`w-full h-[38px] grid ${isAdmin ? "grid-cols-[30px_minmax(0,1fr)_85px_50px_22px] sm:grid-cols-[36px_minmax(0,1fr)_115px_60px_24px]" : "grid-cols-[30px_minmax(0,1fr)_85px_50px] sm:grid-cols-[36px_minmax(0,1fr)_115px_60px]"} gap-1.5 sm:gap-2 items-center px-2 py-1 rounded-xl bg-white dark:bg-[#272C38] hover:bg-slate-50 dark:hover:bg-[#2A2F3E] group border border-slate-100 dark:border-[#2D3342] transition-all ${snap.isDragging ? "shadow-2xl border-blue-400 dark:border-[#4D73CD] ring-2 ring-[#0b3d63]/20 z-[99999]" : "shadow-xs"}`} style={prov.draggableProps.style}>
                                <div className="flex items-center gap-0.5 sm:gap-1 text-slate-400 cursor-grab touch-none p-1 -m-1" {...(isAdmin ? prov.dragHandleProps : {})}>{isAdmin ? <GripVertical size={14} className="text-sky-300 dark:text-sky-400 shrink-0" /> : null}<span className="text-xs font-bold text-sky-500 font-mono w-3 text-center">{slotIdx + 1}</span></div>
                                <div className="min-w-0 pr-1"><span className="text-xs font-bold text-slate-800 dark:text-white truncate block" title={m?.name}>{m ? m.name : (memberId || "Unknown")}</span></div>
                                {m && <div className="h-[24px] sm:h-[26px] px-1.5 sm:px-3 rounded-full text-[10px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 shadow-sm shrink-0 w-[85px] sm:w-[115px]" style={{ backgroundColor: color }}><span className="truncate">{m.job}</span><ChevronDown size={10} className="opacity-80 shrink-0 stroke-[2.5] hidden sm:inline-block" /></div>}
                                {m && <div className="text-[10px] sm:text-xs font-bold text-[#0b3d63] dark:text-white text-right tabular-nums shrink-0">{(m.power || 0).toLocaleString()}</div>}
                                {isAdmin && <button onClick={e => { e.stopPropagation(); removeMember(column.id, memberId); }} disabled={column.locked} className="text-sky-300 hover:text-red-500 dark:text-sky-400 dark:hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity flex justify-center disabled:hidden p-0.5" title="เธเธณเธญเธญเธเธเธฒเธเธ—เธตเธก"><X size={14} strokeWidth={2.5} /></button>}
                              </div>
                            );
                            if (snap.isDragging && typeof document !== "undefined") return createPortal(rowContent, document.body);
                            return rowContent;
                          }}
                        </Draggable>
                      )}
                      <div className="absolute inset-0 opacity-0 pointer-events-none overflow-hidden">{provided.placeholder}</div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      )}
    </Draggable>
  );
}

function MemberCard({ member, index }: { member?: Member; index: number }) {
  if (!member || !member.id) return null;
  const color = (member.job && JOB_COLORS[member.job]) || "#475569";
  const hexToRgba = (hex: string, alpha: number) => {
    if (!hex || !hex.startsWith("#") || hex.length < 7) return `rgba(71, 85, 105, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  return (
    <Draggable draggableId={member.id} index={index}>
      {(provided, snapshot) => {
        const content = (
          <div id={`member-unassigned-${member.id}`} ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
            className={`flex items-center justify-between p-2 rounded-xl border shadow-sm select-none transition-all touch-none ${snapshot.isDragging ? "shadow-2xl border-[#0b3d63] dark:border-[#4D73CD] z-[99999] ring-2 ring-[#0b3d63]/20 bg-white dark:bg-[#272C38]" : "border-slate-200 dark:border-[#2D3342] hover:border-slate-300"}`}
            style={{ ...provided.draggableProps.style, backgroundColor: snapshot.isDragging ? undefined : hexToRgba(color, 0.05), borderLeftWidth: "4px", borderLeftColor: color }}>
            <div className="flex flex-col truncate pr-2 min-w-0">
              <span className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{member.name}</span>
              <span className="text-[9px] font-bold truncate opacity-90" style={{ color }}>{member.job}</span>
            </div>
            <div className="text-[11px] font-bold tabular-nums tracking-tight flex-shrink-0" style={{ color }}>{(member.power || 0).toLocaleString()}</div>
          </div>
        );
        if (snapshot.isDragging && typeof document !== "undefined") return createPortal(content, document.body);
        return content;
      }}
    </Draggable>
  );
}
