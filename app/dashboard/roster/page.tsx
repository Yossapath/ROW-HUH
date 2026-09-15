"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { JOB_LIST } from "@/lib/utils";
import { Search, X, Users, Upload, FileSpreadsheet } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import * as XLSX from "xlsx";

export default function RosterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  
  const [searchQuery, setSearchQuery] = useState("");
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
    if (lower === "อาลิเทีย") return "druid";
    if (lower === "high priest") return "priest";
    if (lower === "night walker") return "Gunslinger";
    return className;
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
  }, [roster]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return flatMembers;
    return flatMembers.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [flatMembers, searchQuery]);

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
          const newRole = row["ตำแหน่ง"] || row["Role"];
          const newPower = row["คะแนน Gear"] || row["Gear"] || row["คะแนน gear"] || 0;
          const newActivity = row["กิจกรรมสัปดาห์นี้"] || row["กิจกรรมสัปดาห์"] || row["กิจกรรม"] || 0;

          if (existingMember) {
             existingMember.power = Number(newPower);
             if (newRole) existingMember.role = newRole; 
             if (newActivity !== undefined) existingMember.activity = Number(newActivity);
             
             if (newClass && newClass !== existingMember.job) {
                 existingMember.newJob = newClass;
             }
             
             hasChanges = true;
          } else {
             missingNames.push(playerName);
             const job = newClass || "Unknown";
             if (!newRoster[job]) newRoster[job] = [];
             
             newRoster[job].push({
                 name: playerName,
                 power: Number(newPower),
                 role: newRole || "อิสระ (ให้ระบบจัดให้)",
                 activity: Number(newActivity),
                 discordId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
             });
             hasChanges = true;
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
      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#0b3d63] dark:bg-[#3B66D1] shadow-sm">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">บัญชีรายชื่อสมาชิก (Roster)</h1>
            <p className="text-sm text-slate-500 dark:text-[#8B93A7]">
              สมาชิกทั้งหมด {flatMembers.length} คน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
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

      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-[#272C38] text-slate-600 dark:text-[#8B93A7] border-b border-slate-200 dark:border-[#2D3342]">
            <tr>
              <th className="py-3 px-4 font-bold text-center w-16">ลำดับ</th>
              <th className="py-3 px-4 font-bold text-left">ชื่อผู้เล่น</th>
              <th className="py-3 px-4 font-bold text-left">คลาส</th>
              <th className="py-3 px-4 font-bold text-left">ตำแหน่ง</th>
              <th className="py-3 px-4 font-bold text-right">คะแนน Gear</th>
              <th className="py-3 px-4 font-bold text-right">กิจกรรมสัปดาห์</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2D3342]">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => (
                <tr key={member.discordId || member.name} className="hover:bg-slate-50 dark:hover:bg-[#272C38]/50 transition-colors">
                  <td className="py-3 px-4 text-center font-mono font-medium text-slate-400">{index + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">{member.name}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{mapClassName(member.job)}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{member.role || "อิสระ (ให้ระบบจัดให้)"}</td>
                  <td className="py-3 px-4 text-right font-semibold text-[#0b3d63] dark:text-[#82A0F5]">
                    {member.power != null ? Number(member.power).toLocaleString('en-US') : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                    {member.activity != null ? Number(member.activity).toLocaleString('en-US') : '-'}
                  </td>
                </tr>
              ))
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
