import './globals.css'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Ian Tracey',
    template: '%s | Ian Tracey',
  },
  description: 'Working on Applied AI at Ramp in NYC. I write and invest sometimes.',
  metadataBase: new URL('https://ian.so'),
  openGraph: {
    title: 'Ian Tracey',
    description: 'Working on Applied AI at Ramp in NYC. I write and invest sometimes.',
    url: 'https://ian.so',
    siteName: 'Ian Tracey',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ian Tracey',
    description: 'Working on Applied AI at Ramp in NYC. I write and invest sometimes.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('theme');
                if (stored !== 'light') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
