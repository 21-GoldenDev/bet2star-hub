import type { Metadata } from "next";
import clsx from "clsx";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

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
    <html lang="en">
      <head>
        <script src="https://js.paystack.co/v1/inline.js" async></script>
      </head>
      <body className={clsx(geistSans.variable, geistMono.variable, "antialiased")}>
        <div className="dark min-h-screen bg-background">
          <Navbar />
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
