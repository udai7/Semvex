"use client";

import { usePathname } from "next/navigation";

// Auth-flow screens and the logged-in app/dashboard views render without the
// marketing footer.
const HIDE_ON = ["/signin", "/twofa", "/verify-email", "/search", "/account", "/admin"];

export default function FooterSlot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return hide ? null : <>{children}</>;
}
