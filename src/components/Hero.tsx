import { SearchBar } from "./SearchBar";

export function Hero() {
  return (
          <section
                  className="relative h-[78vh] min-h-[560px] w-full text-cream overflow-hidden"
          >
            <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage:
                              "url('https://picsum.photos/seed/luxe-hero-paris/1920/1080')",
                    }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/10 via-ink/40 to-ink/70" />
            <div className="container-x relative h-full flex flex-col justify-end pb-24">
              <div className="fade-rise max-w-3xl">
                <div className="eyebrow text-cream/80 mb-4">Spring 2026 collection</div>
                <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-5">
                  Where quiet meets craft.
                </h1>
                <p className="text-lg md:text-xl text-cream/85 max-w-xl mb-10 leading-relaxed">
                  Twelve flagship hotels across Paris, London, Tokyo, Dubai, and New
                  York — anchored in place, devoted to craft.
                </p>
              </div>
              <div className="fade-rise" style={{ animationDelay: "120ms" }}>
                <SearchBar />
              </div>
            </div>
          </section>
  );
}
