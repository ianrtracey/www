import { DM_Sans } from 'next/font/google'
import type { Metadata } from 'next'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'AI Poker Showdown',
  description: 'Watch AI models play Texas Hold\'em No-Limit poker against each other.',
}

export default function PokerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${dmSans.variable} min-h-screen bg-[#0C0F14] text-white`}>
      {children}
    </div>
  )
}
