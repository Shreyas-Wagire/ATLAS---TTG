import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-editorial",
});

export const metadata: Metadata = {
  title: "ATLAS Engine v6.7 — Automated Academic Timetable Generator",
  description: "College-wide academic timetable generation with coordinated department, faculty, and resource scheduling.",
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
    title: "ATLAS Engine v6.7 — Automated Academic Timetable Generator",
    description: "College-wide academic timetable generation with coordinated department, faculty, and resource scheduling.",
    siteName: "ATLAS Timetable System",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATLAS Engine v6.7",
    description: "College-wide academic timetable generation with coordinated department, faculty, and resource scheduling.",
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolageGrotesque.variable} antialiased`} suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="-g570JiBMyW295Vj2vZBaC_0VumdQlx63AjrJPpJFK0" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
