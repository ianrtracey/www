'use client'

import { useState } from 'react'

type Player = 'X' | 'O'
type Square = Player | null
type Scores = Record<Player | 'draws', number>

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

function getWinningLine(board: Square[]) {
  return winningLines.find(([a, b, c]) => {
    return board[a] !== null && board[a] === board[b] && board[a] === board[c]
  })
}

export function TicTacToe() {
  const [board, setBoard] = useState<Square[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X')
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0, draws: 0 })

  const winningLine = getWinningLine(board)
  const winner = winningLine ? board[winningLine[0]] : null
  const isDraw = !winner && board.every(Boolean)
  const gameOver = Boolean(winner) || isDraw
  const status = winner
    ? `${winner} wins`
    : isDraw
      ? 'Draw'
      : `${currentPlayer} to move`

  function playSquare(index: number) {
    if (board[index] || gameOver) {
      return
    }

    const nextBoard = [...board]
    nextBoard[index] = currentPlayer
    const nextWinningLine = getWinningLine(nextBoard)
    const nextIsDraw = !nextWinningLine && nextBoard.every(Boolean)

    setBoard(nextBoard)

    if (nextWinningLine) {
      setScores((current) => ({
        ...current,
        [currentPlayer]: current[currentPlayer] + 1,
      }))
      return
    }

    if (nextIsDraw) {
      setScores((current) => ({ ...current, draws: current.draws + 1 }))
      return
    }

    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
  }

  function newGame() {
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
  }

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between gap-6">
        <p
          aria-live="polite"
          className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
        >
          {status}
        </p>
        <button
          type="button"
          onClick={newGame}
          className="text-sm text-zinc-500 transition-colors hover:text-blue-500 focus:outline-none focus-visible:text-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 dark:text-zinc-400 dark:hover:text-blue-400 dark:focus-visible:text-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-zinc-900"
        >
          New game
        </button>
      </div>

      <div
        role="grid"
        aria-label="Tic-tac-toe board"
        className="mt-5 grid aspect-square w-full max-w-md grid-cols-3 gap-2"
      >
        {board.map((square, index) => {
          const isWinningSquare =
            winningLine?.some((winningIndex) => winningIndex === index) ?? false

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}${square ? `, ${square}` : ', empty'}`}
              disabled={Boolean(square) || gameOver}
              onClick={() => playSquare(index)}
              className={`flex items-center justify-center rounded-xl border text-5xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-zinc-900 sm:text-6xl ${
                isWinningSquare
                  ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-800 enabled:hover:border-blue-300 enabled:hover:bg-blue-50/60 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:enabled:hover:border-blue-700 dark:enabled:hover:bg-blue-950/30'
              } disabled:cursor-default`}
            >
              <span aria-hidden="true">{square}</span>
            </button>
          )
        })}
      </div>

      <dl className="mt-8 grid max-w-md grid-cols-3 divide-x divide-zinc-200 rounded-xl border border-zinc-200 py-4 text-center dark:divide-zinc-700 dark:border-zinc-700">
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">X wins</dt>
          <dd className="mt-1 text-xl font-medium">{scores.X}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">Draws</dt>
          <dd className="mt-1 text-xl font-medium">{scores.draws}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">O wins</dt>
          <dd className="mt-1 text-xl font-medium">{scores.O}</dd>
        </div>
      </dl>
    </div>
  )
}
