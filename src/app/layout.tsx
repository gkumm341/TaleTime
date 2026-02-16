import type { Metadata, Viewport } from "next"
import { Baloo_2, Inter } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/i18n/routing"

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : new URL("http://localhost:3000")

export const metadata: Metadata = {
  metadataBase: siteUrl,

  title: "TaleTime - Find Your Story",
  description:
    "Discover captivating stories tailored to your available time. From quick 5-minute reads to longer adventures, find your perfect tale.",
  keywords: "stories, reading, short stories, fiction, tales, literature, PWA, offline reading",
  authors: [{ name: "CloverTree Technologies" }],
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaleTime",
  },

  formatDetection: { telephone: false },

  openGraph: {
    title: "TaleTime - Find Your Story",
    description: "Discover captivating stories tailored to your available time.",
    // Make this relative so it automatically matches dev/prod base:
    url: "/",
    siteName: "TaleTime",
    type: "website",
    images: [
      {
        url: "/owlFace2.png",
        width: 1280,
        height: 720,
        alt: "TaleTime Desktop View",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "TaleTime - Find Your Story",
    description: "Discover captivating stories tailored to your available time.",
    // Optional but recommended so Twitter has an explicit image too:
    images: ["/screenshot-desktop.png"],
  },

  icons: {
    icon: [
      { url: "/owlFace2.png", sizes: "any", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/owlFace2.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const locale: Locale = normalizeLocale(headerList.get('x-locale')) ?? DEFAULT_LOCALE

  return (
    <html lang={locale} suppressHydrationWarning className={`${baloo.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/owlFace2.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/owlFace2.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/owlFace2.png" />
        <link rel="shortcut icon" href="/owlFace2.png" />
        <link rel="apple-touch-icon" href="/owlFace2.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaleTime" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
      </head>
      <body className="tt-page antialiased font-body">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  )
}
