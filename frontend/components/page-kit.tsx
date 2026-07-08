import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  FrameContainer,
  FrameSection,
  Highlight,
  SectionEyebrow,
} from "@/components/frame";
import { Button } from "@/components/ui/button";

function withHighlight(title: string, highlight?: string) {
  if (!highlight || !title.includes(highlight)) return title;
  const [pre, post] = title.split(highlight);
  return (
    <>
      {pre}
      <Highlight>{highlight}</Highlight>
      {post}
    </>
  );
}

/** Shared page header — matches the landing hero rhythm. */
export function PageHero({
  eyebrow,
  title,
  highlight,
  sub,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  sub?: string;
}) {
  return (
    <FrameSection hairline="bottom">
      <FrameContainer className="pb-14 pt-16 md:pb-20 md:pt-24">
        <SectionEyebrow align="left">{eyebrow}</SectionEyebrow>
        <h1 className="max-w-3xl text-display-lg font-medium leading-[1.05] tracking-tight">
          {withHighlight(title, highlight)}
        </h1>
        {sub && (
          <p
            className="mt-6 max-w-xl text-base leading-relaxed text-v2-text-subtle md:text-lg"
            style={{ opacity: 0.72 }}
          >
            {sub}
          </p>
        )}
      </FrameContainer>
    </FrameSection>
  );
}

/** Shared closing CTA on the lime grain band. */
export function CtaBand({
  title = "Starting with Semvex is simple, fast, and free.",
  sub = "Spin up an account, run a query, and watch hybrid ranking beat keyword — live.",
}: {
  title?: string;
  sub?: string;
}) {
  return (
    <FrameSection hairline="top" className="v2-cta-band">
      <FrameContainer className="py-16 text-center md:py-20">
        <h2 className="text-balance mx-auto max-w-xl text-display font-medium text-v2-text">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-v2-text-subtle" style={{ opacity: 0.72 }}>
          {sub}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signin">
            <Button size="lg">
              Try the demo <ArrowRight />
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </FrameContainer>
    </FrameSection>
  );
}

/** Section heading used inside content pages. */
export function PageSectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <SectionEyebrow align={align}>{eyebrow}</SectionEyebrow>
      <h2 className="text-balance text-display font-medium leading-tight">{title}</h2>
      {sub && (
        <p
          className="mt-4 max-w-xl text-sm leading-relaxed text-v2-text-subtle"
          style={{ opacity: 0.72 }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
