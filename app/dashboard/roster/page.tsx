"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { JOB_LIST, JOB_COLORS } from "@/lib/utils";
import { Search, X, Users, Upload, FileSpreadsheet, Check } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import * as XLSX from "xlsx";

export default function RosterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Alert Modal States
  const [showModal, setShowModal] = useState(false);
  const [notFoundNames, setNotFoundNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

    // Ensure logged-in user is always #1
    const targetUser = user?.gameUsername || user?.discordUsername || "TELLツ";
    const userIndex = all.findIndex((m) => 
      m.name === targetUser || 
      (user?.gameUsername && m.name === user.gameUsername) || 
      m.discordId === user?.discordId
    );
    
    // Sort others by power descending
    const others = all.filter((_, idx) => idx !== userIndex).sort((a, b) => (Number(b.power) || 0) - (Number(a.power) || 0));
    
    if (userIndex > -1) {
      return [all[userIndex], ...others];
    } else {
      return others;
    }
  }, [roster, user]);

  const filteredMembers = useMemo(() => {
    let result = flatMembers;
    
    if (selectedJobs.length > 0) {
      result = result.filter(m => selectedJobs.includes(m.job));
    }
    
    if (searchQuery) {
      result = result.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return result;
  }, [flatMembers, searchQuery, selectedJobs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws);

        if (!roster) return;

        let newRoster = { ...roster };
        const missingNames: string[] = [];
        let hasChanges = false;

        const currentMembersMap = new Map();
        Object.keys(newRoster).forEach(job => {
            if (Array.isArray(newRoster[job])) {
                newRoster[job].forEach((m: any) => {
                    currentMembersMap.set(m.name, { ...m, job });
                });
            }
        });

        jsonData.forEach((row) => {
          const playerName = row["ชื่อผู้เล่น"] || row["Name"] || Object.values(row)[1];
          if (!playerName) return;

          const existingMember = currentMembersMap.get(playerName);
          
          const newClass = row["คลาส"] || row["Class"];
          const newTitle = row["Title"] || row["title"];
          const newPower = row["คะแนน Gear"] || row["Gear"] || row["คะแนน gear"] || 0;
          const newActivity = row["กิจกรรมสัปดาห์นี้"] || row["กิจกรรมสัปดาห์"] || row["กิจกรรม"] || 0;

          if (existingMember) {
             existingMember.power = Number(newPower);
             if (newTitle !== undefined) existingMember.title = newTitle; 
             if (newActivity !== undefined) existingMember.activity = Number(newActivity);
             
             if (newClass && newClass !== existingMember.job) {
                 existingMember.newJob = newClass;
             }
             
             hasChanges = true;
          } else {
             missingNames.push(playerName);
             // ไม่เพิ่มคนเข้า Database หากไม่มีชื่อในเว็บไซต์ (แค่แจ้งเตือน)
          }
        });

        if (hasChanges) {
           const updatedRoster: any = {};
           
           currentMembersMap.forEach((m) => {
               const job = m.newJob || m.job;
               if (!updatedRoster[job]) updatedRoster[job] = [];
               const { newJob, job: oldJob, ...memberData } = m;
               updatedRoster[job].push(memberData);
           });

           Object.keys(newRoster).forEach(job => {
               if (Array.isArray(newRoster[job])) {
                   newRoster[job].forEach((m: any) => {
                       if (!currentMembersMap.has(m.name)) {
                           if (!updatedRoster[job]) updatedRoster[job] = [];
                           updatedRoster[job].push(m);
                       }
                   });
               }
           });

           setIsSaving(true);
           try {
               await axios.put("/api/roster", updatedRoster);
               queryClient.invalidateQueries({ queryKey: ["roster"] });
               
               if (missingNames.length > 0) {
                   setNotFoundNames(missingNames);
                   setShowModal(true);
               } else {
                   alert("อัปเดตข้อมูลสำเร็จ!");
               }
           } catch (error: any) {
               alert("เกิดข้อผิดพลาดในการอัปเดต: " + (error.message || ""));
           } finally {
               setIsSaving(false);
           }
        }
        
      } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsBinaryString(file);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">กำลังโหลดรายชื่อ...</div>;

  return (
    <div className="space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-4 lg:py-6 lg:px-6 2xl:px-8 relative">
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
            <div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
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

      {/* Filter Pills */}
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

        {JOB_LIST.map(job => {
          const count = flatMembers.filter(m => m.job === job).length;
          if (count === 0 && searchQuery) return null; // Hide if empty during search
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
                {isSelected ? (
                  <span 
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" 
                    style={{ backgroundColor: color }}
                  >
                    <Check size={10} strokeWidth={3} className="text-white" />
                  </span>
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: color }}></span>
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

      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-[#272C38] text-slate-600 dark:text-[#8B93A7] border-b border-slate-200 dark:border-[#2D3342]">
            <tr>
              <th className="py-3 px-4 font-bold text-center w-16">ลำดับ</th>
              <th className="py-3 px-4 font-bold text-left">ชื่อผู้เล่น</th>
              <th className="py-3 px-4 font-bold text-left">คลาส</th>
              <th className="py-3 px-4 font-bold text-left">Title</th>
              <th className="py-3 px-4 font-bold text-right">คะแนน Gear</th>
              <th className="py-3 px-4 font-bold text-right">กิจกรรมสัปดาห์</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2D3342]">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => {
                const targetUser = user?.gameUsername || user?.discordUsername || "TELLツ";
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
                      {member.name}
                      {isCurrentUser && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-700">คุณ</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: jobColor }}
                      >
                        {mapClassName(member.job)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{member.title || "-"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-[#0b3d63] dark:text-[#82A0F5]">
                      {member.power != null ? Number(member.power).toLocaleString('en-US') : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                      {member.activity != null ? Number(member.activity).toLocaleString('en-US') : '-'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">ไม่พบรายชื่อ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-[#2D3342]">
            <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <X className="w-5 h-5 cursor-pointer" onClick={() => setShowModal(false)} /> แจ้งเตือนการอัปเดต
            </h2>
            <p className="text-slate-600 dark:text-[#8B93A7] mb-4 text-sm">
              พบรายชื่อใหม่ในไฟล์ Excel ที่ยังไม่มีในเว็บไซต์:
            </p>
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-[#2D3342] rounded-lg p-3 mb-4 bg-slate-50 dark:bg-[#1C1F27]">
              <ul className="list-decimal pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                {notFoundNames.map((name, idx) => (
                  <li key={idx} className="font-medium">{name}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-sm transition-colors text-sm"
              >
                รับทราบและปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
