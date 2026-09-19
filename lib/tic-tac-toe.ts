export type Player = 'X' | 'O'
export type Square = Player | null

export type Move = {
  player: Player
  index: number
}

export const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const

export function getWinningLine(board: readonly Square[]) {
  return winningLines.find(([a, b, c]) => {
    return board[a] !== null && board[a] === board[b] && board[a] === board[c]
  })
}

export function getLegalMoves(board: readonly Square[]) {
  return board.flatMap((square, index) => (square === null ? [index] : []))
}

export function getBoardRows(board: readonly Square[]) {
  return [0, 3, 6].map((start) =>
    board
      .slice(start, start + 3)
      .map((square) => square ?? '_')
      .join(' '),
  )
}
