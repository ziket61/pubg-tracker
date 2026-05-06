import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { hasLocale, routing } from "@/lib/i18n/routing";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PUBG Tracker — статистика игроков",
  description:
    "Статистика игроков PUBG: BATTLEGROUNDS, история матчей, лидерборды и мастерство оружия. Без рекламы, без регистрации.",
  icons: {
    icon: "/favicon.svg",
  },
};

function detectLocale(pathname: string | null, cookieLocale: string | null): string {
  if (pathname) {
    const seg = pathname.split("/")[1];
    if (hasLocale(routing.locales, seg)) return seg;
  }
  if (hasLocale(routing.locales, cookieLocale)) return cookieLocale;
  return routing.defaultLocale;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hdrs, cookieStore] = await Promise.all([headers(), cookies()]);
  const lang = detectLocale(
    hdrs.get("x-pathname"),
    cookieStore.get("NEXT_LOCALE")?.value ?? null,
  );

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${jetbrains.variable} ${spaceGrotesk.variable}`}
    >
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
