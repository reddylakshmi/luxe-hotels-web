import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Luxe Hotels — Twelve cities, one philosophy",
  description:
          "Anchored in place, devoted to craft. Discover Luxe International — twelve flagship hotels across four continents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
          <html lang="en">
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
                    rel="stylesheet"
            />
          </head>
          <body>
          <Header />
          <main>{children}</main>
          <Footer />
          </body>
          </html>
  );
}
