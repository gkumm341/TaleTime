import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { PreferencesProvider } from "@/contexts/PreferencesContext"
import { PWAInstallPrompt, OfflineBanner } from "@/components/PWAComponents"
import { CacheManager } from "@/components/CacheManager"

export const metadata: Metadata = {
  title: "TaleTime - Find Your Perfect Story",
  description: "Discover captivating stories tailored to your available time. From quick 5-minute reads to longer adventures, find your perfect tale.",
  keywords: "stories, reading, short stories, fiction, tales, literature, PWA, offline reading",
  authors: [{ name: "TaleTime Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaleTime",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "TaleTime - Find Your Perfect Story",
    description: "Discover captivating stories tailored to your available time.",
    url: "https://taletime.app",
    siteName: "TaleTime",
    type: "website",
    images: [
      {
        url: "/screenshot-desktop.png",
        width: 1280,
        height: 720,
        alt: "TaleTime Desktop View"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TaleTime - Find Your Perfect Story",
    description: "Discover captivating stories tailored to your available time.",
  },
  icons: {
    icon: [
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icon-180x180.png", sizes: "180x180", type: "image/png" }
    ]
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TaleTime" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
      </head>
      <body className="antialiased">
        <PreferencesProvider>
          <ThemeProvider>
            <CacheManager />
            <OfflineBanner />
            {children}
            <PWAInstallPrompt />
          </ThemeProvider>
        </PreferencesProvider>
      </body>
    </html>
  )
}
