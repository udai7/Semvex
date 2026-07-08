import { cn } from "@/lib/utils";

/**
 * Persistent vertical frame rails — fixed to the viewport, matching infisical.com.
 * One pair for the whole page; do not re-mount per section.
 */
export function FrameRails({ className }: { className?: string }) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-y-0 z-[35] w-px bg-v2-border frame-line-left",
          className
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-y-0 z-[35] w-px bg-v2-border frame-line-right",
          className
        )}
      />
    </>
  );
}

/** + at the intersection of a horizontal hairline and a vertical frame rail. */
export function FrameCorner({
  side,
  className,
}: {
  side: "left" | "right";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 z-[36] -translate-y-1/2 font-mono text-[11px] leading-none text-v2-border select-none",
        side === "left" ? "frame-line-left -translate-x-1/2" : "frame-line-right translate-x-1/2",
        className
      )}
    >
      +
    </span>
  );
}

/** Full-viewport-width horizontal divider. */
export function FrameHairline({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20 h-px bg-v2-border",
        position === "top" ? "top-0" : "bottom-0"
      )}
    />
  );
}

type FrameSectionProps = {
  children: React.ReactNode;
  className?: string;
  tinted?: boolean;
  hairline?: "top" | "bottom" | "both" | "none";
  id?: string;
};

export function FrameSection({
  children,
  className,
  tinted = false,
  hairline = "both",
  id,
}: FrameSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full",
        tinted ? "bg-v2-tint-strong" : "bg-v2-bg",
        className
      )}
    >
      {(hairline === "top" || hairline === "both") && (
        <>
          <FrameHairline position="top" />
          <FrameCorner side="left" />
          <FrameCorner side="right" />
        </>
      )}
      {(hairline === "bottom" || hairline === "both") && <FrameHairline position="bottom" />}
      {children}
    </section>
  );
}

/** Centered content column inside the frame. */
export function FrameContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative mx-auto w-full max-w-v2", className)}
      style={{ paddingLeft: "var(--v2-grid-padding)", paddingRight: "var(--v2-grid-padding)" }}
    >
      {children}
    </div>
  );
}

/** Infisical-style section eyebrow with green vertical bar. */
export function SectionEyebrow({
  children,
  className,
  align = "center",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-3",
        align === "center" ? "justify-center" : "justify-start",
        className
      )}
    >
      <span
        aria-hidden
        className="shrink-0 bg-v2-accent-green"
        style={{ width: "1.7px", height: "13.5px" }}
      />
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-v2-text-muted">
        {children}
      </span>
    </div>
  );
}

/** Yellow highlighter mark behind inline text (infisical.com hero). */
export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="box-decoration-clone bg-v2-volt px-1 py-0.5 text-v2-text">
      {children}
    </span>
  );
}
