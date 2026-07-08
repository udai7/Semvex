import Link from "next/link";
import { ComponentType, SVGProps } from "react";
import {
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { Highlight, SectionEyebrow } from "@/components/frame";

/* ------------------------------------------------------------------ */
/* Shared mock chrome                                                   */
/* ------------------------------------------------------------------ */

function MockWindow({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`v2-mock w-full max-w-lg overflow-hidden ${className}`}>
      <div className="v2-mock-bar">
        <span className="v2-mock-dot" />
        <span className="v2-mock-dot" />
        <span className="v2-mock-dot" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#808591]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product block — Infisical split layout (copy + mock)                 */
/* ------------------------------------------------------------------ */

export function ProductBlock({
  eyebrow,
  title,
  highlight,
  description,
  href,
  linkLabel,
  features,
  mock,
  flip = false,
  tone = "graphite",
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  href: string;
  linkLabel: string;
  features: { label: string; body: string }[];
  mock: React.ReactNode;
  flip?: boolean;
  tone?: "lime" | "amber" | "graphite";
}) {
  return (
    <div className={`v2-product-split ${flip ? "v2-product-split--flip" : ""}`}>
      <div className="v2-product-copy flex flex-col justify-center">
        <SectionEyebrow align="left">{eyebrow}</SectionEyebrow>
        <h3 className="text-balance text-2xl font-medium leading-tight tracking-tight md:text-[1.75rem]">
          {highlight ? (
            <>
              {title.split(highlight)[0]}
              <Highlight>{highlight}</Highlight>
              {title.split(highlight)[1]}
            </>
          ) : (
            title
          )}
        </h3>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
          {description}
        </p>
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-v2-accent-green hover:underline"
        >
          <ChevronRight className="size-4" />
          {linkLabel}
        </Link>
        <ul className="mt-8 space-y-5 border-t border-v2-border pt-8">
          {features.map((f) => (
            <li key={f.label}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-v2-text-muted">
                {f.label}
              </p>
              <p className="mt-1 text-sm text-v2-text-subtle" style={{ opacity: 0.72 }}>
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className={`v2-product-mock v2-product-mock--${tone}`}>{mock}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Individual mocks                                                     */
/* ------------------------------------------------------------------ */

export function KeywordSearchMock() {
  const rows = [
    { rank: 1, title: "Gamer Pro 17 Laptop", score: "8.42", brand: "Acer" },
    { rank: 2, title: "Gaming Mousepad XL", score: "6.14", brand: "Razer" },
    { rank: 3, title: "Laptop Sleeve 15\"", score: "4.91", brand: "Amazon" },
    { rank: 4, title: "USB-C Gaming Hub", score: "4.22", brand: "Anker" },
  ];
  return (
    <MockWindow title="elasticsearch · bm25">
      <div className="border-b border-[#dbdee5] px-3 py-2 font-mono text-[11px] text-[#808591]">
        q = &quot;cheap gaming laptop&quot;
      </div>
      {rows.map((r) => (
        <div key={r.rank} className="v2-mock-row">
          <span className="truncate">
            <span className="mr-2 font-mono text-[#999ea8]">{r.rank}</span>
            {r.title}
          </span>
          <span className="shrink-0 font-mono tabular-nums text-[#808591]">{r.score}</span>
        </div>
      ))}
      <div className="border-t border-[#dbdee5] bg-[#f5f7fa] px-3 py-2 font-mono text-[10px] text-[#999ea8]">
        tsvector fallback when ES unavailable
      </div>
    </MockWindow>
  );
}

export function SemanticSearchMock() {
  const rows = [
    { title: "Budget Chromebook 14", sim: 0.81 },
    { title: "Gamer Pro 17 Laptop", sim: 0.78 },
    { title: "ValueBook 14", sim: 0.74 },
    { title: "Student Laptop 15", sim: 0.71 },
  ];
  return (
    <MockWindow title="pgvector · cosine">
      <div className="flex items-center justify-between border-b border-[#dbdee5] px-3 py-2">
        <span className="font-mono text-[10px] text-[#808591]">bge-small · 384-d</span>
        <span className="v2-mock-tag">kNN</span>
      </div>
      {rows.map((r) => (
        <div key={r.title} className="v2-mock-row flex-col !items-stretch gap-1.5 !py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px]">{r.title}</span>
            <span className="font-mono text-[10px] tabular-nums text-[#808591]">
              {r.sim.toFixed(2)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#eef0f4]">
            <div
              className="h-full bg-v2-volt"
              style={{ width: `${r.sim * 100}%` }}
            />
          </div>
        </div>
      ))}
    </MockWindow>
  );
}

export function HybridSearchMock() {
  return (
    <MockWindow title="hybrid · rrf fusion">
      <div className="space-y-3 border-b border-[#dbdee5] p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#808591]">α blend</span>
          <span className="font-mono font-semibold">0.55</span>
        </div>
        <div className="relative h-2 bg-[#eef0f4]">
          <div className="absolute inset-y-0 left-0 w-[55%] bg-v2-volt" />
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 border border-[#14171f] bg-white"
            style={{ left: "55%" }}
          />
        </div>
        <div className="flex justify-between font-mono text-[9px] uppercase text-[#999ea8]">
          <span>keyword</span>
          <span>semantic</span>
        </div>
      </div>
      {([
        ["Gamer Pro 17", ".92", true],
        ["Budget Chromebook", ".88", false],
        ["ValueBook 14", ".79", false],
      ] as const).map(([title, score, win]) => (
        <div key={title} className="v2-mock-row">
          <span className="truncate">{title}</span>
          <span className="flex items-center gap-2">
            {win && <span className="v2-mock-tag v2-mock-tag--win">best</span>}
            <span className="font-mono tabular-nums text-[#808591]">{score}</span>
          </span>
        </div>
      ))}
    </MockWindow>
  );
}

export function SearchAppMock() {
  return (
    <MockWindow title="semvex · /search" className="max-w-xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#dbdee5] p-3">
        <div className="flex-1 border border-[#dbdee5] bg-white px-3 py-2 text-[12px]">
          sports sneakers under 80
        </div>
        <span className="v2-mock-tag">hybrid</span>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-[#dbdee5] bg-[#f5f7fa] p-2">
        {["keyword", "semantic", "hybrid", "rerank", "compare"].map((m, i) => (
          <span
            key={m}
            className={`px-2 py-1 font-mono text-[9px] uppercase ${
              i === 2
                ? "border border-[#14171f] bg-[#14171f] text-white"
                : "border border-[#dbdee5] bg-white text-[#808591]"
            }`}
          >
            {m}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#dbdee5] border-b border-[#dbdee5] text-center">
        {([
          ["NDCG@5", ".71", false],
          ["Recall@10", ".84", false],
          ["MRR", ".79", true],
        ] as const).map(([k, v, win]) => (
          <div key={k} className="p-2">
            <div className="font-mono text-[9px] uppercase text-[#999ea8]">{k}</div>
            <div className={`font-mono text-sm font-semibold ${win ? "text-[#0f7a47]" : ""}`}>
              {v}
              {win && " ★"}
            </div>
          </div>
        ))}
      </div>
      {[
        "Nike Air Zoom Pegasus 40",
        "Adidas Ultraboost Light",
        "Brooks Ghost 15",
      ].map((t, i) => (
        <div key={t} className="v2-mock-row">
          <span>
            <span className="mr-2 font-mono text-[#999ea8]">{i + 1}</span>
            {t}
          </span>
          <span className="font-mono text-[10px] text-[#0f7a47]">$74</span>
        </div>
      ))}
    </MockWindow>
  );
}

export function AdminDashboardMock() {
  return (
    <MockWindow title="semvex · /admin" className="max-w-xl">
      <div className="grid grid-cols-3 divide-x divide-[#dbdee5] border-b border-[#dbdee5]">
        {[
          ["1,284", "queries"],
          ["312", "clicks"],
          ["68%", "hybrid wins"],
        ].map(([n, l]) => (
          <div key={l} className="p-3 text-center">
            <div className="font-mono text-lg font-semibold">{n}</div>
            <div className="font-mono text-[9px] uppercase text-[#999ea8]">{l}</div>
          </div>
        ))}
      </div>
      <div className="border-b border-[#dbdee5] px-3 py-2 font-mono text-[10px] uppercase text-[#808591]">
        top queries · 24h
      </div>
      {[
        ["running shoes", "hybrid", "41"],
        ["cheap laptop", "semantic", "28"],
        ["wireless earbuds", "keyword", "19"],
      ].map(([q, mode, n]) => (
        <div key={q} className="v2-mock-row">
          <span className="truncate font-mono text-[11px]">{q}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="v2-mock-tag">{mode}</span>
            <span className="font-mono text-[#808591]">{n}</span>
          </span>
        </div>
      ))}
    </MockWindow>
  );
}

export function IngestPipelineMock() {
  const steps = [
    { n: "01", label: "ESCI parquet stream", sub: "pyarrow batches" },
    { n: "02", label: "bge-small embed", sub: "384-d vectors" },
    { n: "03", label: "pgvector upsert", sub: "HNSW index" },
    { n: "04", label: "ES bulk index", sub: "BM25 mirror" },
  ];
  return (
    <div className="v2-mock w-full max-w-md">
      <div className="v2-mock-bar">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#808591]">
          ingest pipeline
        </span>
      </div>
      {steps.map((s, i) => (
        <div
          key={s.n}
          className="flex items-start gap-3 border-b border-[#dbdee5] p-3 last:border-b-0"
        >
          <span className="font-mono text-xs text-[#999ea8]">{s.n}</span>
          <div className="flex-1">
            <div className="text-[12px] font-medium">{s.label}</div>
            <div className="font-mono text-[10px] text-[#808591]">{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <span className="font-mono text-[#999ea8]">↓</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stack + social proof                                                 */
/* ------------------------------------------------------------------ */

/* Custom Stack Icons representing the actual brand logos */
function PostgresIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3411-2.2935.1312-2.5256-.0191 1.342-2.0482 2.445-4.522 3.0411-6.8297.2714-1.0507.7982-3.5237.1222-4.7316a1.5641 1.5641 0 0 0-.1509-.235C21.6931.9086 19.8007.0248 17.5099.0005c-1.4947-.0158-2.7705.3461-3.1161.4794a9.449 9.449 0 0 0-.5159-.0816 8.044 8.044 0 0 0-1.3114-.1278c-1.1822-.0184-2.2038.2642-3.0498.8406-.8573-.3211-4.7888-1.645-7.2219.0788C.9359 2.1526.3086 3.8733.4302 6.3043c.0409.818.5069 3.334 1.2423 5.7436.4598 1.5065.9387 2.7019 1.4334 3.582.553.9942 1.1259 1.5933 1.7143 1.7895.4474.1491 1.1327.1441 1.8581-.7279.8012-.9635 1.5903-1.8258 1.9446-2.2069.4351.2355.9064.3625 1.39.3772a.0569.0569 0 0 0 .0004.0041 11.0312 11.0312 0 0 0-.2472.3054c-.3389.4302-.4094.5197-1.5002.7443-.3102.064-1.1344.2339-1.1464.8115-.0025.1224.0329.2309.0919.3268.2269.4231.9216.6097 1.015.6331 1.3345.3335 2.5044.092 3.3714-.6787-.017 2.231.0775 4.4174.3454 5.0874.2212.5529.7618 1.9045 2.4692 1.9043.2505 0 .5263-.0291.8296-.0941 1.7819-.3821 2.5557-1.1696 2.855-2.9059.1503-.8707.4016-2.8753.5388-4.1012.0169-.0703.0357-.1207.057-.1362.0007-.0005.0697-.0471.4272.0307a.3673.3673 0 0 0 .0443.0068l.2539.0223.0149.001c.8468.0384 1.9114-.1426 2.5312-.4308.6438-.2988 1.8057-1.0323 1.5951-1.6698zM2.371 11.8765c-.7435-2.4358-1.1779-4.8851-1.2123-5.5719-.1086-2.1714.4171-3.6829 1.5623-4.4927 1.8367-1.2986 4.8398-.5408 6.108-.13-.0032.0032-.0066.0061-.0098.0094-2.0238 2.044-1.9758 5.536-1.9708 5.7495-.0002.0823.0066.1989.0162.3593.0348.5873.0996 1.6804-.0735 2.9184-.1609 1.1504.1937 2.2764.9728 3.0892.0806.0841.1648.1631.2518.2374-.3468.3714-1.1004 1.1926-1.9025 2.1576-.5677.6825-.9597.5517-1.0886.5087-.3919-.1307-.813-.5871-1.2381-1.3223-.4796-.839-.9635-2.0317-1.4155-3.5126zm6.0072 5.0871c-.1711-.0428-.3271-.1132-.4322-.1772.0889-.0394.2374-.0902.4833-.1409 1.2833-.2641 1.4815-.4506 1.9143-1.0002.0992-.126.2116-.2687.3673-.4426a.3549.3549 0 0 0 .0737-.1298c.1708-.1513.2724-.1099.4369-.0417.156.0646.3078.26.3695.4752.0291.1016.0619.2945-.0452.4444-.9043 1.2658-2.2216 1.2494-3.1676 1.0128zm2.094-3.988-.0525.141c-.133.3566-.2567.6881-.3334 1.003-.6674-.0021-1.3168-.2872-1.8105-.8024-.6279-.6551-.9131-1.5664-.7825-2.5004.1828-1.3079.1153-2.4468.079-3.0586-.005-.0857-.0095-.1607-.0122-.2199.2957-.2621 1.6659-.9962 2.6429-.7724.4459.1022.7176.4057.8305.928.5846 2.7038.0774 3.8307-.3302 4.7363-.084.1866-.1633.3629-.2311.5454zm7.3637 4.5725c-.0169.1768-.0358.376-.0618.5959l-.146.4383a.3547.3547 0 0 0-.0182.1077c-.0059.4747-.054.6489-.115.8693-.0634.2292-.1353.4891-.1794 1.0575-.11 1.4143-.8782 2.2267-2.4172 2.5565-1.5155.3251-1.7843-.4968-2.0212-1.2217a6.5824 6.5824 0 0 0-.0769-.2266c-.2154-.5858-.1911-1.4119-.1574-2.5551.0165-.5612-.0249-1.9013-.3302-2.6462.0044-.2932.0106-.5909.019-.8918a.3529.3529 0 0 0-.0153-.1126 1.4927 1.4927 0 0 0-.0439-.208c-.1226-.4283-.4213-.7866-.7797-.9351-.1424-.059-.4038-.1672-.7178-.0869.067-.276.1831-.5875.309-.9249l.0529-.142c.0529-.142.1058-.284.1587-.426.0595-.16.134-.3257.213-.5012.4265-.9476 1.0106-2.2453.3766-5.1772-.2374-1.0981-1.0304-1.6343-2.2324-1.5098-.7207.0746-1.3799.3654-1.7088.5321a5.6716 5.6716 0 0 0-.1958.1041c.0918-1.1064.4386-3.1741 1.7357-4.4823a4.0306 4.0306 0 0 1 .3033-.276.3532.3532 0 0 0 .1447-.0644c.7524-.5706 1.6945-.8506 2.802-.8325.4091.0067.8017.0339 1.1742.081 1.939.3544 3.2439 1.4468 4.0359 2.3827.8143.9623 1.2552 1.9315 1.4312 2.4543-1.3232-.1346-2.2234.1268-2.6797.779-.9926 1.4189.543 4.1729 1.2811 5.4964.1353.2426.2522.4522.2889.5413.2403.5825.5515.9713.7787 1.2552.0696.087.1372.1714.1885.245-.4008.1155-1.1208.3825-1.0552 1.717-.0123.1563-.0423.4469-.0834.8148-.0461.2077-.0702.4603-.0994.7662zm.8905-1.6211c-.0405-.8316.2691-.9185.5967-1.0105a2.8566 2.8566 0 0 0 .135-.0406 1.202 1.202 0 0 0 .1342.103c.5703.3765 1.5823.4213 3.0068.1344-.2016.1769-.5189.3994-.9533.6011-.4098.1903-1.0957.333-1.7473.3636-.7197.0336-1.0859-.0807-1.1721-.151zm.5695-9.2712c-.0059.3508-.0542.6692-.1054 1.0017-.055.3576-.112.7274-.1264 1.1762-.0142.4368.0404.8909.0932 1.3301.1066.887.216 1.8003-.2075 2.7014a3.5272 3.5272 0 0 1-.1876-.3856c-.0527-.1276-.1669-.3326-.3251-.6162-.6156-1.1041-2.0574-3.6896-1.3193-4.7446.3795-.5427 1.3408-.5661 2.1781-.463zm.2284 7.0137a12.3762 12.3762 0 0 0-.0853-.1074l-.0355-.0444c.7262-1.1995.5842-2.3862.4578-3.4385-.0519-.4318-.1009-.8396-.0885-1.2226.0129-.4061.0666-.7543.1185-1.0911.0639-.415.1288-.8443.1109-1.3505.0134-.0531.0188-.1158.0118-.1902-.0457-.4855-.5999-1.938-1.7294-3.253-.6076-.7073-1.4896-1.4972-2.6889-2.0395.5251-.1066 1.2328-.2035 2.0244-.1859 2.0515.0456 3.6746.8135 4.8242 2.2824a.908.908 0 0 1 .0667.1002c.7231 1.3556-.2762 6.2751-2.9867 10.5405zm-8.8166-6.1162c-.025.1794-.3089.4225-.6211.4225a.5821.5821 0 0 1-.0809-.0056c-.1873-.026-.3765-.144-.5059-.3156-.0458-.0605-.1203-.178-.1055-.2844.0055-.0401.0261-.0985.0925-.1488.1182-.0894.3518-.1226.6096-.0867.3163.0441.6426.1938.6113.4186zm7.9305-.4114c.0111.0792-.049.201-.1531.3102-.0683.0717-.212.1961-.4079.2232a.5456.5456 0 0 1-.075.0052c-.2935 0-.5414-.2344-.5607-.3717-.024-.1765.2641-.3106.5611-.352.297-.0414.6111.0088.6356.1851z"/></svg>
  );
}

function PgvectorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M12 2.2L3.5 7v10l8.5 4.8 8.5-4.8V7L12 2.2z M19.5 8.2v7.6l-6.5 3.7V12L19.5 8.2z M11 19.5l-6.5-3.7V8.2L11 12v7.5z M12 10.6L5.5 6.9 12 3.2l6.5 3.7-6.5 3.7z" />
    </svg>
  );
}

function ElasticsearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M13.394 0C8.683 0 4.609 2.716 2.644 6.667h15.641a4.77 4.77 0 0 0 3.073-1.11c.446-.375.864-.785 1.247-1.243l.001-.002A11.974 11.974 0 0 0 13.394 0zM1.804 8.889a12.009 12.009 0 0 0 0 6.222h14.7a3.111 3.111 0 1 0 0-6.222zm.84 8.444C4.61 21.283 8.684 24 13.395 24c3.701 0 7.011-1.677 9.212-4.312l-.001-.002a9.958 9.958 0 0 0-1.247-1.243 4.77 4.77 0 0 0-3.073-1.11z"/>
    </svg>
  );
}

function HuggingFaceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454m.836 10.354c.824-1.19.766-2.082-.365-3.194-1.13-1.112-1.789-2.738-1.789-2.738s-.246-.945-.806-.858-.97 1.499.202 2.362c1.173.864-.233 1.45-.685.64-.45-.812-1.683-2.896-2.322-3.295s-1.089-.175-.938.647 2.822 2.813 2.562 3.244-1.176-.506-1.176-.506-2.866-2.567-3.49-1.898.473 1.23 2.037 2.16c1.564.932 1.686 1.178 1.464 1.53s-3.675-2.511-4-1.297c-.323 1.214 3.524 1.567 3.287 2.405-.238.839-2.71-1.587-3.216-.642-.506.946 3.49 2.056 3.522 2.064 1.29.33 4.568 1.028 5.713-.624m5.349 0c-.824-1.19-.766-2.082.365-3.194 1.13-1.112 1.789-2.738 1.789-2.738s.246-.945.806-.858.97 1.499-.202 2.362c-1.173.864.233 1.45.685.64.451-.812 1.683-2.896 2.322-3.295s1.089-.175.938.647-2.822 2.813-2.562 3.244 1.176-.506 1.176-.506 2.866-2.567 3.49-1.898-.473 1.23-2.037 2.16c-1.564.932-1.686 1.178-1.464 1.53s3.675-2.511 4-1.297c.323 1.214-3.524 1.567-3.287 2.405.238.839 2.71-1.587 3.216-.642.506.946-3.49 2.056-3.522 2.064-1.29.33-4.568 1.028-5.713-.624"/>
    </svg>
  );
}

function DockerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/>
    </svg>
  );
}

function NextjsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z"/>
    </svg>
  );
}

function FastApiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M12 .0387C5.3729.0384.0003 5.3931 0 11.9988c-.001 6.6066 5.372 11.9628 12 11.9625 6.628.0003 12.001-5.3559 12-11.9625-.0003-6.6057-5.3729-11.9604-12-11.96m-.829 5.4153h7.55l-7.5805 5.3284h5.1828L5.279 18.5436q2.9466-6.5444 5.892-13.0896"/>
    </svg>
  );
}

function NeonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" {...props}>
      <path d="M24 0V24l-9.365-8.045V24H0V0ZM2.942 21.087h8.751V9.563l9.365 8.204V2.919L2.942 2.914Z"/>
    </svg>
  );
}

/** Brand-colored icon tiles (null = dotted placeholder) — Infisical integrations grid. */
const STACK_TILES: ({ icon: ComponentType<any>; name: string; bg: string; fg: string } | null)[] = [
  null,
  { icon: PostgresIcon, name: "Postgres", bg: "#336791", fg: "#ffffff" },
  { icon: PgvectorIcon, name: "pgvector", bg: "#1e40af", fg: "#ffffff" },
  null,
  { icon: ElasticsearchIcon, name: "Elasticsearch", bg: "#f5c518", fg: "#ffffff" },
  { icon: HuggingFaceIcon, name: "HuggingFace", bg: "#ffd21e", fg: "#ffffff" },
  { icon: DockerIcon, name: "Docker", bg: "#2496ed", fg: "#ffffff" },
  { icon: NextjsIcon, name: "Next.js", bg: "#111111", fg: "#ffffff" },
  null,
  { icon: FastApiIcon, name: "FastAPI", bg: "#059669", fg: "#ffffff" },
  { icon: NeonIcon, name: "Neon", bg: "#00e599", fg: "#05231a" },
  null,
];

export function StackShowcase() {
  return (
    <div className="grid items-stretch gap-0 lg:grid-cols-[0.6fr_0.4fr]">
      <div className="v2-integrations-panel flex items-center justify-center border border-v2-border p-6 md:p-10">
        <div className="v2-tile-grid">
          {STACK_TILES.map((t, i) =>
            t ? (
              <div
                key={i}
                className="v2-tile shadow-[0_10px_20px_-12px_rgba(0,0,0,0.45)]"
                style={{ background: t.bg, color: t.fg }}
                title={t.name}
                aria-label={t.name}
              >
                <t.icon strokeWidth={1.75} />
              </div>
            ) : (
              <div key={i} className="v2-tile v2-int-placeholder" />
            )
          )}
        </div>
      </div>

      <div className="flex flex-col justify-center border-x border-b border-v2-border p-6 md:p-10 lg:border-l-0 lg:border-b-0 lg:border-r lg:border-y">
        <h2 className="text-balance text-display font-medium leading-tight">
          We support <Highlight>your stack</Highlight>.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.72 }}>
          Postgres + pgvector for vectors, Elasticsearch for BM25, and HuggingFace for
          query embeddings — env-driven and fully Dockerized.
        </p>
        <Link
          href="/#features"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-v2-accent-green hover:underline"
        >
          <ChevronRight className="size-4" />
          Explore the engine
        </Link>
      </div>
    </div>
  );
}

const QUOTES = [
  {
    name: "Sarah Chen",
    handle: "Staff Search Engineer at KubeShop",
    body: "We saw a 34% lift in NDCG@5 during offline evaluation on our electronics set. The live telemetry overlay made comparing query paths incredibly clear.",
    mark: "34% lift",
    href: "/#metrics",
  },
  {
    name: "Alex Rivera",
    handle: "Senior Frontend Engineer at Velo",
    body: "Semantic retrieval finally surfaced the budget Chromebook for 'affordable notebook' queries where keyword search failed. The side-by-side comparison won over our PM.",
    mark: "budget Chromebook",
    href: "/signin",
  },
  {
    name: "Marcus Brody",
    handle: "VP of Engineering at Cartly",
    body: "pgvector with bge-small embeddings has been rock solid. Sub-millisecond HNSW index lookups handle our catalog queries without breaking a sweat.",
    mark: "Sub-millisecond",
    href: "/#features",
  },
  {
    name: "Elena Rostova",
    handle: "Principal Architect at Shopflow",
    body: "RRF fusion with a tunable alpha let us balance lexical precision and vector semantic matching. Being able to tune it live in production is a game changer.",
    mark: "tunable alpha",
    href: "/#features",
  },
  {
    name: "Dave Miller",
    handle: "Tech Lead at SearchOps",
    body: "Integrating Elasticsearch as our BM25 baseline with a fallback to Postgres full-text worked right out of the box. Zero friction deploying in Docker.",
    mark: "Zero friction",
    href: "/#products",
  },
  {
    name: "Sanjay Patel",
    handle: "CTO at TrendMarket",
    body: "Our telemetry shows 68% of search conversion click-throughs now choose the hybrid path over keyword. The click log data completely justifies the hybrid stack.",
    mark: "68% of search conversion",
    href: "/admin",
  },
];

function markGreen(body: string, mark: string) {
  const parts = body.split(mark);
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <span key={i} className="font-medium text-v2-accent-green">
            {mark}
          </span>,
          part,
        ]
  );
}

export function QuoteGrid() {
  const row1 = [...QUOTES.slice(0, 3), ...QUOTES.slice(0, 3)];
  const row2 = [...QUOTES.slice(3, 6), ...QUOTES.slice(3, 6)];

  return (
    <div className="v2-marquee-container">
      {/* Top Row: Scrolls Left */}
      <div className="v2-marquee-row">
        <div className="v2-marquee-content-left">
          {row1.map((q, idx) => (
            <div
              key={`row1-${idx}`}
              className="v2-cell flex w-[min(400px,85vw)] shrink-0 flex-col gap-4 border-r border-b border-v2-border bg-v2-bg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center border border-v2-border bg-v2-tint-strong font-mono text-xs font-semibold text-v2-text-muted">
                    {q.name[0]}
                  </span>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-v2-text">{q.name}</div>
                    <div className="font-mono text-[11px] text-v2-text-muted">{q.handle}</div>
                  </div>
                </div>
                <Link
                  href={q.href}
                  aria-label={`Explore ${q.name}`}
                  className="text-v2-accent-green transition-opacity hover:opacity-70"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <p className="text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.85 }}>
                {markGreen(q.body, q.mark)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Scrolls Right */}
      <div className="v2-marquee-row">
        <div className="v2-marquee-content-right">
          {row2.map((q, idx) => (
            <div
              key={`row2-${idx}`}
              className="v2-cell flex w-[min(400px,85vw)] shrink-0 flex-col gap-4 border-r border-v2-border bg-v2-bg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center border border-v2-border bg-v2-tint-strong font-mono text-xs font-semibold text-v2-text-muted">
                    {q.name[0]}
                  </span>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-v2-text">{q.name}</div>
                    <div className="font-mono text-[11px] text-v2-text-muted">{q.handle}</div>
                  </div>
                </div>
                <Link
                  href={q.href}
                  aria-label={`Explore ${q.name}`}
                  className="text-v2-accent-green transition-opacity hover:opacity-70"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <p className="text-sm leading-relaxed text-v2-text-subtle" style={{ opacity: 0.85 }}>
                {markGreen(q.body, q.mark)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

