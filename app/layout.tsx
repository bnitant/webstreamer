import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WebStreamer — Screen Share, Video & Chat',
  description:
    'Screen share, video call, voice call and chat — all in one place. Fast, beautiful, and free.',
  keywords: ['screen share', 'video call', 'voice call', 'chat', 'WebRTC'],
  openGraph: {
    title: 'WebStreamer',
    description: 'Screen share, video call, voice call and chat — all in one place.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body bg-dark-900 text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
