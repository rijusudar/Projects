import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riju Sudar — UI / React / Angular / Ember / Node Architect",
  description:
    "Portfolio of Riju Sudar — Technical Architect and UI Lead Engineer with 14+ years of experience building AI-driven enterprise applications with React, Next.js, Angular, Ember and Node.js. Based in Trivandrum, Kerala, India.",
  keywords: [
    "Riju Sudar",
    "UI Architect",
    "React",
    "Next.js",
    "Angular",
    "Ember.js",
    "Node.js",
    "Technical Architect",
    "Frontend Architect",
    "Trivandrum",
  ],
  authors: [{ name: "Riju Sudar", url: "https://rijusudar-tech.github.io/" }],
  openGraph: {
    title: "Riju Sudar — UI / React / Angular / Ember / Node Architect",
    description:
      "14+ years architecting AI-driven enterprise UIs for Philips, ABB, EY, Expedia, Uniqlo and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
