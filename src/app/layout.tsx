import type { Metadata, Viewport } from "next"
import { Baloo_2, Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"

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

  title: "TaleTime - Find Your Perfect Story",
  description:
    "Discover captivating stories tailored to your available time. From quick 5-minute reads to longer adventures, find your perfect tale.",
  keywords: "stories, reading, short stories, fiction, tales, literature, PWA, offline reading",
  authors: [{ name: "TaleTime Team" }],
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaleTime",
  },

  formatDetection: { telephone: false },

  openGraph: {
    title: "TaleTime - Find Your Perfect Story",
    description: "Discover captivating stories tailored to your available time.",
    // Make this relative so it automatically matches dev/prod base:
    url: "/",
    siteName: "TaleTime",
    type: "website",
    images: [
      {
        url: "/screenshot-desktop.png",
        width: 1280,
        height: 720,
        alt: "TaleTime Desktop View",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "TaleTime - Find Your Perfect Story",
    description: "Discover captivating stories tailored to your available time.",
    // Optional but recommended so Twitter has an explicit image too:
    images: ["/screenshot-desktop.png"],
  },

  icons: {
    icon: [
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${baloo.variable} ${inter.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaleTime" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
      </head>
      <body className="antialiased font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
