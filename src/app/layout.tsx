import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { SessionProvider } from "next-auth/react"
import { QueryProvider } from "@/components/providers/query-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "FocusTrack - Build, Learn, Ship",
  description: "A productivity web app for students/programmers with 3 focus tracks: CP, Academic, Vibe Coding & Prompting",
  manifest: "/manifest.json",
  keywords: ["productivity", "competitive programming", "academic", "vibe coding", "prompt engineering"],
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-background`}>
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
              {children}
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
