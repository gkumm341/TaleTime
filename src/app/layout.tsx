import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "TaleTime",
  description: "Find your story, no matter how much time you have.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
