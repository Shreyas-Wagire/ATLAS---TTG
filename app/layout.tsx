import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ATLAS Engine v4.4 — Automated Academic Timetable Generator",
  description: "Next-generation 2D constraint-driven university timetable engine powered by the proprietary ATLAS Algorithm (College-Wide Pipeline, Multi-Course Practical Stacking, DAPS, RCAA, CASC). Zero conflict guarantee.",
  keywords: [
    "ATLAS Engine",
    "ATLAS Algorithm",
    "university timetable generator",
    "academic scheduling software",
    "conflict-free timetable",
    "2D timetable matrix",
    "automated scheduling system",
    "department timetable solver",
  ],
  authors: [{ name: "ATLAS Engineering Team" }],
  verification: {
    google: "-g570JiBMyW295Vj2vZBaC_0VumdQlx63AjrJPpJFK0",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "ATLAS Engine v4.4 — Automated Academic Timetable Generator",
    description: "Next-generation 2D constraint-driven university timetable engine powered by the proprietary ATLAS Algorithm. 100% Zero Conflict Guarantee.",
    siteName: "ATLAS Timetable System",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATLAS Engine v4.4",
    description: "Automated 2D university timetable generator powered by the ATLAS Algorithm.",
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} antialiased`}>
      <head>
        <meta name="google-site-verification" content="-g570JiBMyW295Vj2vZBaC_0VumdQlx63AjrJPpJFK0" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
