import type { Metadata } from "next";
import clsx from "clsx";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import SiteFooter from "@/components/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bet2Star - Premium Betting Platform",
  description: "Experience premium betting with bet2star. Play lotto, pools, or bet on sports. Join thousands of winners today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={clsx(geistSans.variable, geistMono.variable, "antialiased")}>
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <Providers>
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </Providers>
        </div>
      </body>
    </html>
  );
}
