// A typographic "logo" stand-in. The GraphQL data points to placeholder
// SVG URLs that don't actually serve files, so we render a brand mark from
// the brand's accent color + initials. Drop in real SVG logos by switching
// this component to a plain <img src={brand.logoUrl} />.

import type { Brand } from "@/types/graphql";

export function BrandLogo({ brand, size = "md" }: { brand: Brand; size?: "sm" | "md" | "lg" }) {
  const accent = brand.accentColor ?? "#1a1a1a";
  const initials = brand.code ?? brand.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  const dimensions = {
    sm: { box: 56, mark: 18, name: "text-[10px]" },
    md: { box: 92, mark: 26, name: "text-xs" },
    lg: { box: 140, mark: 38, name: "text-sm" },
  }[size];
  return (
          <div
                  className="flex flex-col items-center justify-center bg-white border border-ink/10"
                  style={{ width: dimensions.box, height: dimensions.box }}
          >
            <div
                    className="font-serif tracking-[0.18em]"
                    style={{ color: accent, fontSize: dimensions.mark, lineHeight: 1 }}
            >
              {initials}
            </div>
          </div>
  );
}
