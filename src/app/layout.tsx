import type { Metadata } from "next";
import { Crimson_Pro, IM_Fell_DW_Pica, IM_Fell_English_SC } from "next/font/google";
import Link from "next/link";
import { ShopsProvider } from "@/components/ShopsProvider";
import { StorageBanner } from "@/components/StorageBanner";
import "./globals.css";

const titleFont = IM_Fell_English_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-im-fell-sc",
});
const bodyFont = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson" });
const numbersFont = IM_Fell_DW_Pica({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-im-fell-pica",
});

export const metadata: Metadata = {
  title: "Lojinha de Itens Mágicos",
  description: "Gerador de lojas de itens mágicos para D&D 2024",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${titleFont.variable} ${bodyFont.variable} ${numbersFont.variable}`}
    >
      <body>
        <ShopsProvider>
          <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="title text-2xl sm:text-3xl">
              Lojinha de Itens Mágicos
            </Link>
            <Link
              href="/configuracoes"
              aria-label="Configurações"
              className="text-2xl text-ink-soft hover:text-blood"
            >
              ⚙
            </Link>
          </header>
          <div className="px-4">
            <StorageBanner />
          </div>
          <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
        </ShopsProvider>
      </body>
    </html>
  );
}
