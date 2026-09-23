import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-prompt",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://row-huh.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HUH? - ระบบข้อมูลกิลด์",
    template: "%s | HUH?",
  },
  description:
    "ระบบจัดการกิลด์ครบ จบในที่เดียว จัดการสมาชิก จัดทีม GVG จัดทีม GL และฟีเจอร์อื่นๆ อีกมากมาย",
  openGraph: {
    title: "HUH? - ระบบข้อมูลกิลด์",
    description:
      "ระบบจัดการกิลด์ครบ จบในที่เดียว จัดการสมาชิก จัดทีม GVG จัดทีม GL และฟีเจอร์อื่นๆ อีกมากมาย",
    url: siteUrl,
    siteName: "HUH?",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HUH? Banner",
        type: "image/jpeg",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HUH? - ระบบข้อมูลกิลด์",
    description:
      "ระบบจัดการกิลด์ครบ จบในที่เดียว จัดการสมาชิก จัดทีม GVG จัดทีม GL และฟีเจอร์อื่นๆ อีกมากมาย",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`min-h-screen bg-background text-foreground antialiased ${prompt.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
