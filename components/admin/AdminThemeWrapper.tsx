"use client";

import { useEffect } from "react";

export default function AdminThemeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove("dark");
    htmlElement.classList.add("light");

    return () => {
      htmlElement.classList.remove("light");
      htmlElement.classList.add("dark");
    };
  }, []);

  return <>{children}</>;
}
