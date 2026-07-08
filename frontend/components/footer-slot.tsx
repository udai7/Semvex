"use client";

import { usePathname } from "next/navigation";

// Auth-flow screens render without the marketing footer.
const HIDE_ON = ["/signin", "/twofa", "/verify-email"];

export default function FooterSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return hide ? null : <>{children}</>;
}
