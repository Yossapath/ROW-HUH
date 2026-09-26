"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Shield,
  Swords,
  CheckSquare,
  CalendarOff,
  ScrollText,
  UserCog,
  Gavel,
} from "lucide-react";

const MENUS = [
  { name: "รายชื่อสมาชิก", path: "/dashboard/roster", icon: Users },
  { name: "จัดทีม GVG", path: "/dashboard/teams", icon: Shield },
  { name: "ดันเจี้ยน", path: "/dashboard/dungeon", icon: Swords },
  { name: "จองคิวประมูล", path: "/dashboard/auction", icon: Gavel },
  { name: "เช็คชื่อวอ", path: "/dashboard/attendance", icon: CheckSquare },
  { name: "แจ้งลา", path: "/dashboard/leave", icon: CalendarOff },
  { name: "จัดการผู้ใช้", path: "/dashboard/users", icon: UserCog },
  { name: "ประวัติระบบ", path: "/dashboard/log", icon: ScrollText },
];

interface SidebarProps {
  isExpanded: boolean;       // desktop: ย่อ/ขยาย inline
  isMobileOpen: boolean;     // mobile: overlay เปิด/ปิด
  onMobileClose: () => void; // ปิด overlay เมื่อกด backdrop หรือเลือก menu
}

export default function Sidebar({ isExpanded, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* ─── Mobile backdrop overlay ─────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ─── Sidebar panel ───────────────────────────────────── */}
      <aside
        className={`
          bg-[#0b3d63] dark:bg-[#171D27] h-screen flex flex-col
          transition-all duration-300 shadow-xl
          border-r border-[#082e4b] dark:border-[#1F2430]

          /* Mobile: fixed overlay, slides in/out */
          fixed top-0 left-0 z-50
          lg:relative lg:z-30 lg:translate-x-0

          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${
            /* Desktop width */
            isExpanded ? "w-64" : "lg:w-20"
          }
          /* Mobile always full sidebar width when open */
          w-64
        `}
      >
        <div
          className={`p-5 flex flex-col justify-center min-h-[64px] border-b border-white/10 dark:border-white/10 ${
            isExpanded ? "items-start" : "lg:items-center items-start"
          }`}
        >
          <div className="flex items-center space-x-2">
            {/* Always show title on mobile; desktop depends on isExpanded */}
            <h2
              className={`font-extrabold text-xl tracking-tight text-white uppercase whitespace-nowrap ${
                isExpanded ? "" : "lg:hidden"
              }`}
            >
              HUH?
            </h2>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {MENUS.map((menu) => {
            const isActive = pathname === menu.path;
            const Icon = menu.icon;
            return (
              <Link
                key={menu.path}
                href={menu.path}
                title={menu.name}
                onClick={onMobileClose}
                className={`flex items-center transition-all ${
                  /* Mobile always show label; desktop depends on isExpanded */
                  isExpanded
                    ? "px-4 py-3 space-x-3 rounded-xl"
                    : "lg:px-0 lg:py-3 lg:justify-center px-4 py-3 space-x-3 rounded-xl"
                } ${
                  isActive
                    ? "bg-white text-[#0b3d63] font-bold shadow-md dark:bg-[#3B66D1] dark:text-white dark:shadow-lg dark:shadow-[#3B66D1]/25"
                    : "text-blue-100 hover:bg-white/10 hover:text-white dark:text-[#8B93A7] dark:hover:bg-[#232733] dark:hover:text-white font-medium"
                }`}
              >
                <Icon
                  size={isExpanded ? 20 : 22}
                  className="flex-shrink-0"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`whitespace-nowrap ${
                    isExpanded ? "" : "lg:hidden"
                  }`}
                >
                  {menu.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
