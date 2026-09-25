import { create } from "zustand";

export interface ModalOptions {
  title: string;
  message: string;
  type?: "alert" | "confirm" | "danger";
  requireInput?: string; // e.g. "ยืนยัน"
  confirmText?: string;
  cancelText?: string;
}

interface ModalStore {
  isOpen: boolean;
  options: ModalOptions;
  resolvePromise: ((value: boolean) => void) | null;
  
  alert: (options: string | Omit<ModalOptions, "type">) => Promise<boolean>;
  confirm: (options: string | Omit<ModalOptions, "type">) => Promise<boolean>;
  close: (value: boolean) => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  isOpen: false,
  options: { title: "", message: "", type: "alert" },
  resolvePromise: null,

  alert: (opts) => {
    return new Promise((resolve) => {
      const options = typeof opts === "string" ? { title: "แจ้งเตือน", message: opts } : opts;
      set({ isOpen: true, options: { ...options, type: "alert" }, resolvePromise: resolve });
    });
  },

  confirm: (opts) => {
    return new Promise((resolve) => {
      const options = typeof opts === "string" ? { title: "ยืนยันการทำรายการ", message: opts } : opts;
      set({ isOpen: true, options: { ...options, type: options.requireInput ? "danger" : "confirm" }, resolvePromise: resolve });
    });
  },

  close: (value) => {
    const { resolvePromise } = get();
    if (resolvePromise) resolvePromise(value);
    set({ isOpen: false, resolvePromise: null });
  }
}));
