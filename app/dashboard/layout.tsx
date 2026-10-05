"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import CompleteProfilePopup from "@/components/CompleteProfilePopup";
import InactiveScreen from "@/components/InactiveScreen";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUser, inactive, setInactive } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Desktop: ย่อ/ขยาย inline
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  // Mobile (<lg): overlay เปิด/ปิด
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(!isAuthenticated);

  // Body scroll lock
  useEffect(() => {
    if (isMobileMenuOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      fetch("/api/auth/me", { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.data) {
            setUser(data.data);
          } else if (data.code === "INACTIVE") {
            setInactive({ message: data.error, reason: data.reason ?? null });
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
  }, [isAuthenticated, router, setUser, setInactive]);

  // Poll every 60s: an active user who gets kicked / loses the HUH? role (or is switched
  // off by an admin) flips to Inactive automatically, and comes back when Active again.
  useEffect(() => {
    const timer = setInterval(() => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.data) {
            if (useAuthStore.getState().inactive) {
              setUser(data.data);
              setInactive(null);
            }
          } else if (data.code === "INACTIVE") {
            setInactive({ message: data.error, reason: data.reason ?? null });
          }
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [setUser, setInactive]);

  if (inactive) return <InactiveScreen />;

  if (!mounted || loadingAuth) return (
    <div className="flex h-screen items-center justify-center bg-theme-bg text-theme-text font-bold">
      Loading...
    </div>
  );
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-theme-bg text-theme-text overflow-hidden transition-colors duration-300">
      <Sidebar
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopHeader
          isSidebarExpanded={isSidebarExpanded}
          isMobileMenuOpen={isMobileMenuOpen}
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
