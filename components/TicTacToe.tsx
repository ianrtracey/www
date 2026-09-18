'use client'

import { useRef, useState } from 'react'
import {
  getBoardRows,
  getLegalMoves,
  getWinningLine,
  type Move,
  type Player,
  type Square,
} from '@/lib/tic-tac-toe'

type Mode = 'local' | 'jev'
type Scores = Record<Player | 'draws', number>

type JevMoveResponse = {
  chosenCell: number
  confidence?: number
  probabilities?: Record<string, number>
  model: string
  fallback: boolean
  fallbackReason?: string
}

function getErrorMessage(value: unknown) {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error
  }

  return 'Jev could not choose a move. Try again.'
}

export function TicTacToe() {
  const [mode, setMode] = useState<Mode>('local')
  const [board, setBoard] = useState<Square[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X')
  const [scores, setScores] = useState<Scores>({ X: 0, O: 0, draws: 0 })
  const [history, setHistory] = useState<Move[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastJevResponse, setLastJevResponse] =
    useState<JevMoveResponse | null>(null)
  const gameId = useRef(0)
  const requestController = useRef<AbortController | null>(null)

  const winningLine = getWinningLine(board)
  const winner = winningLine ? board[winningLine[0]] : null
  const isDraw = !winner && board.every(Boolean)
  const gameOver = Boolean(winner) || isDraw
  const status = isThinking
    ? 'Jev is thinking…'
    : winner
      ? mode === 'jev'
        ? winner === 'X'
          ? 'You win'
          : 'Jev wins'
        : `${winner} wins`
      : isDraw
        ? 'Draw'
        : mode === 'jev'
          ? currentPlayer === 'X'
            ? 'Your turn (X)'
            : 'Jev needs another try'
          : `${currentPlayer} to move`

  function recordResult(nextBoard: Square[], player: Player) {
    const nextWinningLine = getWinningLine(nextBoard)
    const nextIsDraw = !nextWinningLine && nextBoard.every(Boolean)

    if (nextWinningLine) {
      setScores((current) => ({
        ...current,
        [player]: current[player] + 1,
      }))
      return true
    }

    if (nextIsDraw) {
      setScores((current) => ({ ...current, draws: current.draws + 1 }))
      return true
    }

    return false
  }

  async function requestJevMove(nextBoard: Square[], nextHistory: Move[]) {
    const activeGameId = gameId.current
    const controller = new AbortController()
    requestController.current?.abort()
    requestController.current = controller
    setIsThinking(true)
    setError(null)

    try {
      const response = await fetch('/api/tic-tac-toe/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          board: nextBoard,
          history: nextHistory,
          legalMoves: getLegalMoves(nextBoard),
        }),
        signal: controller.signal,
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(getErrorMessage(payload))
      }

      const jevMove = payload as JevMoveResponse

      if (
        !Number.isInteger(jevMove.chosenCell) ||
        nextBoard[jevMove.chosenCell] !== null
      ) {
        throw new Error('Jev returned an invalid move. Start a new game or try again.')
      }

      if (activeGameId !== gameId.current) {
        return
      }

      const jevBoard = [...nextBoard]
      jevBoard[jevMove.chosenCell] = 'O'
      const jevHistory = [
        ...nextHistory,
        { player: 'O', index: jevMove.chosenCell } satisfies Move,
      ]

      setBoard(jevBoard)
      setHistory(jevHistory)
      setLastJevResponse(jevMove)

      if (!recordResult(jevBoard, 'O')) {
        setCurrentPlayer('X')
      }
    } catch (caughtError) {
      if (controller.signal.aborted || activeGameId !== gameId.current) {
        return
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Jev could not choose a move. Try again.',
      )
    } finally {
      if (activeGameId === gameId.current) {
        setIsThinking(false)
        requestController.current = null
      }
    }
  }

  function playSquare(index: number) {
    if (
      board[index] ||
      gameOver ||
      isThinking ||
      (mode === 'jev' && currentPlayer === 'O')
    ) {
      return
    }

    const nextBoard = [...board]
    nextBoard[index] = currentPlayer
    const nextHistory = [...history, { player: currentPlayer, index }]

    setBoard(nextBoard)
    setHistory(nextHistory)
    setError(null)

    if (recordResult(nextBoard, currentPlayer)) {
      return
    }

    if (mode === 'jev') {
      setCurrentPlayer('O')
      void requestJevMove(nextBoard, nextHistory)
      return
    }

    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
  }

  function newGame() {
    gameId.current += 1
    requestController.current?.abort()
    requestController.current = null
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
    setHistory([])
    setIsThinking(false)
    setError(null)
    setLastJevResponse(null)
  }

  function changeMode(nextMode: Mode) {
    if (nextMode === mode) {
      return
    }

    setMode(nextMode)
    setScores({ X: 0, O: 0, draws: 0 })
    newGame()
  }

  const debugState = {
    board,
    board_rows: getBoardRows(board),
    next_player: gameOver ? null : currentPlayer,
    legal_moves: getLegalMoves(board),
    move_history: history,
  }

  return (
    <div className="mt-10">
      <div
        className="flex w-fit rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50"
        aria-label="Game mode"
      >
        {(
          [
            ['local', 'Local (2P)'],
            ['jev', 'vs Jev'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => changeMode(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              mode === value
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'jev' && (
        <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          You are X and move first. Jev is O. This mode requires{' '}
          <code className="text-zinc-700 dark:text-zinc-300">
            TYPESAFE_API_KEY
          </code>{' '}
          on the server.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p
          aria-live="polite"
          className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
        >
          {status}
        </p>
        <button
          type="button"
          onClick={newGame}
          className="min-h-11 shrink-0 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-blue-500 focus:outline-none focus-visible:text-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400 dark:focus-visible:text-blue-400 dark:focus-visible:ring-blue-400"
        >
          New game
        </button>
      </div>

      <div
        role="grid"
        aria-label="Tic-tac-toe board"
        aria-busy={isThinking}
        className="mt-5 grid aspect-square w-full max-w-md grid-cols-3 grid-rows-3 gap-2"
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
              disabled={
                Boolean(square) ||
                gameOver ||
                isThinking ||
                (mode === 'jev' && currentPlayer === 'O')
              }
              onClick={() => playSquare(index)}
              className={`flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border text-4xl font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-zinc-900 sm:text-6xl ${
                isWinningSquare
                  ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-800 enabled:hover:border-blue-300 enabled:hover:bg-blue-50/60 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:enabled:hover:border-blue-700 dark:enabled:hover:bg-blue-950/30'
              } disabled:cursor-default`}
            >
              <span className="leading-none" aria-hidden="true">
                {square}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          <p>{error}</p>
          {mode === 'jev' && currentPlayer === 'O' && !gameOver && (
            <button
              type="button"
              onClick={() => void requestJevMove(board, history)}
              className="mt-2 font-medium underline underline-offset-2"
            >
              Try Jev again
            </button>
          )}
        </div>
      )}

      <dl className="mt-8 grid max-w-md grid-cols-3 divide-x divide-zinc-200 rounded-xl border border-zinc-200 py-4 text-center dark:divide-zinc-700 dark:border-zinc-700">
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">
            {mode === 'jev' ? 'You (X)' : 'X wins'}
          </dt>
          <dd className="mt-1 text-xl font-medium">{scores.X}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">Draws</dt>
          <dd className="mt-1 text-xl font-medium">{scores.draws}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">
            {mode === 'jev' ? 'Jev (O)' : 'O wins'}
          </dt>
          <dd className="mt-1 text-xl font-medium">{scores.O}</dd>
        </div>
      </dl>

      {mode === 'jev' && (
        <details className="mt-6 max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            State / debug
          </summary>
          <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-700">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Current state
            </h2>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
              {JSON.stringify(debugState, null, 2)}
            </pre>
            <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Last Jev response
            </h2>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
              {lastJevResponse
                ? JSON.stringify(lastJevResponse, null, 2)
                : 'No response yet.'}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
