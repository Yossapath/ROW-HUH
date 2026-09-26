"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import CompleteProfilePopup from "@/components/CompleteProfilePopup";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUser } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Desktop: ย่อ/ขยาย inline
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  // Mobile (<lg): overlay เปิด/ปิด
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(!isAuthenticated);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      fetch("/api/auth/me")
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.data) {
            setUser(data.data);
          } else {
            router.push("/login");
          }
        })
        .catch(() => {
          router.push("/login");
        })
        .finally(() => setLoadingAuth(false));
    } else {
      setLoadingAuth(false);
    }
  }, [isAuthenticated, router, setUser]);

  if (!mounted || loadingAuth) return (
    <div className="flex h-screen items-center justify-center bg-theme-bg text-theme-text font-bold">
      Loading...
    </div>
  );
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-theme-bg text-theme-text overflow-hidden overflow-x-hidden transition-colors duration-300">
      <Sidebar
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        <TopHeader
          isSidebarExpanded={isSidebarExpanded}
          toggleSidebar={() => {
            // < lg: toggle overlay; >= lg: toggle inline expand
            if (window.innerWidth < 1024) {
              setIsMobileMenuOpen(prev => !prev);
            } else {
              setIsSidebarExpanded(prev => !prev);
            }
          }}
        />
        <main className="flex-1">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
      <CompleteProfilePopup />
    </div>
  );
}
