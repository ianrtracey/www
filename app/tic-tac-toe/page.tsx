import type { Metadata } from 'next'
import { TicTacToe } from '@/components/TicTacToe'

export const metadata: Metadata = {
  title: {
    absolute: 'tic tac toe vs Jev',
  },
  description: "Play tic-tac-toe against TypeSafe's Jev.",
  openGraph: {
    title: 'tic tac toe vs Jev',
    description: "Play tic-tac-toe against TypeSafe's Jev.",
    url: '/tic-tac-toe',
    siteName: 'Ian Tracey',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'tic tac toe vs Jev',
    description: "Play tic-tac-toe against TypeSafe's Jev.",
  },
}

export default function TicTacToePage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold">tic tac toe vs Jev</h1>
      <p className="mt-4 text-zinc-500 dark:text-zinc-400">
        First to three in a row wins.
      </p>
      <TicTacToe />
    </div>
  )
}
