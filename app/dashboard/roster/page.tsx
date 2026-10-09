"use client";
import { useModalStore } from "@/stores/useModalStore";

import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { JOB_LIST, JOB_COLORS, JOB_ICONS } from "@/lib/utils";
import { Search, X, Users, Upload, FileSpreadsheet, Check, UserPlus , AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import * as XLSX from "xlsx";
import { MemberProfileModal } from "@/components/MemberProfileModal";

export default function RosterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "owner" || user?.role === "dev";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [showManualOnly, setShowManualOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importNewInputRef = useRef<HTMLInputElement>(null);
  
  // Alert Modal States
  const [showModal, setShowModal] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [notFoundNames, setNotFoundNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Modal States
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editJob, setEditJob] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPower, setEditPower] = useState("");
  const [editActivity, setEditActivity] = useState("");
  const [editGvgField, setEditGvgField] = useState("main");

  // Add Modal States
  const [isAddSelectionOpen, setIsAddSelectionOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addJob, setAddJob] = useState(JOB_LIST[0]);
  const [addPower, setAddPower] = useState("");
  const [addGvgField, setAddGvgField] = useState("main");

  // Excel Diff States
  const [showExcelDiff, setShowExcelDiff] = useState(false);
  const [excelDiffData, setExcelDiffData] = useState<{ inExcelNotInWeb: string[]; inWebNotInExcel: string[] } | null>(null);
  const checkExcelInputRef = useRef<HTMLInputElement>(null);

  const { data: roster, isLoading } = useQuery({
    queryKey: ["roster"],
    queryFn: async () => (await axios.get("/api/roster")).data.data,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mapClassName = (className: string) => {
    if (!className) return "-";
    const lower = className.toLowerCase().trim();
    if (lower === "อาลิเทีย") return "Druid";
    if (lower === "high priest") return "Priest";
    if (lower === "night walker") return "Gunslinger";
    return className;
  };

  const toggleJob = (job: string) => {
    setSelectedJobs((prev) =>
      prev.includes(job) ? prev.filter((j) => j !== job) : [...prev, job]
    );
  };

  const openEditModal = (member: any) => {
    setEditingMember(member);
    setEditName(member.name || "");
    setEditJob(member.job || "");
    setEditTitle(member.title || "");
    setEditPower(member.power?.toString() || "");
    setEditActivity(member.activity?.toString() || "");
    setEditGvgField(member.gvgField || "main");
  };

  const handleSaveEdit = async () => {
    if (!editName || !editJob) return useModalStore.getState().alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    
    setIsSaving(true);
    try {
      await axios.put("/api/roster/member", {
        targetDiscordId: editingMember.discordId || null,
        originalName: editingMember.name,
        originalJob: editingMember.job,
        name: editName,
        job: editJob,
        title: editTitle,
        power: Number(editPower) || 0,
        activity: Number(editActivity) || 0,
        warRole: editingMember.role || "อิสระ (ให้ระบบจัดให้)",
        gvgField: editGvgField
      });
      
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      setEditingMember(null);
    } catch (err: any) {
      useModalStore.getState().alert("เกิดข้อผิดพลาด: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!addName || !addJob || !addPower) return useModalStore.getState().alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    
    setIsSaving(true);
    try {
      await axios.post("/api/roster/member", {
        name: addName,
        job: addJob,
        power: Number(addPower) || 0,
        gvgField: addGvgField,
        discordId: `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      });
      
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      setIsAddModalOpen(false);
      setAddName("");
      setAddJob(JOB_LIST[0]);
      setAddPower("");
      useModalStore.getState().alert("เพิ่มสมาชิกสำเร็จ!");
    } catch (err: any) {
      useModalStore.getState().alert("เกิดข้อผิดพลาด: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!await useModalStore.getState().confirm("ยืนยันการลบสมาชิกนี้?")) return;
    setIsSaving(true);
    try {
      await axios.delete("/api/roster", {
        data: {
          discordId: editingMember.discordId,
          name: editingMember.name,
          job: editingMember.job
        }
      });
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      setEditingMember(null);
    } catch (err: any) {
      useModalStore.getState().alert("เกิดข้อผิดพลาดในการลบสมาชิก");
    } finally {
      setIsSaving(false);
    }
  };

  const flatMembers = useMemo(() => {
    if (!roster) return [];
    let all: any[] = [];
    Object.keys(roster).forEach((job) => {
      if (Array.isArray(roster[job])) {
        roster[job].forEach((m: any) => {
          all.push({ ...m, job });
        });
      }
    });

    const targetUser = user?.gameUsername || user?.discordUsername || "";
    const userIndex = all.findIndex((m) => 
      m.name === targetUser || 
      (user?.gameUsername && m.name === user.gameUsername) || 
      m.discordId === user?.discordId
    );
    
    const others = all.filter((_, idx) => idx !== userIndex).sort((a, b) => (Number(b.power) || 0) - (Number(a.power) || 0));
    
    if (userIndex > -1) {
      return [all[userIndex], ...others];
    } else {
      return others;
    }
  }, [roster, user]);

  const filteredMembers = useMemo(() => {
    let result = flatMembers;
    
    if (showManualOnly) {
      result = result.filter(m => !m.discordId || String(m.discordId).startsWith("manual_"));
    }

    if (selectedJobs.length > 0) {
      result = result.filter(m => selectedJobs.includes(m.job));
    }
    
    if (searchQuery) {
      result = result.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return result;
  }, [flatMembers, searchQuery, selectedJobs, showManualOnly]);

  const handleImportNewMembers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws);

        if (!roster) return;

        let newRoster = { ...roster };
        let addedCount = 0;
        let skippedNames: string[] = [];

        const currentMembersMap = new Map();
        const normalizeName = (name: string) => {
            if (!name) return "";
            return name.toString().replace(/[^a-zA-Z0-9ก-๙]/g, "").toLowerCase();
        };

        Object.keys(newRoster).forEach(job => {
            if (Array.isArray(newRoster[job])) {
                newRoster[job].forEach((m: any) => {
                    currentMembersMap.set(normalizeName(m.name), true);
                });
            }
        });

        jsonData.forEach((row, idx) => {
          const playerName = row["name"] || row["ชื่อ"] || row["Name"] || Object.values(row)[0];
          if (!playerName) return;

          const searchName = normalizeName(playerName);
          if (currentMembersMap.has(searchName)) {
             skippedNames.push(String(playerName).trim());
          } else {
             const jobStr = row["class"] || row["อาชีพ"] || row["Class"] || "";
             let job = mapClassName(jobStr);
             if (!JOB_LIST.includes(job)) job = JOB_LIST[0]; // fallback

             const power = Number(row["cp"] || row["พลังรบ"]) || 0;
             const gvgRaw = row["สิทสนามหลัก หรือ รอง"] || row["สนาม"] || row["gvg"];
             const gvgField = (String(gvgRaw).includes("หลัก") || String(gvgRaw).toLowerCase() === "main") ? "main" : "sub";

             if (!newRoster[job]) newRoster[job] = [];
             newRoster[job].push({
               name: String(playerName).trim(),
               job,
               power,
               gvgField,
               discordId: "manual_" + Date.now() + "_" + Math.floor(Math.random() * 10000) + "_" + idx,
               role: "อิสระ (ให้ระบบจัดให้)",
               activity: 0,
               weeklyCpDiff: 0
             });
             currentMembersMap.set(searchName, true);
             addedCount++;
          }
        });

        if (addedCount > 0) {
           setIsSaving(true);
           try {
               await axios.put("/api/roster", newRoster);
               queryClient.invalidateQueries({ queryKey: ["roster"] });
               let msg = "เพิ่มสมาชิกใหม่สำเร็จ " + addedCount + " คน!";
               if (skippedNames.length > 0) msg += " (และข้ามรายชื่อซ้ำ " + skippedNames.length + " คนที่มีอยู่แล้ว)";
               useModalStore.getState().alert(msg);
           } catch (error: any) {
               useModalStore.getState().alert("เกิดข้อผิดพลาดในการอัปเดต: " + (error.message || ""));
           } finally {
               setIsSaving(false);
           }
        } else {
           let msg = "ไม่มีรายชื่อใหม่ที่ถูกเพิ่ม";
           if (skippedNames.length > 0) msg += " (พบรายชื่อซ้ำ " + skippedNames.length + " คนที่มีอยู่ในระบบแล้วทั้งหมด)";
           useModalStore.getState().alert(msg);
        }
        
      } catch (error) {
        console.error(error);
        useModalStore.getState().alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
      }
      
      if (importNewInputRef.current) importNewInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws);

        if (!roster) return;

        let newRoster = { ...roster };
        const missingNames: string[] = [];
        let hasChanges = false;

        const currentMembersMap = new Map();
        const normalizeName = (name: string) => {
            return name.replace(/[^a-zA-Z0-9ก-๙]/g, "").toLowerCase();
        };

        Object.keys(newRoster).forEach(job => {
            if (Array.isArray(newRoster[job])) {
                newRoster[job].forEach((m: any) => {
                    // เก็บ key ด้วยชื่อแบบ fuzzy และเก็บ original name ไว้ใช้ตอนบันทึก
                    currentMembersMap.set(normalizeName(m.name), { ...m, job, originalName: m.name });
                });
            }
        });

        jsonData.forEach((row) => {
          const playerName = row["ชื่อผู้เล่น"] || row["Name"] || Object.values(row)[1];
          if (!playerName) return;

          const searchName = normalizeName(playerName);
          const existingMember = currentMembersMap.get(searchName);
          
          const newClass = row["คลาส"] || row["Class"];
          let normalizedClass = newClass;
          if (normalizedClass) {
             const lowerClass = normalizedClass.toLowerCase().trim();
             if (lowerClass === "อาลิเทีย") normalizedClass = "Druid";
             else if (lowerClass === "high priest") normalizedClass = "Priest";
             else if (lowerClass === "night walker") normalizedClass = "Gunslinger";
             else if (lowerClass === "merchant" || lowerClass === "whitesmith") normalizedClass = "Merchant";
             else if (lowerClass === "danc" || lowerClass === "dancer" || lowerClass === "ยิปซี" || lowerClass === "gypsy") normalizedClass = "Dancer";
             else if (lowerClass === "bard" || lowerClass === "clown" || lowerClass === "คราว") normalizedClass = "Bard";
             else if (lowerClass === "biosmith" || lowerClass === "biochemist" || lowerClass === "creator") normalizedClass = "Biosmith";
             else {
                const match = JOB_LIST.find(j => j.toLowerCase() === lowerClass);
                if (match) normalizedClass = match;
             }
          }
          const newTitle = row["Title"] || row["title"];
          const newPower = row["คะแนน Gear"] || row["Gear"] || row["คะแนน gear"] || 0;
          const newActivity = row["กิจกรรมสัปดาห์นี้"] || row["กิจกรรมสัปดาห์"] || row["กิจกรรม"] || 0;
          const newWeekly = row["แต้มสนับสนุน"] || row["สนับสนุนสัปดาห์"] || row["Weekly"] || row["weekly"] || 0;
          const newHistory = row["แต้มสะสมทั้งหมด"] || row["แต้มสะสม"] || row["History"] || row["history"];

          if (existingMember) {
             const parsedNewPower = Number(newPower);
             if (!isNaN(parsedNewPower) && parsedNewPower > 0) {
                 // สำรองค่า CP เดิมไว้เป็น previousCp ก่อนอัปเดต (เก็บเฉพาะตอนที่ค่าเปลี่ยนเพื่อป้องกันการอัปโหลดไฟล์ซ้ำ)
                 if (existingMember.power && existingMember.power > 0 && existingMember.power !== parsedNewPower) {
                     existingMember.previousCp = existingMember.power;
                 }
                 existingMember.power = parsedNewPower;
             }

             if (newTitle !== undefined) existingMember.title = newTitle; 
             if (newActivity !== undefined) existingMember.activity = Number(newActivity);
             if (newWeekly !== undefined) existingMember.weekly = Number(newWeekly);
             if (newHistory !== undefined) existingMember.history = Number(newHistory);
             
             if (normalizedClass && normalizedClass !== existingMember.job) {
                 existingMember.newJob = normalizedClass;
             }
             
             hasChanges = true;
          } else {
             missingNames.push(playerName);
          }
        });

        if (hasChanges) {
           const updatedRoster: any = {};
           
           currentMembersMap.forEach((m) => {
               const job = m.newJob || m.job;
               if (!updatedRoster[job]) updatedRoster[job] = [];
               const { newJob, job: oldJob, originalName, ...memberData } = m;
               updatedRoster[job].push(memberData);
           });

           Object.keys(newRoster).forEach(job => {
               if (Array.isArray(newRoster[job])) {
                   newRoster[job].forEach((m: any) => {
                       if (!currentMembersMap.has(normalizeName(m.name))) {
                           if (!updatedRoster[job]) updatedRoster[job] = [];
                           updatedRoster[job].push(m);
                       }
                   });
               }
           });

           const excelNames = new Set<string>();
           jsonData.forEach((row: any) => {
               const p = row["ชื่อผู้เล่น"] || row["Name"] || Object.values(row)[1];
               if(p) excelNames.add(normalizeName(p));
           });

           const inWebNotInExcel: string[] = [];
           currentMembersMap.forEach((m, key) => {
               if (!excelNames.has(key)) {
                   inWebNotInExcel.push(m.originalName || m.name);
               }
           });

           updatedRoster.diffInfo = {
               inExcelNotInWeb: missingNames,
               inWebNotInExcel,
               updatedAt: Date.now()
           };

           setIsSaving(true);
           try {
               await axios.put("/api/roster", updatedRoster);
               queryClient.invalidateQueries({ queryKey: ["roster"] });
               
               useModalStore.getState().alert("อัปเดตข้อมูลสำเร็จ! สามารถดูรายละเอียดรายชื่อตกหล่นได้ที่ปุ่ม 'ตรวจสอบ Excel'");
           } catch (error: any) {
               useModalStore.getState().alert("เกิดข้อผิดพลาดในการอัปเดต: " + (error.message || ""));
           } finally {
               setIsSaving(false);
           }
        }
        
      } catch (error) {
        console.error(error);
        useModalStore.getState().alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsArrayBuffer(file);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">กำลังโหลดรายชื่อ...</div>;

  return (
    <div className="space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-4 lg:p-6 relative">
      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] p-5 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#0b3d63] dark:bg-[#3B66D1] shadow-sm">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">บัญชีรายชื่อสมาชิก (Roster)</h1>
            <p className="text-sm text-slate-500 dark:text-[#8B93A7]">
              {selectedJobs.length > 0 ? (
                <>
                  แสดง <span className="font-bold text-[#0b3d63] dark:text-[#82A0F5]">{filteredMembers.length}</span> คน ({selectedJobs.length} อาชีพ) · จากทั้งหมด {flatMembers.length} คน
                </>
              ) : (
                `สมาชิกทั้งหมด ${flatMembers.length} คน`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
          <div className="relative w-full sm:w-60">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อสมาชิก..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#2D3342] bg-white dark:bg-[#272C38] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4D73CD]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAddSelectionOpen(true)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                เพิ่มสมาชิก
              </button>

              <button 
                onClick={() => {
                  if (roster?.diffInfo) {
                    setExcelDiffData(roster.diffInfo);
                    setShowExcelDiff(true);
                  } else {
                    useModalStore.getState().alert("ยังไม่มีข้อมูล รบกวนอัปเดต Excel ก่อนครับ");
                  }
                }}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                ตรวจสอบ Excel
              </button>

              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={importNewInputRef} 
                onChange={handleImportNewMembers} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#3B66D1] hover:bg-[#4D73CD] text-white rounded-xl font-bold transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                อัปเดต Excel
              </button>
              
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pb-1">
        <button 
          onClick={() => setSelectedJobs([])}
          className={`rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-sm border transition-all flex-shrink-0 cursor-pointer ${
            selectedJobs.length === 0 
              ? "bg-[#0b3d63] dark:bg-[#3B66D1] border-[#0b3d63] dark:border-[#4D73CD] text-white ring-2 ring-[#4D73CD]/30 shadow-sm" 
              : "bg-white dark:bg-[#232733] border-slate-200 dark:border-[#2D3342] hover:bg-slate-50 dark:hover:bg-[#272C38] text-slate-700 dark:text-white"
          }`}
        >
          <span className="font-bold text-sm">ทั้งหมด</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            selectedJobs.length === 0 
              ? "bg-white/20 text-white" 
              : "bg-slate-100 dark:bg-[#272C38] text-slate-600 dark:text-[#8B93A7]"
          }`}>
            {flatMembers.length}
          </span>
        </button>

        {isAdmin && (
          <button 
            onClick={() => setShowManualOnly(!showManualOnly)}
            className={`rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-sm border transition-all flex-shrink-0 cursor-pointer ${
              showManualOnly 
                ? "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30" 
                : "bg-white dark:bg-[#232733] border-slate-200 dark:border-[#2D3342] hover:bg-slate-50 dark:hover:bg-[#272C38] text-slate-700 dark:text-white"
            }`}
          >
            <span className="font-bold text-sm">ไม่มี Discord (Manual)</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              showManualOnly 
                ? "bg-rose-500 text-white" 
                : "bg-slate-100 dark:bg-[#272C38] text-slate-600 dark:text-[#8B93A7]"
            }`}>
              {flatMembers.filter(m => !m.discordId || String(m.discordId).startsWith("manual_")).length}
            </span>
          </button>
        )}

        {JOB_LIST.map(job => {
          const count = flatMembers.filter(m => m.job === job).length;
          if (count === 0 && searchQuery) return null;
          const color = JOB_COLORS[job] || "#000";
          const isSelected = selectedJobs.includes(job);

          return (
            <button 
              key={`pill-${job}`} 
              onClick={() => toggleJob(job)}
              className={`rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-sm border transition-all flex-shrink-0 cursor-pointer ${
                isSelected 
                  ? "bg-slate-50 dark:bg-[#272C38] border-[#3B66D1] dark:border-[#4D73CD] ring-2 ring-[#3B66D1]/30 dark:ring-[#4D73CD]/40 shadow-sm" 
                  : "bg-white dark:bg-[#232733] border-slate-200 dark:border-[#2D3342] hover:bg-slate-50 dark:hover:bg-[#272C38]"
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm text-slate-700 dark:text-white">
                {JOB_ICONS[job] && (
                  <img src={JOB_ICONS[job]} alt={job} className="w-6 h-6 object-contain shrink-0 drop-shadow-sm" />
                )}
                <span className={isSelected ? "text-[#0b3d63] dark:text-[#82A0F5]" : ""}>{job}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isSelected 
                  ? "bg-[#3B66D1] text-white dark:bg-[#4D73CD]" 
                  : "bg-slate-100 dark:bg-[#272C38] text-slate-600 dark:text-[#8B93A7]"
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {selectedJobs.length > 0 && (
          <button 
            onClick={() => setSelectedJobs([])}
            className="rounded-2xl px-3 py-2 flex items-center gap-1.5 border border-dashed border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer"
            title="ล้างตัวกรองทั้งหมด"
          >
            <X size={14} />
            <span>ล้างตัวกรอง ({selectedJobs.length})</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-x-auto max-w-full">
        {/* Mobile View (< 640px) */}
        <div className="sm:hidden flex flex-col p-3 gap-2.5">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member, index) => {
              const targetUser = user?.gameUsername || user?.discordUsername || "";
              const isCurrentUser = member.name === targetUser || 
                                    (user?.gameUsername && member.name === user.gameUsername) || 
                                    member.discordId === user?.discordId;
              const jobColor = JOB_COLORS[member.job] || "#333";
              return (
                <div key={member.discordId || member.name} className={`p-3 rounded-xl border flex flex-col gap-2 shadow-sm ${isCurrentUser ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-[#272C38] border-slate-100 dark:border-[#2D3342]"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 dark:bg-[#232733] px-1.5 py-0.5 rounded">{index + 1}</span>
                      <button onClick={() => setViewingProfile(member)} className="font-bold text-sm text-slate-800 dark:text-white truncate hover:underline text-left">{member.name}</button>
                      {isCurrentUser && <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-700 shrink-0">คุณ</span>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => openEditModal(member)} className="px-2 py-1 bg-slate-100 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded text-[10px] font-bold text-slate-700 dark:text-white shrink-0 hover:bg-[#3B66D1] hover:text-white transition-colors">แก้ไข</button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    {JOB_ICONS[member.job] && <img src={JOB_ICONS[member.job]} alt={member.job} className="w-5 h-5 object-contain shrink-0 drop-shadow-sm" />}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: jobColor }}>{mapClassName(member.job)}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">| {member.title || "ไม่มี Title"}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100 dark:border-[#2D3342]/50">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400">คะแนน Gear</span>
                      <span className="font-semibold text-xs text-[#0b3d63] dark:text-[#82A0F5]">{member.power != null ? Number(member.power).toLocaleString('en-US') : '-'}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] text-slate-400">กิจกรรมสัปดาห์</span>
                      <span className="font-semibold text-xs text-green-600 dark:text-green-400">{member.activity != null ? Number(member.activity).toLocaleString('en-US') : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">ไม่พบรายชื่อ</div>
          )}
        </div>

        {/* Desktop View (>= 640px) */}
        <table className="hidden sm:table min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-[#272C38] text-slate-600 dark:text-[#8B93A7] border-b border-slate-200 dark:border-[#2D3342]">
            <tr>
              <th className="py-3 px-4 font-bold text-center w-16">ลำดับ</th>
              <th className="py-3 px-4 font-bold text-left">ชื่อผู้เล่น</th>
              <th className="py-3 px-4 font-bold text-left">คลาส</th>
              <th className="py-3 px-4 font-bold text-left">Title</th>
              <th className="py-3 px-4 font-bold text-right">คะแนน Gear</th>
              <th className="py-3 px-4 font-bold text-right">กิจกรรมสัปดาห์</th>
              {isAdmin && <th className="py-3 px-4 font-bold text-center w-24">จัดการ</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2D3342]">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => {
                const targetUser = user?.gameUsername || user?.discordUsername || "";
                const isCurrentUser = member.name === targetUser || 
                                      (user?.gameUsername && member.name === user.gameUsername) || 
                                      member.discordId === user?.discordId;
                const jobColor = JOB_COLORS[member.job] || "#333";
                
                return (
                  <tr 
                    key={member.discordId || member.name} 
                    className={`transition-colors ${isCurrentUser ? "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40" : "hover:bg-slate-50 dark:hover:bg-[#272C38]/50"}`}
                  >
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-400">
                      {isCurrentUser ? <span className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">1</span> : index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <button 
                        onClick={() => setViewingProfile(member)}
                        className="hover:text-[#0b3d63] dark:hover:text-[#82A0F5] hover:underline underline-offset-2 transition-colors text-left"
                      >
                        {member.name}
                      </button>
                      {isCurrentUser && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-700">คุณ</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-2">
                        {JOB_ICONS[member.job] && (
                          <img src={JOB_ICONS[member.job]} alt={member.job} className="w-6 h-6 object-contain shrink-0 drop-shadow-sm" />
                        )}
                        <span 
                          className="px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-sm"
                          style={{ backgroundColor: jobColor }}
                        >
                          {mapClassName(member.job)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{member.title || "-"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#0b3d63] dark:text-[#82A0F5]">
                      {member.power != null ? Number(member.power).toLocaleString('en-US') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                      {member.activity != null ? Number(member.activity).toLocaleString('en-US') : '-'}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => openEditModal(member)}
                          className="px-3 py-1 bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] hover:border-[#4D73CD] rounded-md text-xs font-bold text-slate-700 dark:text-white shadow-sm hover:bg-[#3B66D1] hover:text-white transition-colors"
                        >
                          แก้ไข
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400">ไม่พบรายชื่อ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-[#232733] rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-[#2D3342] max-h-[85vh] flex flex-col">
            <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2 flex-shrink-0">
              <X className="w-5 h-5 cursor-pointer" onClick={() => setShowModal(false)} /> แจ้งเตือนการอัปเดต
            </h2>
            <p className="text-slate-600 dark:text-[#8B93A7] mb-4 text-sm flex-shrink-0">
              พบรายชื่อใหม่ในไฟล์ Excel ที่ยังไม่มีในเว็บไซต์:
            </p>
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-[#2D3342] rounded-lg p-3 mb-4 bg-slate-50 dark:bg-[#1C1F27] flex-1">
              <ul className="list-decimal pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {notFoundNames.map((name, idx) => (
                  <li key={idx} className="font-medium">{name}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end flex-shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-sm transition-colors text-sm"
              >
                รับทราบและปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-[#232733] rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col font-prompt border border-slate-200 dark:border-[#2D3342] animate-in fade-in zoom-in duration-200 max-h-[92vh]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-[#2D3342]">
              <h2 className="text-xl font-bold text-[#0b3d63] dark:text-white">แก้ไขข้อมูลสมาชิก</h2>
              <button 
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272C38] rounded-full p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">ชื่อสมาชิก (ในเกม)</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-[#4D73CD] focus:border-[#4D73CD] bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">อาชีพ</label>
                <select 
                  value={editJob}
                  onChange={e => setEditJob(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-[#4D73CD] focus:border-[#4D73CD] bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                >
                  {JOB_LIST.map(job => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-[#4D73CD] focus:border-[#4D73CD] bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">ค่าพลัง (Gear)</label>
                  <input 
                    type="number" 
                    value={editPower}
                    onChange={e => setEditPower(e.target.value)}
                    className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-[#4D73CD] focus:border-[#4D73CD] bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">กิจกรรมสัปดาห์</label>
                  <input 
                    type="number" 
                    value={editActivity}
                    onChange={e => setEditActivity(e.target.value)}
                    className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-[#4D73CD] focus:border-[#4D73CD] bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">สิทธิ์สนาม GVG</label>
                <select 
                  value={editGvgField}
                  onChange={e => setEditGvgField(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-[#4D73CD] focus:border-[#4D73CD] bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                >
                  <option value="main">สนามหลัก (Main Field)</option>
                  <option value="sub">สนามรอง (Sub Field)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-[#1C1F27] flex items-center justify-between border-t border-slate-100 dark:border-[#2D3342]">
              <button 
                onClick={handleDelete}
                disabled={isSaving}
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                ลบข้อมูล
              </button>
              
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setEditingMember(null)}
                  disabled={isSaving}
                  className="bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] text-slate-700 dark:text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#2A2F3E] transition-all shadow-sm disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-[#3B66D1] hover:bg-[#4D73CD] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow disabled:opacity-70"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-[#232733] rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col font-prompt border border-slate-200 dark:border-[#2D3342] animate-in fade-in zoom-in duration-200 max-h-[92vh]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-[#2D3342]">
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> เพิ่มสมาชิก (Manual)
              </h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272C38] rounded-full p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-slate-500 dark:text-[#8B93A7] mb-2 font-medium">
                ใช้สำหรับเพิ่มสมาชิกที่ไม่มีบัญชี Discord (สร้างไอดีจำลองอัตโนมัติ)
              </p>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">ชื่อสมาชิก (ในเกม)</label>
                <input 
                  type="text" 
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="กรอกชื่อในเกม"
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">อาชีพ</label>
                <select 
                  value={addJob}
                  onChange={e => setAddJob(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                >
                  {JOB_LIST.map(job => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">ค่าพลัง (Power)</label>
                <input 
                  type="number" 
                  value={addPower}
                  onChange={e => setAddPower(e.target.value)}
                  placeholder="เช่น 150000"
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">สิทธิ์สนาม GVG</label>
                <select 
                  value={addGvgField}
                  onChange={e => setAddGvgField(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#2D3342] rounded-xl px-4 py-3 text-slate-800 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 dark:bg-[#1C1F27] transition-all outline-none"
                >
                  <option value="main">สนามหลัก (Main Field)</option>
                  <option value="sub">สนามรอง (Sub Field)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-[#1C1F27] flex items-center justify-end border-t border-slate-100 dark:border-[#2D3342]">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] text-slate-700 dark:text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#2A2F3E] transition-all shadow-sm disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleAddMember}
                  disabled={isSaving || !addName || !addJob || !addPower}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow disabled:opacity-50"
                >
                  {isSaving ? "กำลังเพิ่ม..." : "ยืนยันการเพิ่ม"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      
        {/* Add Selection Modal */}
        {isAddSelectionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col font-prompt border border-slate-200 dark:border-[#2D3342] animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-[#2D3342]">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> 
                  เลือกวิธีเพิ่มสมาชิก
                </h2>
                <button 
                  onClick={() => setIsAddSelectionOpen(false)}
                  className="text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272C38] rounded-full p-1.5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-4">
                <button
                  onClick={() => {
                    setIsAddSelectionOpen(false);
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">เพิ่มคนเดียว (Manual)</h3>
                    <p className="text-sm text-slate-500 dark:text-[#8B93A7] mt-1">เพิ่มข้อมูลสมาชิกใหม่ทีละคน</p>
                  </div>
                </button>

                <div className="relative">
                  <button
                    onClick={() => {
                      setIsAddSelectionOpen(false);
                      importNewInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-lg">เพิ่มหลายคน (Excel)</h3>
                      <p className="text-sm text-slate-500 dark:text-[#8B93A7] mt-1">อัปโหลดไฟล์ Excel เพิ่มทีละหลายคน</p>
                    </div>
                  </button>
                  <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>คำแนะนำก่อนอัปโหลด:</strong>
                      <br/>ไฟล์ Excel จะต้องประกอบไปด้วย 4 คอลัมน์ต่อไปนี้:
                      <br/>1. <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">name</code> (ชื่อตัวละคร)
                      <br/>2. <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">class</code> (อาชีพ)
                      <br/>3. <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">cp</code> (พลังรบ)
                      <br/>4. <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">สิทสนามหลัก หรือ รอง</code> (สิทธิ์)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Excel Diff Modal */}
      {showExcelDiff && excelDiffData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExcelDiff(false)} />
          <div className="bg-white dark:bg-[#232733] rounded-2xl w-full max-w-4xl relative shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 dark:bg-[#1C1F27] border-b border-slate-100 dark:border-[#2D3342] flex items-center justify-between">
              <h2 className="text-lg xl:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-500" />
                ผลการตรวจสอบ Excel
              </h2>
              <button onClick={() => setShowExcelDiff(false)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-[#272C38] rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 gap-6 grid grid-cols-1 md:grid-cols-2 max-h-[70vh] overflow-y-auto">
              {/* In Excel but NOT in Web */}
              <div className="border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      ยังไม่เข้าเว็ป ({excelDiffData.inExcelNotInWeb.length})
                    </h3>
                    <button onClick={() => {
                      const text = excelDiffData.inExcelNotInWeb.join("\n");
                      navigator.clipboard.writeText(text);
                      useModalStore.getState().alert("คัดลอกรายชื่อสำเร็จ");
                    }} className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline px-2 py-1 bg-rose-100 dark:bg-rose-900/40 rounded">
                      คัดลอก
                    </button>
                  </div>
                <ul className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {excelDiffData.inExcelNotInWeb.length === 0 ? (
                    <li className="text-sm text-slate-500">- ไม่มีชื่อตกหล่น -</li>
                  ) : excelDiffData.inExcelNotInWeb.map((name, i) => (
                    <li key={i} className="text-sm font-medium text-rose-700 dark:text-rose-300 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-rose-100/50 dark:border-rose-800/30">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* In Web but NOT in Excel */}
              <div className="border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      รายชื่อไม่ตรงกับเกม ({excelDiffData.inWebNotInExcel.length})
                    </h3>
                    <button onClick={() => {
                      let nameToDiscordId = new Map();
                      if (roster) {
                        Object.values(roster).forEach((members: any) => {
                          if (Array.isArray(members)) {
                            members.forEach((m: any) => {
                              if (m.name && m.discordId) {
                                nameToDiscordId.set(m.name.toLowerCase().trim(), m.discordId);
                              }
                            });
                          }
                        });
                      }
                      const text = excelDiffData.inWebNotInExcel.map(name => {
                        const dId = nameToDiscordId.get(name.toLowerCase().trim());
                        return dId ? `${name} <@${dId}>` : name;
                      }).join("\n");
                      navigator.clipboard.writeText(text);
                      useModalStore.getState().alert("คัดลอกรายชื่อสำเร็จ");
                    }} className="text-xs font-bold text-orange-700 dark:text-orange-400 hover:underline px-2 py-1 bg-orange-100 dark:bg-orange-900/40 rounded">
                      คัดลอก
                    </button>
                  </div>
                <ul className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {excelDiffData.inWebNotInExcel.length === 0 ? (
                      <li className="text-sm text-slate-500">- ข้อมูลตรงกันทั้งหมด -</li>
                    ) : excelDiffData.inWebNotInExcel.map((name, i) => {
                      let dId = null;
                      if (roster) {
                        Object.values(roster).forEach((members: any) => {
                          if (Array.isArray(members)) {
                            const found = members.find((m: any) => m.name?.toLowerCase().trim() === name.toLowerCase().trim());
                            if (found && found.discordId) dId = found.discordId;
                          }
                        });
                      }
                      return (
                      <li key={i} className="text-sm font-medium text-orange-700 dark:text-orange-300 bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-orange-100/50 dark:border-orange-800/30 flex justify-between items-center">
                        <span>{name}</span>
                        {dId && <span className="text-xs text-orange-500 opacity-70 cursor-help" title={`<@${dId}>`}>มี Discord</span>}
                      </li>
                    )})}
                  </ul>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-[#1C1F27] px-6 py-4 border-t border-slate-100 dark:border-[#2D3342] flex justify-end">
              <button onClick={() => setShowExcelDiff(false)} className="px-5 py-2 bg-white dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-[#2A2F3E] transition-all">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingProfile && (
        <MemberProfileModal 
          member={viewingProfile} 
          onClose={() => setViewingProfile(null)} 
        />
      )}
    </div>
  );
}
