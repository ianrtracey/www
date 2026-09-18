import type { Metadata } from 'next'
import { TicTacToe } from '@/components/TicTacToe'

export const metadata: Metadata = {
  title: 'Tic-Tac-Toe',
  description: "Play tic-tac-toe locally or against TypeSafe's Jev.",
}

export default function TicTacToePage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold">Tic-Tac-Toe</h1>
      <p className="mt-4 text-zinc-500 dark:text-zinc-400">
        Play locally or test a turn-by-turn state machine against TypeSafe&apos;s
        Jev. First to three in a row wins.
      </p>
      <TicTacToe />
    </div>
  )
}
