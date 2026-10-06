"use client";
import { useModalStore } from "@/stores/useModalStore";
import { formatItemName, formatCategoryLabel, JOB_ICONS, JOB_COLORS } from "@/lib/utils";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuctionItem, AuctionReservation } from "@/types";
import { Search, PackageOpen, Users, GripVertical, Check, Plus, Loader2, Menu, X as CloseIcon, Filter, Star, Copy, X, Send } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Props {
  auctions: AuctionItem[];
  favorites?: string[];
  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
}

export function AuctionQueuesView({ auctions, favorites = [], onToggleFavorite }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [showAnnounceOptions, setShowAnnounceOptions] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const handleToggleFav = (id: string, e: React.MouseEvent) => { if (onToggleFavorite) onToggleFavorite(id, e); };

  const handleAnnounce = async (mode: 'all' | 'first') => {
    setShowAnnounceOptions(false);
    if (selectedItems.length === 0) return;
    if (!await useModalStore.getState().confirm(`ต้องการประกาศไอเทมที่เลือกเข้า Discord (${mode === 'all' ? 'ทุกคิว' : 'เฉพาะคิว 1'}) ใช่หรือไม่?`)) return;
    setIsAnnouncing(true);
    try {
      const res = await fetch("/api/announce-auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auctionIds: selectedItems, mode })
      });
      const text = await res.text();
        let data: any = {};
        try { data = text ? JSON.parse(text) : {}; } catch(e) { throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.substring(0, 100)}`); }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status} ${res.statusText}: ${text ? text.substring(0, 100) : "Empty response"}`);
      useModalStore.getState().alert(`ประกาศเข้า Discord สำเร็จ ${data.count} รายการ!`);
      setSelectedItems([]);
    } catch (err: any) {
      useModalStore.getState().alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleCopyTags = async () => {
    if (selectedItems.length === 0) return;
    setIsCopying(true);
    try {
      const promises = selectedItems.map(id => fetch(`/api/auctions/${id}/reserve`).then(r => r.json()));
      const results = await Promise.all(promises);
      
      let copyText = "";
      selectedItems.forEach((id, index) => {
        const auction = auctions.find(a => a.id === id);
        if (!auction) return;
        
        const queueData = results[index]?.data || [];
        const waiting = queueData.filter((q: any) => q.status === "waiting");
        
        if (waiting.length > 0) {
          copyText += `${formatItemName(auction.itemName, auction.category)}\n`;
          waiting.forEach((q: any, qIdx: number) => {
            copyText += `<@${q.userId}> [${q.characterName}] [คิวที่ ${qIdx + 1}]\n`;
          });
          copyText += `\n`;
        }
      });
      
      if (copyText.trim()) {
        await navigator.clipboard.writeText(copyText.trim());
        useModalStore.getState().alert("คัดลอกข้อความสำเร็จแล้ว!");
      } else {
        useModalStore.getState().alert("ไม่มีคิวที่กำลังรอในไอเทมที่เลือกเลยครับ");
      }
    } catch (err: any) {
      useModalStore.getState().alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsCopying(false);
    }
  };

  const [selectedAuctionId, setSelectedAuctionId] = useState<string>(auctions[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const selectedAuction = auctions.find(a => a.id === selectedAuctionId);

  const { data: queue, isLoading } = useQuery<AuctionReservation[]>({
    queryKey: ["auction_queue", selectedAuctionId],
    queryFn: async () => {
      if (!selectedAuctionId) return [];
      const res = await fetch(`/api/auctions/${selectedAuctionId}/reserve`);
      if (!res.ok) throw new Error("Failed to fetch queue");
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!selectedAuctionId,
  });

  const { data: rosterRes } = useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const res = await fetch("/api/roster");
      return res.json();
    },
    enabled: isAdmin,
  });
  const rosterData = (typeof rosterRes?.data?.data === "object" ? rosterRes?.data?.data : (typeof rosterRes?.data === "object" ? rosterRes?.data : {})) || {};
  const roster = Object.entries(rosterData || {}).flatMap(([job, members]) => Array.isArray(members) ? members.map((m: any) => ({ ...m, job })) : []);

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch(`/api/auctions/${selectedAuctionId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) throw new Error("ไม่สามารถจัดลำดับคิวได้");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_queue", selectedAuctionId] });
    }
  });

  const awardMutation = useMutation({
    mutationFn: async (reservation: any) => {
      if (!await useModalStore.getState().confirm("ยืนยันว่าผู้ใช้นี้ได้รับของแล้ว?")) throw new Error("Cancelled");
      const res = await fetch(`/api/auctions/${selectedAuctionId}/award?reservationId=${reservation.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: reservation.userId,
          characterName: reservation.characterName
        })
      });
      if (!res.ok) throw new Error("ไม่สามารถบันทึกการรับของได้");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_queue", selectedAuctionId] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    }
  });

  const addManualMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const member = roster.find((m: any) => m.discordId === memberId);
      if (!member) throw new Error("ไม่พบรายชื่อ");
      const res = await fetch(`/api/auctions/${selectedAuctionId}/reserve-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: member.discordId,
          characterName: member.name,
          job: member.job || "Novice"
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "ไม่สามารถเพิ่มคิวได้");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_queue", selectedAuctionId] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      setIsAdding(false);
      setSelectedMember("");
      setMemberSearchQuery("");
    },
    onError: (err: any) => useModalStore.getState().alert(err.message)
  });

  const skipMutation = useMutation({
    mutationFn: async (resId: string) => {
      if (!await useModalStore.getState().confirm("ยืนยันการข้ามคิว (ย้ายไปต่อท้ายสุด)?")) throw new Error("Cancelled");
      const res = await fetch(`/api/auctions/${selectedAuctionId}/skip?reservationId=${resId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("ไม่สามารถข้ามคิวได้");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_queue", selectedAuctionId] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
    onError: (err: any) => {
      if (err.message !== "Cancelled") useModalStore.getState().alert(err.message);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (resId: string) => {
      if (!await useModalStore.getState().confirm("ยืนยันการสละคิว (หรือลบผู้ใช้ออกจากคิว)?")) throw new Error("Cancelled");
      const res = await fetch(`/api/auctions/${selectedAuctionId}/reserve?reservationId=${resId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ไม่สามารถสละคิวได้");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_queue", selectedAuctionId] });
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
    onError: (err: any) => {
      if (err.message !== "Cancelled") useModalStore.getState().alert(err.message);
    }
  });

  const filteredAuctions = auctions.filter(a => 
    a.itemName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterCategory === "all" || a.category === filterCategory)
  ).sort((a, b) => {
    // 1. Sort by favorites first
    const aFav = favorites.includes(a.id) ? 1 : 0;
    const bFav = favorites.includes(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    
    // 2. Sort by category order
    const catOrder: Record<string, number> = { relic: 1, card: 2, gear80: 3, gear90: 4 };
    const aOrder = catOrder[a.category] || 99;
    const bOrder = catOrder[b.category] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // 3. Sort alphabetically
    return (a.itemName || "").localeCompare(b.itemName || "");
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !queue) return;
    
    const items = Array.from(queue || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistically update UI
    queryClient.setQueryData(["auction_queue", selectedAuctionId], items);

    // Send new order to server
    reorderMutation.mutate((items || []).map(item => item.id));
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      {/* Mobile Toggle Button */}
      

      {/* Sidebar */}
      <div className={`w-full lg:w-1/3 flex-col gap-4 ${isSidebarOpen ? "flex" : "hidden"}`}>
        <div className="bg-white dark:bg-[#1A1D27] p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] flex flex-col gap-4 h-[600px]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">เลือกไอเทม</h3>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A2F3E] rounded-lg transition-colors"
              title="ซ่อนแถบเลือกไอเทม"
            >
              <Menu size={18} />
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
              type="text"
              placeholder="ค้นหาไอเทม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B66D1] text-slate-800 dark:text-white text-sm"
            />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-[#2D3342] rounded-xl text-sm bg-slate-50 dark:bg-[#232733] text-slate-800 dark:text-white focus:outline-none"
            >
              <option value="all">ทุกหมวด</option>
              <option value="relic">Relic</option>
                <option value="card">Card</option>
                <option value="gear80">Gear Lv.80</option>
                <option value="gear90">Gear Lv.90</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {(filteredAuctions || []).map(auction => (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedAuctionId(auction.id);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }
                }}
                key={auction.id}
                onClick={() => {
                        setSelectedAuctionId(auction.id);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors ${selectedAuctionId === auction.id ? "bg-[#3B66D1]/10 border border-[#3B66D1]/30" : "hover:bg-slate-50 dark:hover:bg-[#232733] border border-transparent"}`}
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  {isAdmin && (
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center shrink-0 mt-1.5">
                      <input 
                        type="checkbox" 
                        checked={selectedItems.includes(auction.id)} 
                        onChange={(e) => {
                          if (e.target.checked) setSelectedItems(prev => [...prev, auction.id]);
                          else setSelectedItems(prev => prev.filter(id => id !== auction.id));
                        }} 
                        className="w-4 h-4 rounded border-slate-300 text-[#3B66D1] focus:ring-[#3B66D1] cursor-pointer" 
                      />
                    </div>
                  )}
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-[#2D3342] flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                    {auction.imageUrl ? (
                      <img src={auction.imageUrl} alt={formatItemName(auction.itemName, auction.category)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">📦</span>
                    )}
                  </div>
                  <span translate="no" className={`notranslate text-sm line-clamp-2 text-wrap leading-tight font-bold ${selectedAuctionId === auction.id ? "text-[#0b3d63] dark:text-[#5B86F1]" : "text-slate-700 dark:text-slate-300"}`}>
                    {formatItemName(auction.itemName, auction.category)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={(e) => handleToggleFav(auction.id, e)}
                    className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#32394A] transition-colors shrink-0"
                  >
                    <Star size={14} className={favorites.includes(auction.id) ? "fill-yellow-400 text-yellow-400" : "text-slate-300 dark:text-slate-600"} />
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#2D3342] text-slate-500 shrink-0">
                    {auction.queueCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {isAdmin && selectedItems.length > 0 && (
            <div className="mt-2 p-3 bg-[#3B66D1]/10 border border-[#3B66D1]/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#3B66D1] dark:text-[#82A0F5]">{selectedItems.length} รายการ</span>
                <button onClick={() => setSelectedItems([])} className="p-1 hover:bg-[#3B66D1]/20 rounded-lg text-[#3B66D1] dark:text-[#82A0F5] transition-colors" title="ยกเลิกการเลือก"><X size={14} /></button>
              </div>
              <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowAnnounceOptions(!showAnnounceOptions)} 
                  disabled={isAnnouncing || isCopying}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isAnnouncing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  แจ้งลงดิสคอร์ด
                </button>
                {showAnnounceOptions && (
                  <div className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-[#1A1D27] rounded-xl shadow-lg border border-slate-200 dark:border-[#2D3342] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                    <button 
                      onClick={() => handleAnnounce('all')}
                      className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2D3342] transition-colors"
                    >
                      ส่งรายชื่อทั้งหมด
                    </button>
                    <button 
                      onClick={() => handleAnnounce('first')}
                      className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2D3342] transition-colors border-t border-slate-100 dark:border-[#2D3342]"
                    >
                      ส่งรายชื่อคิว 1
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={handleCopyTags} 
                disabled={isCopying}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B66D1] hover:bg-[#2c4d9e] text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isCopying ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                คัดลอกแจ้งเตือน
              </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`w-full ${isSidebarOpen ? "lg:w-2/3" : "lg:w-full"}`}>
        <div className="bg-white dark:bg-[#1A1D27] rounded-2xl shadow-sm border border-slate-200 dark:border-[#2D3342] overflow-hidden flex flex-col h-[600px]">
          {selectedAuction ? (
            <>
              <div className="p-6 border-b border-slate-200 dark:border-[#2D3342] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {!isSidebarOpen && (
                      <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-[#232733] dark:hover:bg-[#2A2F3E] rounded-lg transition-colors" title="แสดงแถบเลือกไอเทม">
                        <Menu size={20} />
                      </button>
                    )}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-[#2D3342] flex items-center justify-center shrink-0 overflow-hidden">
                    {selectedAuction.imageUrl ? (
                      <img src={selectedAuction.imageUrl} alt={formatItemName(selectedAuction.itemName, selectedAuction.category)} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div>
                    <h2 translate="no" className="notranslate text-xl font-bold text-slate-800 dark:text-white">{formatItemName(selectedAuction.itemName, selectedAuction.category)}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#2D3342] text-slate-500">
                        {formatCategoryLabel(selectedAuction.category)}
                      </span>
                      {selectedAuction.price !== undefined && selectedAuction.price !== null && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center gap-1">
                          💎 {selectedAuction.price.toLocaleString()} Starstone
                        </span>
                      )}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        คิวทั้งหมด: {selectedAuction.queueCount}
                      </span>
                      {(() => {
                        const myIdx = (queue || []).findIndex(q => q.userId === user?.discordId || q.characterName === user?.gameUsername);
                        if (myIdx >= 0) {
                          return (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                              ลำดับคิวของคุณ: {myIdx + 1}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setIsAdding(!isAdding);
                      setSelectedMember("");
                      setMemberSearchQuery("");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-sm"
                  >
                    <Plus size={16} />
                    เพิ่มคนเข้าคิว
                  </button>
                )}
              </div>

              {isAdmin && isAdding && (
                <div className="p-4 bg-sky-50 dark:bg-sky-500/10 border-b border-sky-100 dark:border-sky-500/20 flex gap-2 items-center relative z-20">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="พิมพ์เพื่อค้นหารายชื่อสมาชิก..."
                      value={memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setSelectedMember("");
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                      onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                      className="w-full px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-500/30 bg-white dark:bg-[#1A1D27] text-sm focus:outline-none focus:border-sky-400"
                    />
                    {showMemberDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1A1D27] border border-sky-200 dark:border-sky-500/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {(roster || [])
                          .filter((r: any) => r.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                          .map((r: any) => (
                            <div
                              key={r.discordId || r.name}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-500/10 dark:text-white"
                              onClick={() => {
                                setSelectedMember(r.discordId);
                                setMemberSearchQuery(`${r.name} (${r.job || "Novice"})`);
                                setShowMemberDropdown(false);
                              }}
                            >
                              {r.name} ({r.job || "Novice"})
                            </div>
                        ))}
                        {(roster || []).filter((r: any) => r.name?.toLowerCase().includes(memberSearchQuery.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500 text-center">ไม่พบรายชื่อ</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => addManualMutation.mutate(selectedMember)}
                    disabled={!selectedMember || addManualMutation.isPending}
                    className="px-4 py-2 bg-[#0b3d63] dark:bg-[#3B66D1] text-white rounded-lg font-bold text-sm hover:bg-[#093250] dark:hover:bg-[#4D73CD] disabled:opacity-50"
                  >
                    {addManualMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "เพิ่มเข้าคิว"}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-400">กำลังโหลด...</div>
                ) : !queue || queue.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center text-slate-400">
                    <PackageOpen size={48} className="mb-3 opacity-20" />
                    <p className="font-bold">ยังไม่มีคนจองคิวไอเทมชิ้นนี้</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="overflow-x-auto w-full max-w-full">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 dark:bg-[#232733] sticky top-0 z-10 border-b border-slate-200 dark:border-[#2D3342]">
                        <tr>
                          {isAdmin && <th className="w-10"></th>}
                          <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">คิวที่</th>
                          <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อตัวละคร</th>
                          <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">อาชีพ</th>
                          <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">จัดการ</th>
                        </tr>
                      </thead>
                      
                      <Droppable droppableId="queue-list" isDropDisabled={!isAdmin}>
                        {(provided) => (
                          <tbody 
                            className="divide-y divide-slate-100 dark:divide-[#2D3342]"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {(queue || []).map((res, idx) => (
                              <Draggable key={res.id} draggableId={res.id} index={idx} isDragDisabled={!isAdmin}>
                                {(provided, snapshot) => (
                                  <tr 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={provided.draggableProps.style}
                                    className={`transition-colors ${snapshot.isDragging ? "bg-white dark:bg-[#2A2F3E] shadow-lg border border-sky-500" : "hover:bg-slate-50 dark:hover:bg-[#232733]/50"}`}
                                  >
                                    {isAdmin && (
                                      <td className="pl-4 py-4 w-10">
                                        <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab">
                                          <GripVertical size={16} />
                                        </div>
                                      </td>
                                    )}
                                    <td className="py-4 px-6 text-sm font-bold text-slate-700 dark:text-white">
                                      #{idx + 1}
                                    </td>
                                    <td className="py-4 px-6 text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                                      {res.characterName}
                                      {res.userId === user?.discordId && (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase">You</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-sm">
                                      <div className="inline-flex items-center gap-2">
                                        {res.job && JOB_ICONS[res.job] && <img src={JOB_ICONS[res.job]} alt={res.job} className="w-6 h-6 object-contain shrink-0 drop-shadow-sm" />}
                                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold text-white shadow-sm" style={{ backgroundColor: (res.job && JOB_COLORS[res.job]) || "#475569" }}>
                                          {res.job}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-right">
                                      {isAdmin ? (
                                        <div className="flex flex-wrap justify-end gap-2">
                                          {res.status !== "won" && (
                                            <button 
                                              onClick={() => awardMutation.mutate(res)}
                                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-sm"
                                            >
                                              ได้รับของ
                                            </button>
                                          )}
                                          {res.status !== "won" && idx < (queue || []).length - 1 && (
                                            <button 
                                              onClick={() => skipMutation.mutate(res.id)}
                                              className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors shadow-sm"
                                            >
                                              ข้ามคิว
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => cancelMutation.mutate(res.id)}
                                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors shadow-sm"
                                          >
                                            สละคิว
                                          </button>
                                        </div>
                                      ) : (
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${res.status === "won" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                          {res.status === "won" ? "ได้รับของแล้ว" : res.status === "waiting" ? "รอคิว" : res.status}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </tbody>
                        )}
                      </Droppable>
                    </table>
                  </div>
                </DragDropContext>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-[#232733] dark:hover:bg-[#2A2F3E] rounded-xl transition-colors shadow-sm">
                <Menu size={24} />
              </button>
              <p>กรุณาเลือกไอเทมจากเมนู</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
