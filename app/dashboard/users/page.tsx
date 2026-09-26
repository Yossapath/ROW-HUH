"use client";
import { useModalStore } from "@/stores/useModalStore";

import { useAuthStore } from "@/stores/useAuthStore";
import { UserCog, Shield, User, Loader2, Trash2, AlertTriangle, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { JOB_ICONS, JOB_COLORS } from "@/lib/utils";

type UserData = {
  discordId: string;
  discordUsername: string;
  gameUsername?: string;
  class?: string;
  power?: number;
  role: string;
  createdAt: number;
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "owner" || user?.role === "dev";
  const isOwner = user?.role === "owner";
  const isDev = user?.role === "dev";

  const canManageRole = (targetRole: string) => {
    if (isOwner) return true;
    if (isDev) return targetRole !== "owner" && targetRole !== "dev";
    return targetRole !== "owner" && targetRole !== "admin" && targetRole !== "dev";
  };

  const { data: users = [], isLoading, isError } = useQuery<UserData[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await axios.get("/api/users");
      const list = res.data?.data ?? res.data;
      return Array.isArray(list) ? list : [];
    },
    enabled: isAdmin,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ discordId, role }: { discordId: string; role: string }) => {
      await axios.put("/api/users", { discordId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      useModalStore.getState().alert("อัปเดต Role สำเร็จ!");
    },
    onError: (err: any) => {
      useModalStore.getState().alert(err?.response?.data?.error || "เกิดข้อผิดพลาดในการอัปเดต Role");
    },
  });

  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  const deleteUserMutation = useMutation({
    mutationFn: async (discordId: string) => {
      await axios.delete("/api/users", { data: { discordId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserToDelete(null);
      setConfirmInput("");
      useModalStore.getState().alert("ลบผู้ใช้เรียบร้อยแล้ว");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || "เกิดข้อผิดพลาดในการลบผู้ใช้";
      useModalStore.getState().alert(msg);
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showSyncModal, setShowSyncModal] = useState(false);

  const { data: rosterData } = useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const res = await axios.get("/api/roster");
      return res.data?.data ?? res.data ?? {};
    },
    enabled: showSyncModal && isAdmin,
  });
  if (!isAdmin) {
    return (
      <div className="space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-4 lg:py-6 lg:px-6 2xl:px-8 relative">
        <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] p-5 mb-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-600 text-white">
            <UserCog className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400">Access Denied</h1>
            <p className="text-slate-500 dark:text-[#8B93A7] text-sm font-medium mt-0.5">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ Admin เท่านั้น)</p>
          </div>
        </div>
      </div>
    );
  }

  const userList = Array.isArray(users) ? users : [];

  // Sort and filter users: admins first, then by gameUsername
  const filteredUsers = userList.filter((u) => {
    if (!u) return false;
    const search = searchQuery.toLowerCase();
    const discordName = (u.discordUsername || "").toLowerCase();
    const gameName = (u.gameUsername || "").toLowerCase();
    return discordName.includes(search) || gameName.includes(search);
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!a || !b) return 0;
    if ((a.role === "admin" || a.role === "dev") && (b.role !== "admin" && b.role !== "dev")) return -1;
      if ((a.role !== "admin" && a.role !== "dev") && (b.role === "admin" || b.role === "dev")) return 1;
    const nameA = a.gameUsername || a.discordUsername || "";
    const nameB = b.gameUsername || b.discordUsername || "";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-6 bg-[#f0f6fc] dark:bg-[#1C1F27] min-h-screen p-4 lg:py-6 lg:px-6 2xl:px-8 relative">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#232733] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0b3d63] dark:bg-[#3B66D1] shadow-sm"
          >
            <UserCog className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">จัดการผู้ใช้ (User Management)</h1>
            <p className="text-sm text-slate-500 dark:text-[#8B93A7]">
              สมาชิกล็อกอินทั้งหมด <span className="font-bold text-[#0b3d63] dark:text-[#82A0F5]">{userList.length}</span> คน
              {users.filter(u => !u.gameUsername || !u.class).length > 0 && (
                <span className="ml-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded">
                  ⚠ {users.filter(u => !u.gameUsername || !u.class).length} คนยังไม่กรอกข้อมูล
                </span>
              )}
              {searchQuery && ` (ค้นพบ ${filteredUsers.length} คน)`}
            </p>
          </div>
        </div>
        
        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="ค้นหาชื่อในเกม หรือ Discord..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#2D3342] bg-white dark:bg-[#272C38] text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#4D73CD] transition-all placeholder:text-slate-400 dark:placeholder:text-[#6B7280]"
            />
            <svg className="w-5 h-5 absolute right-3 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button
            onClick={() => setShowSyncModal(true)}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-400 transition-colors border border-amber-200 dark:border-amber-500/30"
          >
            <AlertTriangle className="w-4 h-4" />
            ตรวจสอบรายชื่อตกหล่น
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#232733] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 size={48} className="text-[#0b3d63] dark:text-white animate-spin mb-4" />
            <p className="text-slate-500 dark:text-[#8B93A7] font-bold text-lg animate-pulse">กำลังโหลดข้อมูลผู้ใช้...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <p className="text-red-500 font-bold text-lg">ไม่สามารถโหลดข้อมูลผู้ใช้ได้</p>
            <p className="text-slate-400 text-sm mt-1">กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง หรือตรวจสอบสิทธิ์ Admin</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#2D3342]">
                  <th className="py-3 px-4 font-bold text-slate-400 dark:text-[#8B93A7] uppercase tracking-wider text-xs">Discord</th>
                  <th className="py-3 px-4 font-bold text-slate-400 dark:text-[#8B93A7] uppercase tracking-wider text-xs">Game Name</th>
                  <th className="py-3 px-4 font-bold text-slate-400 dark:text-[#8B93A7] uppercase tracking-wider text-xs">Class / Power</th>
                  <th className="py-3 px-4 font-bold text-slate-400 dark:text-[#8B93A7] uppercase tracking-wider text-xs text-center">Role</th>
                  <th className="py-3 px-4 font-bold text-slate-400 dark:text-[#8B93A7] uppercase tracking-wider text-xs text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#333333]">
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-[#6B7280] font-medium">
                      {searchQuery ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา" : "ไม่มีข้อมูลผู้ใช้ในระบบ"}
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((u, index) => (
                    <tr key={u.discordId || `user-${index}`} className={`hover:bg-slate-50/70 dark:hover:bg-[#2A2F3E] transition-colors ${(u.role === 'admin' || u.role === 'dev') ? 'bg-blue-50/50 dark:bg-[#3B66D1]/20' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${(u.role === 'admin' || u.role === 'dev') ? 'bg-theme-warning' : 'bg-slate-400'}`}>
                            {u.discordUsername ? u.discordUsername.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">{u.discordUsername || "Unknown"}</span>
                          {(!u.gameUsername || !u.class) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 ml-1">
                              ⚠ ไม่สมบูรณ์
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-white">{u.gameUsername || "-"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {u.class && JOB_ICONS[u.class] ? (
                            <img src={JOB_ICONS[u.class]} alt={u.class} className="w-7 h-7 object-contain shrink-0 drop-shadow-sm" />
                          ) : null}
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                              {u.class || "-"}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-[#8B93A7]">{u.power ? u.power.toLocaleString() + " CP" : "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center items-center">
                          {u.discordId === user?.discordId ? (
                            <span className={`px-3 py-1 rounded-lg font-bold text-xs border ${
                              u.role === 'owner'
                                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                : (u.role === 'admin' || u.role === 'dev')
                                  ? 'bg-theme-warning/10 text-theme-warning border-theme-warning/30'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#272C38] dark:text-white dark:border-[#2D3342]'
                            }`}>
                              {u.role === 'owner' ? 'Owner' : (u.role === 'admin' || u.role === 'dev') ? (u.role === 'dev' ? 'Dev' : 'Admin') : 'Member'}
                            </span>
                          ) : !canManageRole(u.role || 'member') ? (
                            <span className={`px-3 py-1 rounded-lg font-bold text-xs border ${
                              u.role === 'owner'
                                ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                : 'bg-theme-warning/10 text-theme-warning border-theme-warning/30'
                            }`}>
                              {u.role === 'owner' ? 'Owner' : (u.role === 'dev' ? 'Dev' : 'Admin')}
                            </span>
                          ) : (
                            <select
                              value={u.role || "member"}
                              onChange={async (e) => { 
                                const newRole = e.target.value;
                                if (await useModalStore.getState().confirm(`ต้องการเปลี่ยนยศของ ${u.discordUsername || 'ผู้ใช้'} เป็น ${newRole} ใช่หรือไม่?`)) {
                                  updateRoleMutation.mutate({ discordId: u.discordId, role: newRole });
                                }
                              }}
                              disabled={updateRoleMutation.isPending}
                              className={`px-3 py-1.5 rounded-lg font-bold text-sm border-2 outline-none cursor-pointer transition-colors ${
                                u.role === 'owner'
                                  ? 'bg-purple-100 text-purple-700 border-purple-300 hover:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                  : (u.role === 'admin' || u.role === 'dev') 
                                    ? 'bg-theme-warning/10 text-theme-warning border-theme-warning/30 hover:border-theme-warning' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-[#272C38] dark:text-white dark:border-[#2D3342]'
                              }`}
                            >
                              {isOwner && <option value="owner">Owner</option>}
                              {isOwner && <option value="dev">Dev</option>}
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAdmin && (
                          u.discordId === user?.discordId ? (
                            <span className="text-xs font-semibold text-slate-400 dark:text-[#8B93A7] bg-slate-100 dark:bg-[#272C38] px-2.5 py-1 rounded-md">
                              คุณเอง
                            </span>
                          ) : !canManageRole(u.role || 'member') ? (
                            <span className="text-xs text-slate-400 dark:text-[#6B7280]">
                              -
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setUserToDelete(u);
                                setConfirmInput("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
                              title="ลบผู้ใช้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              ลบ
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ยืนยันการลบผู้ใช้ */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                if (!deleteUserMutation.isPending) {
                  setUserToDelete(null);
                  setConfirmInput("");
                }
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">ยืนยันการลบผู้ใช้</h3>
                <p className="text-xs text-red-500 font-medium">การกระทำนี้จะลบผู้ใช้และไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            {/* Target User Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#272C38] border border-slate-200 dark:border-[#2D3342] space-y-1.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-semibold">ชื่อตัวละคร:</span>
                <span className="font-bold text-slate-800 dark:text-white">{userToDelete.gameUsername || "-"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-semibold">Discord:</span>
                <span className="font-semibold text-slate-700 dark:text-white">{userToDelete.discordUsername}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-semibold">ตำแหน่ง / ยศ:</span>
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-gray-300">{userToDelete.role}</span>
              </div>
            </div>

            {/* Instruction & Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-200">
                พิมพ์คำว่า <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">ยืนยัน</span> ในช่องด้านล่างเพื่อดำเนินการลบ:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="พิมพ์ ยืนยัน"
                disabled={deleteUserMutation.isPending}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#2D3342] bg-white dark:bg-[#1C1F27] text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-slate-400 dark:placeholder:text-[#6B7280]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setConfirmInput("");
                }}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => deleteUserMutation.mutate(userToDelete.discordId)}
                disabled={confirmInput.trim() !== "ยืนยัน" || deleteUserMutation.isPending}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
                  confirmInput.trim() === "ยืนยัน" && !deleteUserMutation.isPending
                    ? "bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30 cursor-pointer"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                }`}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    ลบผู้ใช้
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1F27] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-xl border border-slate-200 dark:border-[#2D3342] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2D3342] flex justify-between items-center bg-slate-50 dark:bg-[#232733]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">รายชื่อที่ไม่ตรงกัน (Sync Check)</h3>
                  <p className="text-xs text-slate-500 dark:text-[#8B93A7]">เทียบรายชื่อผู้ใช้ที่ลงทะเบียน กับรายชื่อใน Roster กิลด์</p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2D3342] rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-[#1C1F27]">
              {!rosterData ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-amber-500 mb-4" />
                  <p className="font-bold text-slate-600 dark:text-slate-400">กำลังโหลดข้อมูล Roster...</p>
                </div>
              ) : (
                (() => {
                  const rosterNames = new Set<string>();
                  const rosterList: any[] = [];
                  Object.keys(rosterData).forEach(job => {
                    if (Array.isArray(rosterData[job])) {
                      rosterData[job].forEach((m: any) => {
                        if (m.name) {
                          rosterNames.add(m.name.trim().toLowerCase());
                          rosterList.push({ name: m.name, job: m.job || job, tier: m.tier });
                        }
                      });
                    }
                  });

                  const userGameNames = new Set(users.map(u => (u.gameUsername || "").trim().toLowerCase()).filter(Boolean));
                  
                  // หาชื่อที่ซ้ำกันในระบบผู้ใช้
                  const nameCounts = new Map<string, number>();
                  const duplicateNames = new Set<string>();
                  users.forEach(u => {
                    const gameName = (u.gameUsername || "").trim().toLowerCase();
                    if (gameName) {
                      const currentCount = nameCounts.get(gameName) || 0;
                      nameCounts.set(gameName, currentCount + 1);
                      if (currentCount >= 1) duplicateNames.add(gameName);
                    }
                  });

                  const duplicateUsers = users.filter(u => {
                    const gameName = (u.gameUsername || "").trim().toLowerCase();
                    return duplicateNames.has(gameName);
                  });
                  
                  const rosterNotInUsers = rosterList.filter(r => !userGameNames.has((r.name || "").trim().toLowerCase()));
                  const usersNotInRoster = users.filter(u => {
                    const gameName = (u.gameUsername || "").trim().toLowerCase();
                    if (!gameName) return true;
                    return !rosterNames.has(gameName);
                  });

                  return (
                    <div className="flex flex-col gap-6">
                      {duplicateUsers.length > 0 && (
                        <div className="bg-white dark:bg-[#232733] rounded-xl border border-purple-200 dark:border-purple-900/50 overflow-hidden flex flex-col">
                          <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-3 border-b border-purple-100 dark:border-purple-900/30">
                            <h4 className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                              <span>พบผู้ใช้ที่กรอกชื่อในเกม &quot;ซ้ำกัน&quot; ในระบบ (อาจเป็นสาเหตุที่จำนวนคนไม่เท่ากัน)</span>
                              <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 text-xs px-2 py-0.5 rounded-full">{duplicateUsers.length}</span>
                            </h4>
                          </div>
                          <div className="p-4 overflow-y-auto">
                            <ul className="space-y-2">
                              {duplicateUsers.map((u, i) => (
                                <li key={i} className="flex flex-col gap-1 text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-[#2A2F3E] border border-slate-100 dark:border-[#333333]">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-purple-700 dark:text-purple-400">{u.gameUsername}</span>
                                    {u.class && <span className="text-xs font-medium px-2 py-1 rounded bg-white dark:bg-[#1C1F27] text-slate-500 shadow-sm border border-slate-200">{u.class}</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <User size={12} /> Discord: {u.discordUsername}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: In Roster but Not In Users */}
                      <div className="bg-white dark:bg-[#232733] rounded-xl border border-red-200 dark:border-red-900/50 overflow-hidden flex flex-col">
                        <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-b border-red-100 dark:border-red-900/30">
                          <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                            <span>มีใน Roster แต่ไม่พบในระบบผู้ใช้</span>
                            <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">{rosterNotInUsers.length}</span>
                          </h4>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto max-h-[50vh]">
                          {rosterNotInUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">ไม่มีรายชื่อตกหล่น</p>
                          ) : (
                            <ul className="space-y-2">
                              {rosterNotInUsers.map((r, i) => (
                                <li key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50 dark:bg-[#2A2F3E] border border-slate-100 dark:border-[#333333]">
                                  <span className="font-bold text-slate-700 dark:text-slate-200">{r.name}</span>
                                  <span className="text-xs font-medium px-2 py-1 rounded bg-white dark:bg-[#1C1F27] text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-[#333333]">{r.job}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Right: In Users but Not In Roster */}
                      <div className="bg-white dark:bg-[#232733] rounded-xl border border-amber-200 dark:border-amber-900/50 overflow-hidden flex flex-col">
                        <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-100 dark:border-amber-900/30">
                          <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <span>มีในระบบผู้ใช้ แต่ไม่พบใน Roster</span>
                            <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full">{usersNotInRoster.length}</span>
                          </h4>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto max-h-[50vh]">
                          {usersNotInRoster.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">รายชื่อตรงกันทั้งหมด</p>
                          ) : (
                            <ul className="space-y-2">
                              {usersNotInRoster.map((u, i) => (
                                <li key={i} className="flex flex-col gap-1 text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-[#2A2F3E] border border-slate-100 dark:border-[#333333]">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                      {u.gameUsername ? u.gameUsername : <span className="text-red-500 italic">ยังไม่กรอกชื่อในเกม</span>}
                                    </span>
                                    {u.class && (
                                      <span className="text-xs font-medium px-2 py-1 rounded bg-white dark:bg-[#1C1F27] text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-[#333333]">{u.class}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <User size={12} /> Discord: {u.discordUsername}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
