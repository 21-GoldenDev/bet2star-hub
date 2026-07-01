"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";

type ContactSettings = {
  email: string;
  phone: string;
};

export default function ContactUsSection() {
  const [contact, setContact] = useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContact = async () => {
      try {
        const response = await fetch("/api/settings/contact");
        const result = await response.json();
        if (response.ok) {
          setContact({
            email: result.email || "",
            phone: result.phone || "",
          });
        }
      } catch (error) {
        console.error("Failed to load contact settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContact();
  }, []);

  if (loading) {
    return null;
  }

  if (!contact?.email && !contact?.phone) {
    return null;
  }

  return (
    <div className="text-center md:text-left">
      <h3 className="text-sm font-semibold text-foreground mb-3">Contact Us</h3>
      <div className="space-y-2">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/\s+/g, "")}`}
            className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>{contact.phone}</span>
          </a>
        )}
      </div>
    </div>
  );
}
