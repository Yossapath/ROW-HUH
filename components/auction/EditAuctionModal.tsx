"use client";
import { useModalStore } from "@/stores/useModalStore";
import { formatItemName } from "@/lib/utils";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, RefreshCw, Upload, Image as ImageIcon, Save, Gem } from "lucide-react";
import { AuctionItem } from "@/types";

interface Props {
  auction: AuctionItem;
  onClose: () => void;
}

export function EditAuctionModal({ auction, onClose }: Props) {
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState(auction.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Name & Price state ──────────────────────────────────────
  const [itemName, setItemName] = useState(auction.itemName);
  const [price, setPrice] = useState<string>(
    auction.price !== undefined ? String(auction.price) : ""
  );
  const [infoSaved, setInfoSaved] = useState(false);

  // Save name + price mutation
  const infoMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { itemName: itemName.trim() };
      if (price.trim() !== "") {
        const parsed = parseInt(price, 10);
        if (isNaN(parsed) || parsed < 0) throw new Error("ราคาต้องเป็นตัวเลขที่ไม่ติดลบ");
        body.price = parsed;
      } else {
        body.price = null; // clear price
      }
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("ไม่สามารถบันทึกข้อมูลได้");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2500);
    },
    onError: (err: any) => useModalStore.getState().alert(err.message),
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: "open" | "closed") => {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      onClose();
    },
    onError: (err: any) => useModalStore.getState().alert(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!await useModalStore.getState().confirm(`🗑️ ยืนยันการลบ "\n\n${formatItemName(auction.itemName, auction.category)}"\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้! คิวทั้งหมดจะหายไปด้วย`)) {
        throw new Error("Cancelled");
      }
      const res = await fetch(`/api/auctions/${auction.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      onClose();
    },
    onError: (err: any) => {
      if (err.message !== "Cancelled") useModalStore.getState().alert(err.message);
    },
  });

  // Update image mutation
  const updateImageMutation = useMutation({
    mutationFn: async (newImageUrl: string) => {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: newImageUrl }),
      });
      if (!res.ok) throw new Error("Failed to update image");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
    onError: (err: any) => useModalStore.getState().alert(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      useModalStore.getState().alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (png, jpg)");
      return;
    }
    if (file.size > 700 * 1024) {
      useModalStore.getState().alert("ขนาดรูปภาพต้องไม่เกิน 700KB (Firestore limit)");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImageUrl(base64);
      setIsUploading(false);
      updateImageMutation.mutate(base64);
    };
    reader.onerror = () => {
      setIsUploading(false);
      useModalStore.getState().alert("ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่");
    };
    reader.readAsDataURL(file);
  };

  const isDirty =
    itemName.trim() !== auction.itemName ||
    price !== (auction.price !== undefined ? String(auction.price) : "");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-[#2D3342] max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2D3342]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate pr-4">
            แก้ไข: <span translate="no" className="notranslate">{formatItemName(auction.itemName, auction.category)}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">

          {/* ── Name & Price ──────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              ชื่อไอเทม
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              maxLength={100}
              placeholder="ชื่อไอเทม"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2D3342] bg-slate-50 dark:bg-[#232733] text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-[#4D73CD] focus:outline-none"
            />

            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              ราคา (Starstone)
            </label>
            <div className="relative">
              <Gem size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 pointer-events-none" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
                step={1}
                placeholder="ยังไม่ระบุราคา"
                className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-[#2D3342] bg-slate-50 dark:bg-[#232733] text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sky-400 pointer-events-none">
                Starstone
              </span>
            </div>

            <button
              onClick={() => infoMutation.mutate()}
              disabled={infoMutation.isPending || !itemName.trim() || !isDirty}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0b3d63] dark:bg-[#3B66D1] text-white font-bold rounded-xl hover:bg-[#093250] dark:hover:bg-[#4D73CD] transition-colors disabled:opacity-40 text-sm"
            >
              {infoMutation.isPending ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
              {infoSaved ? "✓ บันทึกแล้ว" : "บันทึกชื่อ & ราคา"}
            </button>
          </div>

          <div className="h-px bg-slate-100 dark:bg-[#2D3342] w-full" />

          {/* ── Image Upload ──────────────────────────────── */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              รูปภาพไอเทม
            </label>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-[#2D3342] border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-slate-400" size={24} />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || updateImageMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] hover:bg-slate-200 dark:hover:bg-[#2A2F3E] text-slate-700 dark:text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isUploading || updateImageMutation.isPending ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  {imageUrl ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                </button>
                {updateImageMutation.isSuccess && (
                  <p className="text-[10px] text-green-500 mt-2 font-bold">✓ บันทึกรูปภาพเรียบร้อยแล้ว</p>
                )}
                {!updateImageMutation.isSuccess && (
                  <p className="text-[10px] text-slate-500 mt-2">รองรับ PNG, JPG ขนาดไม่เกิน 700KB</p>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-[#2D3342] w-full" />

          {/* ── Queue Management ──────────────────────────── */}
          <div className="flex flex-col gap-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              การจัดการคิว
            </label>

            {auction.status === "open" ? (
              <button
                onClick={() => statusMutation.mutate("closed")}
                disabled={statusMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-[#2D3342] text-slate-700 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#3B4358] transition-colors disabled:opacity-50"
              >
                {statusMutation.isPending ? <RefreshCw className="animate-spin" size={18} /> : null}
                ปิดจอง
              </button>
            ) : (
              <button
                onClick={() => statusMutation.mutate("open")}
                disabled={statusMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 font-bold rounded-xl hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
              >
                {statusMutation.isPending ? <RefreshCw className="animate-spin" size={18} /> : null}
                เปิดจอง
              </button>
            )}

            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors mt-2 disabled:opacity-50"
            >
              {deleteMutation.isPending ? <RefreshCw className="animate-spin" size={18} /> : null}
              ลบไอเท็ม
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
