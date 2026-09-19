import { choice, TypeSafeClient } from '@typesafe-ai/sdk'
import {
  getBoardRows,
  getLegalMoves,
  getWinningLine,
  winningLines,
  type Move,
  type Player,
  type Square,
} from '@/lib/tic-tac-toe'

const cellNames = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

const lineNames = [
  'top row',
  'middle row',
  'bottom row',
  'left column',
  'center column',
  'right column',
  'main diagonal',
  'anti-diagonal',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSquare(value: unknown): value is Square {
  return value === null || value === 'X' || value === 'O'
}

function isMove(value: unknown): value is Move {
  return (
    isRecord(value) &&
    (value.player === 'X' || value.player === 'O') &&
    Number.isInteger(value.index) &&
    Number(value.index) >= 0 &&
    Number(value.index) <= 8
  )
}

function validateHistory(history: Move[], board: Square[]) {
  const replay: Square[] = Array(9).fill(null)

  for (let turn = 0; turn < history.length; turn += 1) {
    const move = history[turn]
    const expectedPlayer: Player = turn % 2 === 0 ? 'X' : 'O'

    if (move.player !== expectedPlayer || replay[move.index] !== null) {
      return false
    }

    replay[move.index] = move.player
  }

  return replay.every((square, index) => square === board[index])
}

function getLineName(board: Square[], player: Player, index: number) {
  const candidate = [...board]
  candidate[index] = player
  const line = getWinningLine(candidate)

  if (!line) {
    return null
  }

  const lineIndex = winningLines.findIndex((winningLine) =>
    winningLine.every((cell, cellIndex) => cell === line[cellIndex]),
  )

  return lineNames[lineIndex]
}

function describeMove(board: Square[], index: number) {
  const winLine = getLineName(board, 'O', index)
  const blockLine = getLineName(board, 'X', index)

  if (winLine) {
    return `${cellNames[index]}; wins immediately on the ${winLine}`
  }

  if (blockLine) {
    return `${cellNames[index]}; blocks X from winning on the ${blockLine}`
  }

  return cellNames[index]
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!isRecord(body)) {
    return Response.json({ error: 'Request body must be an object.' }, { status: 400 })
  }

  const board = body.board
  const historyValue = body.history
  const history = historyValue ?? []
  const legalMoves = body.legalMoves

  if (!Array.isArray(board) || board.length !== 9 || !board.every(isSquare)) {
    return Response.json(
      { error: 'Board must contain exactly 9 cells using X, O, or null.' },
      { status: 400 },
    )
  }

  if (
    (historyValue !== undefined && !Array.isArray(historyValue)) ||
    !Array.isArray(history) ||
    !history.every(isMove)
  ) {
    return Response.json({ error: 'Move history is invalid.' }, { status: 400 })
  }

  const expectedLegalMoves = getLegalMoves(board)

  if (
    !Array.isArray(legalMoves) ||
    !legalMoves.every((index) => Number.isInteger(index)) ||
    legalMoves.length !== new Set(legalMoves).size ||
    legalMoves.length !== expectedLegalMoves.length ||
    !legalMoves.every((index) => expectedLegalMoves.includes(index))
  ) {
    return Response.json(
      { error: 'Legal moves must exactly match the empty board cells.' },
      { status: 400 },
    )
  }

  const xCount = board.filter((square) => square === 'X').length
  const oCount = board.filter((square) => square === 'O').length

  if (
    xCount !== oCount + 1 ||
    expectedLegalMoves.length === 0 ||
    getWinningLine(board) ||
    (historyValue !== undefined && !validateHistory(history, board))
  ) {
    return Response.json(
      { error: 'Board and move history must describe a valid turn for O.' },
      { status: 400 },
    )
  }

  const apiKey = process.env.TYPESAFE_API_KEY

  if (!apiKey) {
    return Response.json(
      {
        code: 'missing_api_key',
        error: 'Jev is not configured on this server.',
      },
      { status: 503 },
    )
  }

  const criteria = Object.fromEntries(
    expectedLegalMoves.map((index) => [String(index), describeMove(board, index)]),
  )

  const client = new TypeSafeClient({
    apiKey,
    defaultModel: 'jev-latest',
    timeout: 20_000,
    retry: { maxRetries: 0 },
  })
  let response

  try {
    response = await client.systemOne({
      model: 'jev-latest',
      state: {
        game: 'tic-tac-toe',
        rules:
          '3x3; X and O alternate; first to 3-in-a-row wins; indices 0-8 row-major',
        board,
        board_rows: getBoardRows(board),
        you_are: 'O',
        legal_moves: expectedLegalMoves,
        move_history: history,
      },
      questions: {
        next_move: choice(
          'Choose the strongest legal move for O. Prefer an immediate win, then block an immediate X win, then improve the chance of winning.',
          criteria,
        ),
      },
    })
  } catch (caughtError) {
    const status =
      isRecord(caughtError) && typeof caughtError.status === 'number'
        ? caughtError.status
        : null

    return Response.json(
      {
        error: status
          ? `Jev rejected the move request (${status}). Try again.`
          : 'Jev could not be reached. Try the move again.',
      },
      { status: 502 },
    )
  }

  const answer = response.answers.next_move
  const jevChoice = answer.choice
  const parsedChoice = Number(jevChoice)
  const isLegalChoice =
    Number.isInteger(parsedChoice) && expectedLegalMoves.includes(parsedChoice)
  const chosenCell = isLegalChoice
    ? parsedChoice
    : expectedLegalMoves[Math.floor(Math.random() * expectedLegalMoves.length)]

  return Response.json({
    chosenCell,
    confidence: answer.confidence,
    probabilities: answer.probabilities,
    model: response.model,
    fallback: !isLegalChoice,
    fallbackReason: isLegalChoice
      ? undefined
      : `Jev returned "${jevChoice}"; a legal move was selected locally.`,
  })
}
