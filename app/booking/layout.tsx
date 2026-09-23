import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://row-huh.vercel.app";

export const metadata: Metadata = {
  title: "จองคิวดันเจี้ยน",
  description: "ระบบจองคิวดันเจี้ยนกิลด์ ตรวจสอบสถานะ คิวที่กำลังลง และเวลาประมาณการ Real-time",
  openGraph: {
    title: "จองคิวดันเจี้ยน | HUH?",
    description: "ระบบจองคิวดันเจี้ยนกิลด์ ตรวจสอบสถานะ คิวที่กำลังลง และเวลาประมาณการ Real-time",
    url: `${siteUrl}/booking`,
    siteName: "HUH?",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HUH? Dungeon Booking",
        type: "image/jpeg",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "จองคิวดันเจี้ยน | HUH?",
    description: "ระบบจองคิวดันเจี้ยนกิลด์ ตรวจสอบสถานะ คิวที่กำลังลง และเวลาประมาณการ Real-time",
    images: ["/og-image.jpg"],
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
