import type { Metadata } from "next";
import ClientRedirect from "./client-redirect";

export const metadata: Metadata = {
  title: "HUH? - ระบบข้อมูลกิลด์",
  description:
    "ระบบจัดการกิลด์ครบ จบในที่เดียว จัดการสมาชิก จัดทีม GVG จัดทีม GL และฟีเจอร์อื่นๆ อีกมากมาย",
};

export default function Home() {
  return <ClientRedirect />;
}

