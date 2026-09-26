"use client";
import { useModalStore } from "@/stores/useModalStore";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, RefreshCw, Upload, Image as ImageIcon, Gem } from "lucide-react";
import { useRef } from "react";
import { AuctionCategory } from "@/types";

interface Props {
  onClose: () => void;
}

export function AddAuctionModal({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<AuctionCategory>("gear");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      useModalStore.getState().alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (png, jpg)");
      return;
    }
    if (file.size > 700 * 1024) {
      useModalStore.getState().alert("ขนาดรูปภาพต้องไม่เกิน 700KB");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImageUrl(base64);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { itemName: itemName.trim(), category, imageUrl };
      if (price.trim() !== "") {
        const parsed = parseInt(price, 10);
        if (isNaN(parsed) || parsed < 0) throw new Error("ราคาต้องเป็นตัวเลขที่ไม่ติดลบ");
        payload.price = parsed;
      }
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctions"] });
      onClose();
    },
    onError: (err: any) => useModalStore.getState().alert(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D27] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-[#2D3342]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2D3342]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">เพิ่มไอเทมประมูล</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อไอเทม
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Royal - Bradium Brooch I"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B66D1] text-slate-800 dark:text-white"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                placeholder="ระบุราคา เช่น 500 (ไม่บังคับ)"
                className="w-full pl-9 pr-20 py-2 bg-slate-50 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B66D1] text-slate-800 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-sky-400 pointer-events-none">
                Starstone
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              รูปภาพไอเทม
            </label>
            <div className="flex items-start gap-4 mb-4">
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
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] hover:bg-slate-200 dark:hover:bg-[#2A2F3E] text-slate-700 dark:text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                  {imageUrl ? "เปลี่ยนรูปภาพ" : "อัปโหลดรูปภาพ"}
                </button>
                <p className="text-[10px] text-slate-500 mt-2">รองรับ PNG, JPG ขนาดไม่เกิน 700KB</p>
              </div>
            </div>
          </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              หมวดหมู่
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AuctionCategory)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-[#232733] border border-slate-200 dark:border-[#2D3342] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B66D1] text-slate-800 dark:text-white appearance-none"
            >
              <option value="gear">Gear (อุปกรณ์)</option>
              <option value="card">Card (การ์ด)</option>
              <option value="pet">Pet (สัตว์เลี้ยง)</option>
              <option value="relic">Relic (เรลิค)</option>
            </select>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-[#2D3342] text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-[#3B4358] transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !itemName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0b3d63] dark:bg-[#3B66D1] text-white font-bold rounded-xl hover:bg-[#093250] dark:hover:bg-[#4D73CD] transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : null}
              บันทึกไอเทม
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
