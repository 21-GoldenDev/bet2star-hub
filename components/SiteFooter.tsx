"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import ContactUsSection from "@/components/ContactUsSection";

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="py-12 px-4 border-t border-border/50 mt-auto">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Image src="/logo2.png" alt="Logo" width={250} height={33} />
          </div>

          <ContactUsSection />

          <p className="text-muted-foreground text-sm text-center md:text-right">
            © 2025 bet2star. All rights reserved. Play responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
