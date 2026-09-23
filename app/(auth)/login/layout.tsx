import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://row-huh.vercel.app";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
  description: "ระบบจัดการกิลด์ HUH? เข้าสู่ระบบสำหรับสมาชิกและผู้ดูแล",
  openGraph: {
    title: "เข้าสู่ระบบ | HUH?",
    description: "ระบบจัดการกิลด์ HUH? เข้าสู่ระบบสำหรับสมาชิกและผู้ดูแล",
    url: `${siteUrl}/login`,
    siteName: "HUH?",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HUH? Login",
        type: "image/jpeg",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "เข้าสู่ระบบ | HUH?",
    description: "ระบบจัดการกิลด์ HUH? เข้าสู่ระบบสำหรับสมาชิกและผู้ดูแล",
    images: ["/og-image.jpg"],
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
