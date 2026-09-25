"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
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
    onError: (err: any) => alert(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!window.confirm(`🗑️ ยืนยันการลบ "\n\n${auction.itemName}"\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้! คิวทั้งหมดจะหายไปด้วย`)) {
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
      if (err.message !== "Cancelled") alert(err.message);
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
      onClose();
    },
    onError: (err: any) => alert(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (png, jpg)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("ขนาดรูปภาพต้องไม่เกิน 2MB");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImageUrl(base64);
      updateImageMutation.mutate(base64);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-[#2D3342]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2D3342]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate pr-4">แก้ไข: {auction.itemName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          {/* Image Upload Section */}
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
                <p className="text-[10px] text-slate-500 mt-2">รองรับ PNG, JPG ขนาดไม่เกิน 2MB</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-[#2D3342] w-full" />

          {/* Actions Section */}
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
